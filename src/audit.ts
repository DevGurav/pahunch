import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { Page } from 'playwright';
import { recordRobots, settle, TOOL_NAME, TOOL_VERSION, type RobotsRecord, type Session } from './browser/session.ts';
import { checkAxe, type AxeEvidence } from './checks/axe.ts';
import { checkCaptcha, type CaptchaEvidence } from './checks/captcha.ts';
import { markCritical, type ResolvedControl } from './checks/critical.ts';
import { checkKeyboard, type KeyboardEvidence } from './checks/keyboard.ts';
import { checkLang, type LangFrame } from './checks/lang.ts';
import { checkNames, type ControlName } from './checks/names.ts';
import { checkPdfs, type PdfEvidence } from './checks/pdf.ts';
import { buildTranscript } from './checks/transcript.ts';
import type { Portal } from './portals/types.ts';
import type { CheckResult, Finding, Verdict } from './types.ts';
import { decideVerdict } from './verdict.ts';

export const RESULT_SCHEMA = 1;

export interface CriticalRow extends ResolvedControl {
  role?: string;
  name?: string;
  disabled?: boolean;
  reached?: boolean;
  focusVisible?: boolean | null;
}

export interface PortalResult {
  schema: number;
  portal: Pick<Portal, 'id' | 'name' | 'owner' | 'jurisdiction' | 'task' | 'notes'>;
  startedAt: string;
  finishedAt: string;
  tool: { name: string; version: string; userAgent: string; browser: string; axe?: string };
  pages: Array<{ requested: string; finalUrl: string; status: number | null; title: string }>;
  robots: RobotsRecord | null;
  critical: CriticalRow[];
  verdict: Verdict;
  inconclusiveReasons: string[];
  findings: Finding[];
  counts: { blocker: number; barrier: number; info: number };
  evidence: {
    captcha?: CaptchaEvidence;
    names?: { controls: ControlName[] };
    lang?: { frames: LangFrame[] };
    keyboard?: KeyboardEvidence;
    pdf?: { pdfs: PdfEvidence[] };
    axe?: { version: string; violations: number; incomplete: number; passes: number };
  };
  /** Checks that crashed. Each one also adds an inconclusive reason. */
  errors: string[];
}

export interface AuditFiles {
  result: PortalResult;
  axe?: AxeEvidence;
  transcript?: string;
  screenshot?: Buffer;
  html?: string;
}

const BLOCK_TITLE = /blocked|access denied|forbidden|request rejected|not acceptable|captcha required/i;

export interface AuditOptions {
  /** Cap on Tab presses for the keyboard walk. */
  maxPresses?: number;
}

/**
 * Runs a portal's task steps and every check on a fresh page, so no navigation left over from an
 * earlier audit can interfere. Never throws: failures become inconclusive reasons.
 */
