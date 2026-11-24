import { AUTOMATED_LABEL } from '../rules.ts';

/** Escapes text for HTML element content and attribute values. Every untrusted string goes through this. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const INDIC_RUN = /[ऀ-ൿ](?:[ऀ-ൿ\s.,:;!?'"()|/-]*[ऀ-ൿ])?/g;

/**
 * Escapes text and marks runs of Indic script with a lang, so a screen reader reading the report
 * switches voice. `indicLang` is "mr" for Maharashtra portals and "hi" otherwise.
 */
export function withLang(value: unknown, indicLang: 'hi' | 'mr'): string {
  const text = String(value ?? '');
  let out = '';
  let last = 0;
  for (const match of text.matchAll(INDIC_RUN)) {
    out += esc(text.slice(last, match.index));
    out += `<span lang="${indicLang}">${esc(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  return out + esc(text.slice(last));
}

const UNDERSTANDING: Record<string, string> = {
  '1.1.1': 'non-text-content',
  '1.3.1': 'info-and-relationships',
  '1.3.5': 'identify-input-purpose',
  '1.4.1': 'use-of-color',
  '1.4.3': 'contrast-minimum',
  '1.4.4': 'resize-text',
  '1.4.10': 'reflow',
  '1.4.11': 'non-text-contrast',
  '1.4.12': 'text-spacing',
  '2.1.1': 'keyboard',
  '2.1.2': 'no-keyboard-trap',
  '2.2.2': 'pause-stop-hide',
  '2.4.1': 'bypass-blocks',
  '2.4.2': 'page-titled',
  '2.4.4': 'link-purpose-in-context',
  '2.4.7': 'focus-visible',
  '2.5.3': 'label-in-name',
  '3.1.1': 'language-of-page',
  '3.1.2': 'language-of-parts',
  '3.3.2': 'labels-or-instructions',
  '4.1.1': 'parsing',
  '4.1.2': 'name-role-value',
};

export function wcagLinks(criteria: readonly string[]): string {
  if (criteria.length === 0) return 'no WCAG criterion';
  return criteria
    .map((c) => {
      const slug = UNDERSTANDING[c];
      const href = slug ? `https://www.w3.org/WAI/WCAG21/Understanding/${slug}.html` : 'https://www.w3.org/WAI/WCAG21/quickref/';
      return `<a href="${href}">WCAG ${esc(c)}</a>`;
    })
    .join(', ');
}

export interface PageOptions {
  title: string;
  /** 0 for pages at the site root, 1 for pages in portals/. */
  depth: 0 | 1;
  current?: 'index' | 'method' | 'send';
  body: string;
}

export function layout({ title, depth, current, body }: PageOptions): string {
  const root = depth === 0 ? '' : '../';
  const nav = (key: PageOptions['current'], href: string, text: string) =>
    `<li><a href="${root}${href}"${current === key ? ' aria-current="page"' : ''}>${text}</a></li>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'">
<title>${esc(title)} · pahunch</title>
<link rel="stylesheet" href="${root}style.css">
</head>
<body>
<a class="skip" href="#main">Skip to main content</a>
<header class="site">
<div class="wrap">
<a class="brand" href="${root}index.html">pahunch <span lang="hi">पहुँच</span></a>
<nav aria-label="Main">
<ul>
${nav('index', 'index.html', 'Scorecard')}
${nav('method', 'method.html', 'How we tested')}
${nav('send', 'send.html', 'Send the findings')}
<li><a href="https://github.com/DevGurav/pahunch">Code and data</a></li>
</ul>
</nav>
</div>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="site">
<div class="wrap">
<p>${esc(AUTOMATED_LABEL)} Automated checks find only part of the real problems.</p>
<p>Findings: <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Code: MIT. Not affiliated with any government body.</p>
</div>
</footer>
</body>
</html>
`;
}
