/**
 * Loads one page and prints what's needed to write a portal definition. Full JSON and a screenshot
 * go to tmp/discover/. Never types into or submits anything; `--click` only opens a public dialog.
 *
 *   npm run discover -- <url> [--click <selector>] [--headed]
 */
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { openSession, recordRobots, settle } from '../browser/session.ts';

/** Runs inside each frame. Self-contained: no imports, no outer variables. */
function summarise() {
  const clean = (value: string | null | undefined, max = 80) => (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const visible = (el: Element) => (typeof (el as HTMLElement).checkVisibility === 'function' ? (el as HTMLElement).checkVisibility() : true);
  const selectorFor = (el: Element): string => {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const name = el.getAttribute('name');
    if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node !== document.body && parts.length < 6) {
      const parent: Element | null = node.parentElement;
      if (!parent) break;
      const tag = node.tagName;
      const same = Array.from(parent.children).filter((child) => child.tagName === tag);
      parts.unshift(same.length > 1 ? `${tag.toLowerCase()}:nth-of-type(${same.indexOf(node) + 1})` : tag.toLowerCase());
      if (parent.id) {
        parts.unshift(`#${CSS.escape(parent.id)}`);
        break;
      }
      node = parent;
    }
    return parts.join(' > ');
  };
  const labelFor = (el: Element): string => {
    const aria = el.getAttribute('aria-label');
    if (aria) return `aria-label: ${clean(aria)}`;
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      return `labelledby: ${clean(labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' '))}`;
    }
    const labels = (el as HTMLInputElement).labels;
    if (labels && labels.length > 0) return `label: ${clean(Array.from(labels).map((l) => l.textContent).join(' '))}`;
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return `placeholder: ${clean(placeholder)}`;
    const title = el.getAttribute('title');
    if (title) return `title: ${clean(title)}`;
    return '';
  };

  const inputs = Array.from(document.querySelectorAll('input, select, textarea'))
    .filter((el) => (el as HTMLInputElement).type !== 'hidden')
    .slice(0, 40)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') ?? '',
      selector: selectorFor(el),
      label: labelFor(el),
      visible: visible(el),
    }));

  const buttons = Array.from(
    document.querySelectorAll('button, input[type=submit], input[type=button], input[type=image], [role=button], a[onclick], [onclick]:not(a):not(button)'),
  )
    .slice(0, 40)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      selector: selectorFor(el),
      text: clean((el as HTMLElement).innerText || el.getAttribute('value') || el.getAttribute('alt') || '', 50),
      label: labelFor(el),
      href: (el.closest('a[href]') as HTMLAnchorElement | null)?.href ?? '',
      visible: visible(el),
    }));

  const captchaPattern = /captch|capcha/i;
  const captcha = Array.from(document.querySelectorAll('img, canvas, input, iframe, div, span'))
    .filter((el) =>
      captchaPattern.test(
        [el.id, el.getAttribute('class'), el.getAttribute('name'), el.getAttribute('src'), el.getAttribute('alt'), el.getAttribute('title'), el.getAttribute('placeholder')].join(' '),
      ),
    )
    .slice(0, 15)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      selector: selectorFor(el),
      cls: clean(el.getAttribute('class'), 60),
      src: clean(el.getAttribute('src'), 80),
      alt: clean(el.getAttribute('alt'), 60),
      visible: visible(el),
    }));

  const audioHints = Array.from(document.querySelectorAll('audio, a, button, img, [role=button], span, i'))
    .filter((el) =>
      /audio|listen|speak|sound|play|ऑडियो|सुनें/i.test(
        [el.id, el.getAttribute('class'), el.getAttribute('title'), el.getAttribute('alt'), el.getAttribute('aria-label'), (el as HTMLElement).innerText?.slice(0, 40)].join(' '),
      ),
    )
    .slice(0, 10)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      selector: selectorFor(el),
      text: clean((el as HTMLElement).innerText || el.getAttribute('title') || el.getAttribute('alt') || el.getAttribute('aria-label'), 50),
    }));

  const keyLinks = Array.from(document.querySelectorAll('a[href]'))
    .map((a) => ({ text: clean((a as HTMLElement).innerText || a.getAttribute('title') || a.getAttribute('aria-label'), 50), href: (a as HTMLAnchorElement).href }))
    .filter((l) => /log ?in|sign ?in|sign ?up|register|apply|lodge|grievance|contact|accessib|application|applicant|student|search/i.test(l.text))
    .slice(0, 25);

  const bodyText = document.body?.innerText ?? '';
  const pdfLinks = Array.from(document.querySelectorAll('a[href]'))
    .map((a) => (a as HTMLAnchorElement).href)
    .filter((href) => /\.pdf(\?|#|$)/i.test(href));

  return {
    htmlLang: document.documentElement.getAttribute('lang'),
    title: document.title,
    inputs,
    buttons,
    captcha,
    audioHints,
    keyLinks,
    iframes: Array.from(document.querySelectorAll('iframe')).map((f) => f.getAttribute('src') ?? '(srcdoc)').slice(0, 10),
    indicChars: (bodyText.match(/[ऀ-ൿ]/g) ?? []).length,
    indicSample: clean((bodyText.match(/[ऀ-ൿ][ऀ-ൿ\s]{0,40}/) ?? [''])[0], 40),
    pdfLinks: { count: pdfLinks.length, first: pdfLinks.slice(0, 5) },
  };
}

type FrameSummary = ReturnType<typeof summarise>;

function printFrame(url: string, s: FrameSummary): void {
  console.log(`\n## frame ${url}`);
  console.log(`lang=${s.htmlLang ?? '(none)'} title="${s.title}" indicChars=${s.indicChars} ${s.indicSample ? `e.g. "${s.indicSample}"` : ''}`);
  for (const i of s.inputs.filter((x) => x.visible)) console.log(`  input  ${i.tag}[${i.type}]  ${i.selector}  | ${i.label || '(no label)'}`);
  for (const b of s.buttons.filter((x) => x.visible)) {
    console.log(`  button ${b.tag}  ${b.selector}  | "${b.text}" ${b.label ? `| ${b.label}` : ''}${b.href ? ` → ${b.href}` : ''}`);
  }
  for (const c of s.captcha) console.log(`  captcha? ${c.tag}  ${c.selector}  cls="${c.cls}" src="${c.src}" alt="${c.alt}" visible=${c.visible}`);
  for (const a of s.audioHints) console.log(`  audio?  ${a.tag}  ${a.selector}  "${a.text}"`);
  for (const l of s.keyLinks) console.log(`  link   "${l.text}" → ${l.href}`);
  if (s.iframes.length) console.log(`  iframes: ${s.iframes.join(' , ')}`);
  if (s.pdfLinks.count) console.log(`  pdf links: ${s.pdfLinks.count}  e.g. ${s.pdfLinks.first.join(' , ')}`);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { click: { type: 'string' }, headed: { type: 'boolean', default: false } },
});

