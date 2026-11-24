import type { Page } from 'playwright';
import { finding } from '../rules.ts';
import type { CheckResult, Finding } from '../types.ts';
import { CRITICAL_ATTR } from './critical.ts';

export interface CaptchaAudio {
  description: string;
  /** The Tab key can reach it. */
  focusable: boolean;
  /** It is (or sits inside) a button or link, so a screen reader announces it as something to activate. */
  exposed: boolean;
  snippet: string;
}

export interface CaptchaGroup {
  kind: 'image' | 'canvas' | 'text' | 'third-party' | 'unknown';
  provider?: string;
  /** The CAPTCHA belongs to the task: its field is a critical control, or its form holds one. */
  onPath: boolean;
  /** `alt` of an image CAPTCHA: null when absent, '' when empty (hidden from screen readers). */
  imageAlt?: string | null;
  target: string;
  inputTarget?: string;
  audio?: CaptchaAudio | null;
  snippet: string;
  frameUrl?: string;
}

export interface CaptchaEvidence {
  groups: CaptchaGroup[];
}

/**
 * Runs inside a frame. Finds CAPTCHAs and, for each, the field it goes with and any audio
 * alternative. Self-contained: no imports, no outer variables.
 */
function detectCaptchas(criticalAttr: string): CaptchaGroup[] {
  const PATTERN = /captch|capcha/i;
  const FIELD_HINT = /captch|capcha|security code|verification code|characters|enter (the )?code/i;
  const AUDIO = /audio|listen|speak|speech|sound|ऑडियो|सुन/i;
  const NOT_AUDIO = /play ?store|google ?play|app ?store/i;
  const CONTROL_NOISE = /refresh|reload|loading|loader|spinner|audio|speaker|sound|listen/i;
  const TEXT_INPUTS = 'input:not([type]), input[type="text"], input[type="number"], input[type="tel"], input[type="search"]';

  const attrs = (el: Element) =>
    ['id', 'class', 'name', 'src', 'alt', 'title', 'aria-label', 'placeholder']
      .map((a) => el.getAttribute(a) ?? '')
      .join(' ');
  const visible = (el: Element) => {
    const he = el as HTMLElement;
    if (typeof he.checkVisibility === 'function' && !he.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const describe = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (el.id) return `${tag}#${el.id}`;
    const name = el.getAttribute('name');
    if (name) return `${tag}[name="${name}"]`;
    const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/)[0];
    return cls ? `${tag}.${cls}` : tag;
  };
  const snippet = (el: Element) =>
    el.outerHTML
      .replace(/(data:[^"',)]{0,24})[^"',)]*/g, '$1…')
      .replace(/\s+/g, ' ')
      .slice(0, 300);
  const actionable = (el: Element) =>
    el.closest('a[href], button, [role="button"], [role="link"], input[type="button"], input[type="image"], input[type="submit"]');
  const tabbable = (el: Element) => (el as HTMLElement).tabIndex >= 0 && !(el as HTMLButtonElement).disabled && visible(el);
  const labelText = (input: Element) =>
    Array.from((input as HTMLInputElement).labels ?? [])
      .map((l) => l.textContent ?? '')
      .join(' ');
  const container = (el: Element): Element => {
    const form = el.closest('form');
    if (form) return form;
    let node: Element | null = el.parentElement;
    for (let i = 0; node && i < 6; i++, node = node.parentElement) {
      if (Array.from(node.querySelectorAll(TEXT_INPUTS)).some(visible)) return node;
    }
    return el.parentElement ?? document.body;
  };
  const onPath = (box: Element, input: Element | null) =>
    Boolean(input?.hasAttribute(criticalAttr)) || box.querySelector(`[${criticalAttr}]`) !== null || Boolean(box.closest(`[${criticalAttr}]`));

  const groups: CaptchaGroup[] = [];
  const usedInputs = new Set<Element>();
  const usedBoxes = new Set<Element>();

  // Third-party widgets.
  const providers: Array<[string, string]> = [
    ['reCAPTCHA', '.g-recaptcha, iframe[src*="recaptcha"]'],
    ['hCaptcha', '.h-captcha, iframe[src*="hcaptcha"]'],
    ['Cloudflare Turnstile', '.cf-turnstile, iframe[src*="challenges.cloudflare.com"]'],
  ];
  for (const [provider, selector] of providers) {
    const seen = new Set<Element>();
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const box = container(el);
      if (seen.has(box)) continue;
      seen.add(box);
      usedBoxes.add(box);
      groups.push({ kind: 'third-party', provider, onPath: onPath(box, null), target: describe(el), snippet: snippet(el) });
    }
  }

  // Image and canvas CAPTCHAs.
  const visuals = Array.from(document.querySelectorAll('img, canvas, svg, input[type="image"]')).filter((el) => {
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 15) return false;
    const own = attrs(el);
    const near = [el.parentElement, el.parentElement?.parentElement].map((p) => (p ? attrs(p) : '')).join(' ');
    if (!PATTERN.test(own) && !PATTERN.test(near)) return false;
    // A speaker or refresh icon inside a link or button is a control, not the challenge.
    const noise = ['id', 'class', 'src'].map((a) => el.getAttribute(a) ?? '').join(' ').replace(/captch\w*|capcha\w*/gi, '');
    if (actionable(el) && CONTROL_NOISE.test(noise)) return false;
    return true;
  });

  for (const visual of visuals) {
    const box = container(visual);
    if (usedBoxes.has(box)) continue;
    usedBoxes.add(box);

    const inputs = Array.from(box.querySelectorAll(TEXT_INPUTS)).filter(visible);
    const input =
      inputs.find((i) => FIELD_HINT.test(`${attrs(i)} ${labelText(i)}`)) ??
      inputs.find((i) => visual.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING) ??
      inputs[0] ??
      null;
    if (input) usedInputs.add(input);

    const audioScope = box.tagName === 'FORM' ? box : (box.parentElement ?? box);
    const candidates = Array.from(
      audioScope.querySelectorAll('audio[controls], a, button, [role="button"], input[type="button"], input[type="image"], img, i, span, svg'),
    ).filter((el) => {
      if (el === visual) return false;
      const text = `${attrs(el)} ${(el as HTMLElement).innerText?.slice(0, 40) ?? ''}`;
      return AUDIO.test(text) && !NOT_AUDIO.test(text);
    });
    const ranked = candidates
      .map((el) => {
        const control = actionable(el) ?? el;
        return {
          description: (
            control.getAttribute('aria-label') ||
            control.getAttribute('title') ||
            (control as HTMLElement).innerText ||
            control.querySelector('img[alt]')?.getAttribute('alt') ||
            el.getAttribute('aria-label') ||
            el.getAttribute('alt') ||
            el.id
          )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80),
          focusable: tabbable(control),
          exposed: actionable(el) !== null || el.tagName === 'AUDIO',
          snippet: snippet(control),
        };
      })
      .sort((a, b) => Number(b.focusable && b.exposed) - Number(a.focusable && a.exposed));

    const tag = visual.tagName.toLowerCase();
    groups.push({
      kind: tag === 'canvas' ? 'canvas' : 'image',
      onPath: onPath(box, input),
      imageAlt: tag === 'img' || tag === 'input' ? visual.getAttribute('alt') : null,
      target: describe(visual),
      inputTarget: input ? describe(input) : undefined,
      audio: ranked[0] ?? null,
      snippet: snippet(visual),
    });
  }

  // CAPTCHA fields with no picture: a text challenge, or one we can't see.
  for (const input of Array.from(document.querySelectorAll(TEXT_INPUTS)).filter(visible)) {
    if (usedInputs.has(input) || !PATTERN.test(`${attrs(input)} ${labelText(input)}`)) continue;
    const box = container(input);
    if (usedBoxes.has(box)) continue;
    usedBoxes.add(box);
    const challenge = Array.from(box.querySelectorAll('span, div, label, p, b, strong')).find(
      (el) => el !== input && PATTERN.test(attrs(el)) && visible(el) && ((el as HTMLElement).innerText ?? '').trim().length > 0,
    );
    groups.push({
      kind: challenge ? 'text' : 'unknown',
      onPath: onPath(box, input),
      target: describe(challenge ?? input),
      inputTarget: describe(input),
      snippet: snippet(challenge ?? input),
    });
  }

  return groups;
}

