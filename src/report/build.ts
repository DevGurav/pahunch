import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CriticalRow, PortalResult } from '../audit.ts';
import { SPOKEN_ROLE } from '../checks/names.ts';
import type { ExcludedPortal } from '../portals/types.ts';
import { AUTOMATED_LABEL, RULES, type RuleId } from '../rules.ts';
import type { Finding, Severity, Verdict } from '../types.ts';
import { VERDICT_LABEL } from '../verdict.ts';
import { esc, layout, wcagLinks, withLang } from './html.ts';
import type { LoadedResult } from './load.ts';

const STYLE = fileURLToPath(new URL('./style.css', import.meta.url));

const VERDICT_ORDER: readonly Verdict[] = ['blocked', 'inconclusive', 'barriers', 'no-blockers-found'];

export const VERDICT_MEANING: Record<Verdict, string> = {
  blocked: "At least one problem on the task's path that, on the automated evidence, stops a screen-reader user completely.",
  inconclusive: 'Part of the task could not be checked, so a blocker may be hiding there.',
  barriers: 'No blocker found, but there are problems that make the task harder.',
  'no-blockers-found': 'The automated checks found nothing that stops or seriously hinders the task. That is not the same as accessible.',
};

const SECTION: Record<Severity, string> = { blocker: 'Blockers', barrier: 'Barriers', info: 'Other notes' };

const istDay = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
const istTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

const indicLang = (r: PortalResult): 'hi' | 'mr' => (r.portal.jurisdiction === 'Maharashtra' ? 'mr' : 'hi');
const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const badge = (v: Verdict) => `<span class="verdict v-${v}">${esc(VERDICT_LABEL[v])}</span>`;
const stripMarker = (html: string) => html.replace(/ data-pahunch-critical="\d+"/g, '');
const yesNo = (value: boolean | null | undefined) => (value === true ? 'Yes' : value === false ? 'No' : 'Not checked');
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

function announced(row: CriticalRow): string {
  if (!row.found) return 'Not found on the page';
  if (row.role === undefined) return 'Not checked';
  if (row.role === '') return 'Not announced: hidden from screen readers';
  if (row.role === 'text') return 'Plain text, not announced as a control';
  const spoken = SPOKEN_ROLE[row.role] ?? row.role;
  return row.name ? `“${row.name}”, ${spoken}` : `${spoken}, no name`;
}

function findingTitle(f: Finding): string {
  if (f.rule.startsWith('axe/')) return f.summary.replace(/ \(\d+ elements?\)\.$/, '');
  return RULES[f.rule as RuleId]?.title ?? f.rule;
}

function renderFinding(f: Finding, lang: 'hi' | 'mr'): string {
  const isAxe = f.rule.startsWith('axe/');
  const rule = isAxe ? undefined : RULES[f.rule as RuleId];
  const details = (f.details ?? {}) as { impact?: string; helpUrl?: string };
  const why = isAxe
    ? `Reported by the axe-core rule <code>${esc(f.rule.slice(4))}</code>${details.impact ? `, impact “${esc(details.impact)}”` : ''}.`
    : esc(rule?.why);
  const fix = isAxe
    ? details.helpUrl
      ? `See <a href="${esc(details.helpUrl)}">the axe-core documentation for this rule</a>.`
      : 'See the axe-core documentation for this rule.'
    : esc(rule?.fix);
  const meta = [wcagLinks(f.wcag), `${esc(f.check)} check`, f.frameUrl ? `inside a frame from ${esc(hostOf(f.frameUrl))}` : ''].filter(Boolean).join(' · ');
  return `<article class="finding sev-${f.severity}">
<h3>${esc(findingTitle(f))}</h3>
<p>${withLang(f.summary, lang)}</p>
<p class="meta">${meta}</p>
${f.target && !isAxe ? `<p class="meta">Where: <code>${withLang(f.target, lang)}</code></p>` : ''}
${f.snippet ? `<details><summary>Show the element’s HTML</summary><pre><code>${withLang(stripMarker(f.snippet), lang)}</code></pre></details>` : ''}
<p><strong>Why it matters:</strong> ${why}</p>
<p><strong>How to fix it:</strong> ${fix}</p>
</article>`;
}

