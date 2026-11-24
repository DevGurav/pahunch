/**
 * Runs pahunch's own checks against the built report. Fails on any blocker or barrier, which
 * includes serious and critical axe violations. A report about accessibility has to pass its own bar.
 *
 *   npm run check:site [-- --site site]
 */
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { openSession } from '../browser/session.ts';
import { checkAxe } from '../checks/axe.ts';
import { markCritical } from '../checks/critical.ts';
import { checkKeyboard } from '../checks/keyboard.ts';
import { checkLang } from '../checks/lang.ts';
import { checkNames } from '../checks/names.ts';
import type { CriticalControl } from '../portals/types.ts';
import { serveDirectory } from '../report/serve.ts';
import type { Finding } from '../types.ts';

const { values } = parseArgs({ options: { site: { type: 'string', default: 'site' } } });

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

// Every page must let a keyboard user skip to the content and reach the main navigation.
const CRITICAL: CriticalControl[] = [
  { label: 'Skip link', selector: 'a.skip', kind: 'link' },
  { label: 'Scorecard link', selector: 'nav a[href$="index.html"]', kind: 'link' },
  { label: 'How we tested link', selector: 'nav a[href$="method.html"]', kind: 'link' },
];

const pages = (await htmlFiles(values.site)).map((f) => relative(values.site, f).replace(/\\/g, '/')).sort();
if (pages.length === 0) {
  console.error(`no HTML files in ${values.site}/ — run npm run report first`);
  process.exit(1);
}

const server = await serveDirectory(values.site);
const session = await openSession({ minIntervalMs: 0 });
let failed = 0;
try {
  for (const path of pages) {
    const page = await session.context.newPage();
    try {
      await page.goto(`${server.baseUrl}/${path}`);
      const critical = await markCritical(page, CRITICAL);
      const findings: Finding[] = [];
      const notes: string[] = [];
      for (const missing of critical.filter((c) => !c.found)) notes.push(`missing: ${missing.label}`);
      findings.push(...(await checkNames(page, critical)).findings);
      findings.push(...(await checkLang(page)).findings);
      findings.push(...(await checkAxe(page)).findings);
      const keyboard = await checkKeyboard(page, critical);
      findings.push(...keyboard.findings);
      notes.push(...(keyboard.inconclusive ?? []));

      const bad = findings.filter((f) => f.severity !== 'info');
      if (bad.length > 0 || notes.length > 0) {
        failed++;
        console.log(`FAIL ${path}`);
        for (const f of bad) console.log(`     ${f.severity} ${f.rule}: ${f.summary}${f.target ? ` [${f.target}]` : ''}`);
        for (const n of notes) console.log(`     ${n}`);
      } else {
        console.log(`ok   ${path}`);
      }
    } finally {
      await page.close();
    }
  }
} finally {
  await session.close();
  await server.close();
}

console.log(failed === 0 ? `all ${pages.length} pages pass` : `${failed} of ${pages.length} pages fail`);
process.exitCode = failed === 0 ? 0 : 1;