export async function checkCaptcha(page: Page): Promise<CheckResult<CaptchaEvidence>> {
  const groups: CaptchaGroup[] = [];
  for (const frame of page.frames()) {
    const found = await frame.evaluate(detectCaptchas, CRITICAL_ATTR).catch(() => [] as CaptchaGroup[]);
    for (const group of found) {
      if (frame !== page.mainFrame()) group.frameUrl = frame.url();
      groups.push(group);
    }
  }

  const findings: Finding[] = [];
  for (const g of groups) {
    const where = { target: g.target, snippet: g.snippet, ...(g.frameUrl ? { frameUrl: g.frameUrl } : {}) };
    if (g.kind === 'third-party') {
      findings.push(finding('captcha-third-party', `${g.provider} on the page.`, where));
    } else if (g.kind === 'text') {
      findings.push(finding('captcha-text', 'The CAPTCHA challenge is written as text, which a screen reader can read.', where));
    } else if (g.kind === 'image' || g.kind === 'canvas') {
      const hidden = g.imageAlt === '' ? ' Its alt text is empty, so screen readers skip the image entirely.' : '';
      if (!g.audio) {
        findings.push(
          finding(
            'captcha-image-only',
            g.onPath
              ? `The task needs this ${g.kind} CAPTCHA, and there is no audio or other non-visual option.${hidden}`
              : `${g.kind === 'canvas' ? 'Canvas' : 'Image'} CAPTCHA with no audio option, in a form that is not part of this task.${hidden}`,
            { ...where, severity: g.onPath ? 'blocker' : 'barrier', details: { imageAlt: g.imageAlt, input: g.inputTarget } },
          ),
        );
      } else if (!g.audio.focusable || !g.audio.exposed) {
        // Neither focusable nor exposed: a blind user has no way to discover it, so on the task
        // path it is no better than no audio option at all (docs/decisions/0006-*).
        const hiddenFromAll = !g.audio.focusable && !g.audio.exposed;
        const problem = hiddenFromAll
          ? 'the Tab key cannot reach it and it is not exposed to screen readers as a button or link'
          : !g.audio.focusable
            ? 'the Tab key cannot reach it'
            : 'it is not exposed as a button or link';
        findings.push(
          finding('captcha-audio-unreachable', `There is an audio option ("${g.audio.description}"), but ${problem}.`, {
            ...where,
            severity: hiddenFromAll && g.onPath ? 'blocker' : 'barrier',
            details: { audio: g.audio, imageAlt: g.imageAlt },
          }),
        );
      } else {
        findings.push(
          finding('captcha-with-audio', `Image CAPTCHA with an audio option ("${g.audio.description}") that the keyboard can reach.${hidden}`, {
            ...where,
            details: { audio: g.audio, imageAlt: g.imageAlt },
          }),
        );
      }
    }
  }
  return { findings, evidence: { groups } };
}