function portalPage(loaded: LoadedResult): string {
  const r = loaded.result;
  const lang = indicLang(r);
  const page = r.pages.at(-1);
  const rows = r.critical
    .map(
      (c) => `<tr><th scope="row">${esc(c.label)}</th><td>${withLang(announced(c), lang)}</td><td>${c.found ? yesNo(c.reached) : 'Not checked'}</td><td>${c.found ? yesNo(c.focusVisible) : 'Not checked'}</td></tr>`,
    )
    .join('\n');

  const sections = (['blocker', 'barrier'] as const)
    .map((sev) => {
      const list = r.findings.filter((f) => f.severity === sev);
      if (list.length === 0) return '';
      return `<section aria-labelledby="sec-${sev}">
<h2 id="sec-${sev}">${SECTION[sev]} (${list.length})</h2>
${list.map((f) => renderFinding(f, lang)).join('\n')}
</section>`;
    })
    .join('\n');

  const info = r.findings.filter((f) => f.severity === 'info');
  const infoSection = info.length
    ? `<section aria-labelledby="sec-info">
<h2 id="sec-info">${SECTION.info} (${info.length})</h2>
<ul class="notes">
${info.map((f) => `<li><strong>${esc(findingTitle(f))}.</strong> ${f.rule.startsWith('axe/') ? '' : withLang(f.summary, lang)} <span class="meta">${wcagLinks(f.wcag)}</span></li>`).join('\n')}
</ul>
</section>`
    : '';

  const reasons = r.inconclusiveReasons.length
    ? `<section aria-labelledby="sec-unchecked">
<h2 id="sec-unchecked">What could not be checked</h2>
<ul>${r.inconclusiveReasons.map((x) => `<li>${withLang(x, lang)}</li>`).join('')}</ul>
</section>`
    : '';

  const transcriptLines = loaded.transcript.split('\n').filter((l) => l.trim());
  const transcript = transcriptLines.length
    ? `<section aria-labelledby="sec-transcript">
<h2 id="sec-transcript">What a screen reader would roughly hear</h2>
<p>The first ${Math.min(40, transcriptLines.length)} lines, built from the browser’s accessibility tree. Real screen-reader speech differs in wording. <a href="../transcripts/${esc(r.portal.id)}.txt">Full transcript</a>.</p>
<ol class="transcript">
${transcriptLines
  .slice(0, 40)
  .map((l) => `<li>${withLang(l.length > 200 ? `${l.slice(0, 200)}…` : l, lang)}</li>`)
  .join('\n')}
</ol>
</section>`
    : '';

  const body = `<p class="crumb"><a href="../index.html">← All portals</a></p>
<h1>${esc(r.portal.name)}</h1>
<p class="owner">${esc(r.portal.owner)} · ${esc(r.portal.jurisdiction)}</p>
<div class="verdict-box">
<p>${badge(r.verdict)}</p>
<p>${esc(VERDICT_MEANING[r.verdict])}</p>
<p class="label">${esc(AUTOMATED_LABEL)}</p>
</div>
<dl class="facts">
<dt>Task</dt><dd>${esc(r.portal.task)}</dd>
<dt>Page checked</dt><dd>${page ? `<a href="${esc(page.finalUrl)}">${esc(page.finalUrl)}</a>` : 'The page did not load'}</dd>
<dt>Checked on</dt><dd>${esc(istTime.format(new Date(r.startedAt)))} IST</dd>
<dt>Counts</dt><dd>${plural(r.counts.blocker, 'blocker')}, ${plural(r.counts.barrier, 'barrier')}, ${plural(r.counts.info, 'other note')}</dd>
</dl>
${r.portal.notes ? `<p class="note">${withLang(r.portal.notes, lang)}</p>` : ''}
${reasons}
<section aria-labelledby="sec-controls">
<h2 id="sec-controls">The controls this task needs</h2>
<div class="table-wrap" role="region" aria-labelledby="controls-caption" tabindex="0">
<table>
<caption id="controls-caption">How each control is announced and whether the Tab key reaches it</caption>
<thead><tr><th scope="col">Control</th><th scope="col">Announced as</th><th scope="col">Tab reaches it</th><th scope="col">Focus visible</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>
</section>
${sections}
${infoSection}
${transcript}`;
  return layout({ title: r.portal.name, depth: 1, body });
}