const url = positionals[0];
if (!url) {
  console.error('usage: npm run discover -- <url> [--click <selector>] [--headed]');
  process.exit(1);
}

const session = await openSession({ headed: values.headed });
try {
  const robots = await recordRobots(session.context, url);
  await session.pace();
  const response = await session.page.goto(url, { waitUntil: 'domcontentloaded' });
  await settle(session.page);
  if (values.click) {
    await session.pace();
    await session.page.click(values.click);
    await settle(session.page, 5_000);
  }

  const frames: Array<{ url: string; summary?: FrameSummary; error?: string }> = [];
  for (const frame of session.page.frames()) {
    try {
      frames.push({ url: frame.url(), summary: await frame.evaluate(summarise) });
    } catch (error) {
      frames.push({ url: frame.url(), error: String(error).slice(0, 200) });
    }
  }

  const finalUrl = session.page.url();
  console.log(`requested ${url}\nfinal     ${finalUrl}\nstatus    ${response?.status() ?? 'none'}`);
  console.log(`robots    ${robots.status ?? robots.error} disallowed=${robots.disallowed} ${robots.rule ?? ''}`);
  for (const f of frames) {
    if (f.summary) printFrame(f.url, f.summary);
    else console.log(`\n## frame ${f.url}\n  error: ${f.error}`);
  }

  await mkdir('tmp/discover', { recursive: true });
  const stem = `tmp/discover/${new URL(finalUrl).hostname}`;
  await writeFile(`${stem}.json`, JSON.stringify({ requested: url, finalUrl, status: response?.status() ?? null, robots, frames }, null, 2));
  await session.page.screenshot({ path: `${stem}.jpg`, type: 'jpeg', quality: 60 });
} finally {
  await session.close();
}