export async function auditPortal(portal: Portal, session: Session, options: AuditOptions = {}): Promise<AuditFiles> {
  const page = await session.context.newPage();
  try {
    return await runAudit(portal, session, page, options);
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function runAudit(portal: Portal, session: Session, page: Page, options: AuditOptions): Promise<AuditFiles> {
  const startedAt = new Date().toISOString();
  const result: PortalResult = {
    schema: RESULT_SCHEMA,
    portal: { id: portal.id, name: portal.name, owner: portal.owner, jurisdiction: portal.jurisdiction, task: portal.task, ...(portal.notes ? { notes: portal.notes } : {}) },
    startedAt,
    finishedAt: startedAt,
    tool: { name: TOOL_NAME, version: TOOL_VERSION, userAgent: session.userAgent, browser: `chromium ${session.browserVersion}` },
    pages: [],
    robots: null,
    critical: [],
    verdict: 'inconclusive',
    inconclusiveReasons: [],
    findings: [],
    counts: { blocker: 0, barrier: 0, info: 0 },
    evidence: {},
    errors: [],
  };
  const files: AuditFiles = { result };
  const finish = (): AuditFiles => {
    result.finishedAt = new Date().toISOString();
    for (const f of result.findings) result.counts[f.severity]++;
    result.verdict = decideVerdict(result.findings, result.inconclusiveReasons);
    return files;
  };

  // 1. Task steps: navigation and opening public dialogs only.
  const firstUrl = portal.steps.find((s) => s.kind === 'goto');
  if (firstUrl?.kind === 'goto') result.robots = await recordRobots(session.context, firstUrl.url);
  for (const step of portal.steps) {
    try {
      if (step.kind === 'goto') {
        await session.pace();
        const response = await page.goto(step.url, { waitUntil: 'domcontentloaded' });
        await settle(page);
        const entry = { requested: step.url, finalUrl: page.url(), status: response?.status() ?? null, title: await page.title().catch(() => '') };
        result.pages.push(entry);
        if ((entry.status !== null && entry.status >= 400) || BLOCK_TITLE.test(entry.title)) {
          result.inconclusiveReasons.push(`The portal refused the page (HTTP ${entry.status ?? '?'}${entry.title ? `, title "${entry.title}"` : ''}). Per the scanning rules it was not retried another way.`);
          return finish();
        }
      } else if (step.kind === 'click') {
        await session.pace();
        await page.locator(step.selector).first().click({ timeout: 15_000 });
        await settle(page, 5_000);
      } else {
        await page.keyboard.press(step.key);
        await settle(page, 2_000);
      }
    } catch (error) {
      result.inconclusiveReasons.push(`Task step failed (${step.kind}${step.kind === 'goto' ? ` ${step.url}` : ''}): ${String(error).split('\n')[0]?.slice(0, 160)}`);
      return finish();
    }
  }

  // 2. Critical controls, and the page as it stood before any check touched it.
  const resolved = await markCritical(page, portal.critical);
  result.critical = resolved.map((r) => ({ ...r }));
  for (const r of resolved.filter((c) => !c.found)) {
    result.inconclusiveReasons.push(`Critical control not found: "${r.label}" (${r.selector}). The portal may have changed.`);
  }
  files.screenshot = await page.screenshot({ type: 'jpeg', quality: 60 }).catch(() => undefined);
  files.html = await page.content().catch(() => undefined);

  // 3. Checks. Read-only ones first; the keyboard walk moves focus, and PDFs are extra loads.
  const run = async <E>(name: string, check: () => Promise<CheckResult<E>>): Promise<E | undefined> => {
    try {
      const out = await check();
      result.findings.push(...out.findings);
      result.inconclusiveReasons.push(...(out.inconclusive ?? []));
      return out.evidence;
    } catch (error) {
      const message = `${name} check failed: ${String(error).split('\n')[0]?.slice(0, 160)}`;
      result.errors.push(message);
      result.inconclusiveReasons.push(message);
      return undefined;
    }
  };

  result.evidence.names = await run('names', () => checkNames(page, resolved));
  result.evidence.captcha = await run('captcha', () => checkCaptcha(page));
  result.evidence.lang = await run('lang', () => checkLang(page));
  files.transcript = await buildTranscript(page).catch(() => undefined);
  const axe = await run('axe', () => checkAxe(page));
  if (axe) {
    files.axe = axe;
    result.tool.axe = axe.version;
    result.evidence.axe = { version: axe.version, violations: axe.violations.length, incomplete: axe.incomplete.length, passes: axe.passes };
  }
  result.evidence.keyboard = await run('keyboard', () => checkKeyboard(page, resolved, { maxPresses: options.maxPresses }));
  result.evidence.pdf = await run('pdf', () => checkPdfs(page, session.context.request, { pace: () => session.pace() }));

  // 4. One table per critical control, joining names and keyboard evidence.
  result.critical = resolved.map((r) => {
    const name = result.evidence.names?.controls.find((c) => c.index === r.index);
    const key = result.evidence.keyboard?.controls.find((c) => c.index === r.index);
    return {
      ...r,
      ...(name ? { role: name.role, name: name.name, disabled: name.disabled } : {}),
      ...(key ? { reached: key.reached, focusVisible: key.focusVisible } : {}),
    };
  });

  return finish();
}

/** Today's date in India, YYYY-MM-DD, used as the results folder name. */
export function auditDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

export async function writeResult(dir: string, files: AuditFiles): Promise<string> {
  const folder = join(dir, files.result.portal.id);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, 'result.json'), `${JSON.stringify(files.result, null, 2)}\n`);
  if (files.axe) await writeFile(join(folder, 'axe.json'), `${JSON.stringify(files.axe, null, 2)}\n`);
  if (files.transcript !== undefined) await writeFile(join(folder, 'transcript.txt'), `${files.transcript}\n`);
  if (files.screenshot) await writeFile(join(folder, 'screenshot.jpg'), files.screenshot);
  if (files.html !== undefined) await writeFile(join(folder, 'page.html.gz'), gzipSync(files.html));
  return folder;
}