function indexPage(results: readonly LoadedResult[], excluded: readonly ExcludedPortal[]): string {
  const sorted = [...results].sort(
    (a, b) => VERDICT_ORDER.indexOf(a.result.verdict) - VERDICT_ORDER.indexOf(b.result.verdict) || a.result.portal.name.localeCompare(b.result.portal.name),
  );
  const tally = VERDICT_ORDER.map((v) => [v, results.filter((x) => x.result.verdict === v).length] as const).filter(([, n]) => n > 0);
  const dates = [...new Set(results.map((x) => x.date))].sort();
  const when =
    dates.length === 0 ? '' : dates.length === 1 ? `on ${istDay.format(new Date(`${dates[0]}T12:00:00+05:30`))}` : `between ${istDay.format(new Date(`${dates[0]}T12:00:00+05:30`))} and ${istDay.format(new Date(`${dates.at(-1)}T12:00:00+05:30`))}`;

  const common = (Object.keys(RULES) as RuleId[])
    .map((rule) => ({ rule, portals: results.filter((x) => x.result.findings.some((f) => f.rule === rule && f.severity !== 'info')).length }))
    .filter((c) => c.portals > 0)
    .sort((a, b) => b.portals - a.portals);

  const rows = sorted
    .map(({ result: r, date }) => {
      return `<tr><th scope="row"><a href="portals/${esc(r.portal.id)}.html">${esc(r.portal.name)}</a><span class="owner">${esc(r.portal.owner)}</span></th><td>${esc(r.portal.task)}</td><td>${badge(r.verdict)}</td><td>${r.counts.blocker}</td><td>${r.counts.barrier}</td><td class="nowrap">${esc(date)}</td></tr>`;
    })
    .join('\n');

  const body = `<h1>Can a blind citizen use India’s government portals?</h1>
<p class="lede">We took one everyday task on each of ${results.length} citizen-service portals, such as reaching the login form or searching a record, and checked ${esc(when)} whether a person using a screen reader would be stopped.</p>
<ul class="tally" aria-label="Verdicts at a glance">
${tally.map(([v, n]) => `<li><strong>${n}</strong> ${badge(v)}</li>`).join('\n')}
</ul>
<p class="label">${esc(AUTOMATED_LABEL)} Automated checks find only part of the real problems, so “no blockers found” never means accessible. <a href="method.html">How we tested</a>.</p>
<div class="table-wrap" role="region" aria-labelledby="scorecard-caption" tabindex="0">
<table>
<caption id="scorecard-caption">Verdict for each portal’s task, most serious first</caption>
<thead><tr><th scope="col">Portal</th><th scope="col">Task</th><th scope="col">Verdict</th><th scope="col">Blockers</th><th scope="col">Barriers</th><th scope="col">Checked on</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>
${
  common.length
    ? `<h2>What we found most often</h2>
<ul>
${common.map((c) => `<li><strong>${esc(RULES[c.rule].title)}</strong>: ${c.portals} of ${results.length} portals</li>`).join('\n')}
</ul>`
    : ''
}
<h2>What the verdicts mean</h2>
<dl class="verdicts">
${VERDICT_ORDER.map((v) => `<dt>${badge(v)}</dt><dd>${esc(VERDICT_MEANING[v])}</dd>`).join('\n')}
</dl>
${
  excluded.length
    ? `<h2>Portals we could not test</h2>
<p>These refused our automated browser. Our rules are to record that and move on, not to get around it.</p>
<ul>
${excluded.map((e) => `<li><strong>${esc(e.name)}</strong> (${esc(e.owner)}): ${esc(e.reason)} Checked ${esc(e.checkedOn)}.</li>`).join('\n')}
</ul>`
    : ''
}`;
  return layout({ title: 'Scorecard', depth: 0, current: 'index', body });
}

