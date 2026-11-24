import type { Page } from 'playwright';
import { parseAriaLine } from './aria.ts';
import { SPOKEN_ROLE } from './names.ts';

/**
 * Turns Playwright's aria snapshot into the lines a screen reader would roughly announce, in
 * order: "Login, button", "edit, no name", "heading level 1, Passport Seva". It is an
 * approximation for evidence and teaching. Real NVDA speech differs in wording and detail.
 */

const SPOKEN: Record<string, string> = {
  ...SPOKEN_ROLE,
  img: 'graphic',
  radio: 'radio button',
  option: 'option',
  slider: 'slider',
  dialog: 'dialog',
  alertdialog: 'alert dialog',
  progressbar: 'progress bar',
  menubutton: 'menu button',
  treeitem: 'tree view item',
};

const LANDMARKS: Record<string, string> = {
  banner: 'banner landmark',
  navigation: 'navigation landmark',
  main: 'main landmark',
  contentinfo: 'content info landmark',
  complementary: 'complementary landmark',
  search: 'search landmark',
  form: 'form landmark',
  region: 'region landmark',
};

const STRUCTURE: Record<string, string> = { list: 'list', table: 'table', grid: 'grid', tablist: 'tab control', menu: 'menu', menubar: 'menu bar', tree: 'tree view', iframe: 'frame' };

const STATES: Record<string, string> = { checked: 'checked', 'checked=mixed': 'half checked', disabled: 'unavailable', expanded: 'expanded', selected: 'selected', pressed: 'pressed', required: 'required' };

export function snapshotToTranscript(snapshot: string): string[] {
  const lines: string[] = [];
  for (const raw of snapshot.split('\n')) {
    const node = parseAriaLine(raw);
    if (!node) continue;
    const { role, name, attrs, inline } = node;
    const label = name || inline;

    if (role === 'text' || role === 'paragraph' || role === 'listitem' || role === 'cell' || role === 'gridcell' || role === 'generic') {
      if (inline || name) lines.push(inline || name);
      continue;
    }
    if (role === 'heading') {
      const level = attrs.find((a) => a.startsWith('level='))?.slice(6);
      lines.push(`heading${level ? ` level ${level}` : ''}, ${label || 'no name'}`);
      continue;
    }
    if (LANDMARKS[role]) {
      lines.push(`${LANDMARKS[role]}${name ? `, ${name}` : ''}`);
      if (inline) lines.push(inline);
      continue;
    }
    if (STRUCTURE[role]) {
      lines.push(`${STRUCTURE[role]}${name ? `, ${name}` : ''}`);
      if (inline) lines.push(inline);
      continue;
    }
    const spoken = SPOKEN[role];
    if (spoken) {
      const states = attrs.map((a) => STATES[a]).filter((s): s is string => Boolean(s));
      const parts = label ? [label, spoken, ...states] : [spoken, 'no name', ...states];
      lines.push(parts.join(', '));
      continue;
    }
    if (label) lines.push(label);
  }
  return lines;
}

/** The transcript of every frame on the page, main frame first, capped at `maxLines`. */
export async function buildTranscript(page: Page, maxLines = 600): Promise<string> {
  const out: string[] = [];
  for (const frame of page.frames()) {
    const snapshot = await frame
      .locator('body')
      .ariaSnapshot({ timeout: 10_000 })
      .catch(() => '');
    const lines = snapshotToTranscript(snapshot);
    if (lines.length === 0) continue;
    if (frame !== page.mainFrame()) out.push('', `[frame: ${frame.url()}]`);
    out.push(...lines);
    if (out.length >= maxLines) break;
  }
  const capped = out.slice(0, maxLines);
  if (out.length > maxLines) capped.push(`[… cut at ${maxLines} lines]`);
  return capped.join('\n');
}
