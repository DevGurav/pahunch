import type { Page } from 'playwright';
import { finding } from '../rules.ts';
import type { CheckResult, Finding } from '../types.ts';

export interface LangFrame {
  frameUrl?: string;
  htmlLang: string;
  /** Indic characters (Devanagari to Malayalam) in text a screen reader would read. */
  indicTotal: number;
  /** Of those, how many sit under no Indic `lang`. */
  indicUnmarked: number;
  /** Latin letters and Indic characters governed directly by `<html lang>`. */
  latinAtRoot: number;
  indicAtRoot: number;
  samples: Array<{ text: string; lang: string; where: string }>;
}

/** Below this many unmarked Indic characters (a lone "हिन्दी" toggle), report as info only. */
export const UNMARKED_BARRIER_CHARS = 30;
/** A page "declared Indic but written in English" needs at least this much English text. */
export const WRONG_PAGE_MIN_LATIN = 200;

/** Runs inside a frame. Self-contained. */
function measureLanguages(): Omit<LangFrame, 'frameUrl'> {
  const INDIC = /[ऀ-ൿ]/g;
  const LATIN = /[A-Za-z]/g;
  const INDIC_LANGS = new Set([
    'hi', 'mr', 'sa', 'ne', 'kok', 'gom', 'mai', 'bho', 'awa', 'mag', 'raj', 'hne', 'doi', 'brx', 'sd', 'ks',
    'bn', 'as', 'mni', 'sat', 'pa', 'gu', 'or', 'ta', 'te', 'kn', 'ml', 'tcy',
  ]);
  const root = document.documentElement;
  const htmlLang = (root.getAttribute('lang') ?? '').trim();

  const shownCache = new Map<Element, boolean>();
  const shown = (el: Element): boolean => {
    const cached = shownCache.get(el);
    if (cached !== undefined) return cached;
    let result: boolean;
    if (el.closest('[aria-hidden="true"]')) result = false;
    else if (el.tagName === 'OPTION' || el.tagName === 'OPTGROUP') result = el.closest('select') ? shown(el.closest('select')!) : false;
    else result = typeof (el as HTMLElement).checkVisibility === 'function' ? (el as HTMLElement).checkVisibility({ checkVisibilityCSS: true }) : true;
    shownCache.set(el, result);
    return result;
  };
  const describe = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (el.id) return `${tag}#${el.id}`;
    const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/)[0];
    return cls ? `${tag}.${cls}` : tag;
  };

  const out = { htmlLang, indicTotal: 0, indicUnmarked: 0, latinAtRoot: 0, indicAtRoot: 0, samples: [] as LangFrame['samples'] };
  const walker = document.createTreeWalker(document.body ?? root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    const text = node.nodeValue ?? '';
    if (!parent || !text.trim() || parent.closest('script, style, noscript, template') || !shown(parent)) continue;

    const langEl = parent.closest('[lang]');
    const lang = (langEl?.getAttribute('lang') ?? '').trim();
    const primary = lang.toLowerCase().split(/[-_]/)[0] ?? '';
    const indic = (text.match(INDIC) ?? []).length;
    if (indic > 0) {
      out.indicTotal += indic;
      if (!INDIC_LANGS.has(primary)) {
        out.indicUnmarked += indic;
        if (out.samples.length < 5) out.samples.push({ text: text.trim().replace(/\s+/g, ' ').slice(0, 60), lang: lang || '(none)', where: describe(parent) });
      }
    }
    if (langEl === root) {
      out.latinAtRoot += (text.match(LATIN) ?? []).length;
      out.indicAtRoot += indic;
    }
  }
  return out;
}

const INDIC_PRIMARY = /^(hi|mr|sa|ne|kok|gom|mai|bho|awa|mag|raj|hne|doi|brx|sd|ks|bn|as|mni|sat|pa|gu|or|ta|te|kn|ml|tcy)$/i;

export async function checkLang(page: Page): Promise<CheckResult<{ frames: LangFrame[] }>> {
  const frames: LangFrame[] = [];
  const findings: Finding[] = [];

  for (const frame of page.frames()) {
    const measured = await frame.evaluate(measureLanguages).catch(() => undefined);
    if (!measured) continue;
    const entry: LangFrame = { ...measured, ...(frame !== page.mainFrame() ? { frameUrl: frame.url() } : {}) };
    frames.push(entry);
    const where = { ...(entry.frameUrl ? { frameUrl: entry.frameUrl } : {}) };
    const declared = entry.htmlLang ? `the page declares "${entry.htmlLang}"` : 'the page declares no language';

    if (entry.indicUnmarked > 0) {
      const sample = entry.samples[0];
      findings.push(
        finding('lang-indic-unmarked', `${entry.indicUnmarked} characters of Indic text are not marked with an Indic language; ${declared}.`, {
          ...where,
          severity: entry.indicUnmarked >= UNMARKED_BARRIER_CHARS ? 'barrier' : 'info',
          ...(sample ? { target: sample.where, snippet: sample.text } : {}),
          details: { htmlLang: entry.htmlLang, indicUnmarked: entry.indicUnmarked, indicTotal: entry.indicTotal, samples: entry.samples },
        }),
      );
    }

    const primary = entry.htmlLang.split(/[-_]/)[0] ?? '';
    if (INDIC_PRIMARY.test(primary) && entry.latinAtRoot >= WRONG_PAGE_MIN_LATIN && entry.indicAtRoot * 10 < entry.latinAtRoot) {
      findings.push(
        finding(
          'lang-page-wrong',
          `The page declares "${entry.htmlLang}" but its text is mostly English (${entry.latinAtRoot} Latin letters, ${entry.indicAtRoot} Indic characters).`,
          { ...where, target: 'html', details: { htmlLang: entry.htmlLang, latinAtRoot: entry.latinAtRoot, indicAtRoot: entry.indicAtRoot } },
        ),
      );
    }
  }

  return { findings, evidence: { frames } };
}