function methodPage(results: readonly LoadedResult[], excluded: readonly ExcludedPortal[]): string {
  const versions = results[0]?.result.tool;
  const ruleRows = (Object.entries(RULES) as Array<[RuleId, (typeof RULES)[RuleId]]>)
    .map(([, info]) => `<tr><th scope="row">${esc(info.title)}</th><td>${esc(info.check)}</td><td>${esc(info.severity)}</td><td>${wcagLinks(info.wcag)}</td></tr>`)
    .join('\n');
  const body = `<h1>How we tested</h1>
<p class="lede">Each portal gets one task, the controls that task needs, and a fixed list of public pages. A real browser loads those pages and runs the checks below. Nothing is ever typed into a portal, submitted, or logged in to.</p>
<p class="label">${esc(AUTOMATED_LABEL)}</p>
<h2>The checks</h2>
<div class="table-wrap" role="region" aria-labelledby="rules-caption" tabindex="0">
<table>
<caption id="rules-caption">Every rule, the check that applies it, and its usual severity</caption>
<thead><tr><th scope="col">Rule</th><th scope="col">Check</th><th scope="col">Usual severity</th><th scope="col">WCAG</th></tr></thead>
<tbody>
${ruleRows}
<tr><th scope="row">Standard axe-core rules (WCAG 2.1 A and AA)</th><td>axe</td><td>barrier for serious or critical impact, otherwise a note</td><td>per rule</td></tr>
</tbody>
</table>
</div>
<h2>What counts as a blocker</h2>
<p>Only problems that no workaround gets past, on the evidence we hold:</p>
<ul>
<li>an image CAPTCHA on the task’s path with no audio or other non-visual option;</li>
<li>an audio option that the keyboard cannot reach <em>and</em> that is not exposed as a button or link;</li>
<li>a control the task needs that a complete pass with the Tab key never reaches;</li>
<li>keyboard focus that keeps cycling, outside any dialog, and never reaches a control the task needs.</li>
</ul>
<p>An unlabelled field is a barrier, not a blocker: the visible text beside it usually tells a screen-reader user what it is for. If part of a task can’t be checked, for example because the page did not load or focus stayed inside a pop-up, the verdict is inconclusive, never clean.</p>
<h2>How pages are loaded</h2>
<ul>
<li>Only the task’s public pages, one at a time, at least five seconds apart. No crawling.</li>
<li>The browser names this project in its user agent.</li>
<li>No logins, no form submissions, no CAPTCHA attempts, and no security testing.</li>
<li>Run from a computer on an Indian network. If a portal blocks automated browsing, that is recorded and the portal is left out.</li>
</ul>
<h2>What automated checks cannot see</h2>
<ul>
<li>Whether names make sense, or whether error messages are announced. We never submit forms.</li>
<li>Anything after login: OTP steps, timeouts, the service itself.</li>
<li>Whether an audio CAPTCHA can actually be understood.</li>
<li>Whether the whole experience makes sense to someone who can’t see it. That needs screen-reader users.</li>
</ul>
${
  excluded.length
    ? `<h2>Portals we could not test</h2>
<ul>
${excluded.map((e) => `<li><strong>${esc(e.name)}</strong>: ${esc(e.reason)} (${esc(e.url)}, ${esc(e.checkedOn)})</li>`).join('\n')}
</ul>`
    : ''
}
${
  versions
    ? `<h2>Versions</h2>
<p>pahunch ${esc(versions.version)}, ${esc(versions.browser)}, axe-core ${esc(versions.axe ?? 'unknown')}. User agent: <code>${esc(versions.userAgent)}</code>.</p>`
    : ''
}`;
  return layout({ title: 'How we tested', depth: 0, current: 'method', body });
}

function sendPage(): string {
  const body = `<h1>Send the findings</h1>
<p class="lede">Each portal page in this report is written so it can be sent as it is. Whether, when and how to send it is up to the person sending. This site never sends anything.</p>
<h2>Where to send</h2>
<ul>
<li><strong>The site’s Web Information Manager.</strong> The Guidelines for Indian Government Websites ask every government site to name one. Look in the footer or on the “Contact us” page.</li>
<li><strong>CPGRAMS</strong> (pgportal.gov.in), the central public grievance portal, under the ministry or department that owns the site.</li>
<li><strong>The Office of the Chief Commissioner for Persons with Disabilities</strong>, for complaints under the Rights of Persons with Disabilities Act, 2016.</li>
</ul>
<h2>A short note to go with it</h2>
<pre class="template"><code>Subject: Accessibility problems on [portal] for screen-reader users

Dear Web Information Manager,

Automated accessibility checks of [portal] on [date] found problems that make
[task] hard or impossible for blind citizens who use screen readers. The details,
with the exact elements and suggested fixes, are here: [link to the portal's page].

The Rights of Persons with Disabilities Act, 2016 and the Guidelines for Indian
Government Websites (GIGW 3.0) require these services to be accessible. I would
be grateful if the team could look at the fixes listed.

Regards,
[name]</code></pre>
<p>Keep the tone factual. The findings come from automated checks, so invite the team to confirm them with screen-reader users.</p>`;
  return layout({ title: 'Send the findings', depth: 0, current: 'send', body });
}

/** Writes the whole site into `outDir` (replacing what was there). Returns the files written. */
export async function buildSite(results: readonly LoadedResult[], excluded: readonly ExcludedPortal[], outDir: string): Promise<string[]> {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, 'portals'), { recursive: true });
  await mkdir(join(outDir, 'transcripts'), { recursive: true });
  const written: string[] = [];
  const write = async (rel: string, content: string) => {
    await writeFile(join(outDir, rel), content);
    written.push(rel);
  };

  await write('index.html', indexPage(results, excluded));
  await write('method.html', methodPage(results, excluded));
  await write('send.html', sendPage());
  for (const loaded of results) {
    await write(`portals/${loaded.result.portal.id}.html`, portalPage(loaded));
    await write(`transcripts/${loaded.result.portal.id}.txt`, loaded.transcript);
  }
  await copyFile(STYLE, join(outDir, 'style.css'));
  written.push('style.css');
  await writeFile(join(outDir, '.nojekyll'), '');
  return written;
}
