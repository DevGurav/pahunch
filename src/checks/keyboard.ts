import type { Page } from 'playwright';
import { finding } from '../rules.ts';
import type { CheckResult, Finding } from '../types.ts';
import { CRITICAL_ATTR, locateCritical, type ResolvedControl } from './critical.ts';

export interface KeyboardStop {
  step: number;
  desc: string;
  frameUrl?: string;
  critical?: number;
  focusVisible: boolean | null;
}

export interface KeyboardControl {
  index: number;
  label: string;
  reached: boolean;
  firstStep?: number;
  focusVisible: boolean | null;
  skipped?: 'disabled';
}

export interface KeyboardEvidence {
  presses: number;
  /** Focus reached the end of the page and came back round to where it started. */
  completedCycle: boolean;
  stopsSeen: number;
  /** Focus was held inside an open modal dialog. */
  inModal: boolean;
  /** The elements focus kept cycling through, when it never reached the end of the page. */
  trap: string[] | null;
  controls: KeyboardControl[];
  sequence: KeyboardStop[];
}

interface FocusRead {
  kind: 'element' | 'body' | 'frame';
  id?: number;
  desc?: string;
  critical?: number | null;
  focusVisible?: boolean | null;
  inModal?: boolean;
}

interface FocusState {
  sig: WeakMap<Element, string>;
  ids: WeakMap<Element, number>;
  seq: number;
}

/** Runs in each frame before the walk: blur, then remember how focusable elements look unfocused. */
function prepareFocusWatch(): void {
  const signature = (el: Element) => {
    const cs = getComputedStyle(el);
    return [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow, cs.borderTopColor, cs.borderBottomColor, cs.borderTopWidth, cs.borderBottomWidth, cs.backgroundColor, cs.color, cs.textDecorationLine].join('|');
  };
  const state: FocusState = { sig: new WeakMap(), ids: new WeakMap(), seq: 0 };
  const active = document.activeElement as HTMLElement | null;
  if (active && active !== document.body) active.blur();
  const focusable = 'a[href], area[href], button, input, select, textarea, summary, [tabindex], [contenteditable], audio[controls], video[controls]';
  for (const el of Array.from(document.querySelectorAll(focusable))) {
    state.sig.set(el, signature(el));
    if (el.parentElement) state.sig.set(el.parentElement, signature(el.parentElement));
  }
  (window as unknown as { __pahunchFocus: FocusState }).__pahunchFocus = state;
}

/** Runs in each frame after every Tab press. Returns null when this frame doesn't have focus. */
function readFocus(criticalAttr: string): FocusRead | null {
  if (!document.hasFocus()) return null;
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { kind: 'body' };
  if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') return { kind: 'frame' };

  const holder = window as unknown as { __pahunchFocus?: FocusState };
  const state = (holder.__pahunchFocus ??= { sig: new WeakMap(), ids: new WeakMap(), seq: 0 });
  let id = state.ids.get(el);
  if (id === undefined) {
    id = ++state.seq;
    state.ids.set(el, id);
  }

  const signature = (node: Element) => {
    const cs = getComputedStyle(node);
    return [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow, cs.borderTopColor, cs.borderBottomColor, cs.borderTopWidth, cs.borderBottomWidth, cs.backgroundColor, cs.color, cs.textDecorationLine].join('|');
  };
  const cs = getComputedStyle(el);
  let focusVisible: boolean | null;
  if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) {
    focusVisible = true;
  } else {
    const before = state.sig.get(el);
    const parent = el.parentElement;
    const parentBefore = parent ? state.sig.get(parent) : undefined;
    if (before === undefined) focusVisible = null;
    else focusVisible = signature(el) !== before || (parent !== null && parentBefore !== undefined && signature(parent) !== parentBefore);
  }

  const host = el.closest(`[${criticalAttr}]`) ?? el.querySelector(`[${criticalAttr}]`);
  const name = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('value') || el.getAttribute('placeholder') || el.getAttribute('title') || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  return {
    kind: 'element',
    id,
    desc: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${name ? ` "${name}"` : ''}`,
    critical: host ? Number(host.getAttribute(criticalAttr)) : null,
    focusVisible,
    inModal: Boolean(el.closest('dialog[open], [aria-modal="true"]')),
  };
}

/**
 * Runs on an unreached control. Is it on screen at all, and if not, does the menu hiding it have
 * a disclosure toggle (aria-controls, aria-expanded or aria-haspopup) that Enter would open?
 */
function menuContext(el: Element): { visible: boolean; disclosure: boolean } {
  const he = el as HTMLElement;
  const visible = typeof he.checkVisibility === 'function' ? he.checkVisibility({ checkVisibilityCSS: true }) : true;
  let disclosure = false;
  if (!visible) {
    for (let node = el.parentElement, i = 0; node && i < 6 && !disclosure; node = node.parentElement, i++) {
      if (node.id && document.querySelector(`[aria-controls~="${CSS.escape(node.id)}"]`)) disclosure = true;
      const owner = node.parentElement;
      if (owner?.querySelector(':scope > [aria-expanded], :scope > [aria-haspopup]:not([aria-haspopup="false"])')) disclosure = true;
    }
  }
  return { visible, disclosure };
}

type Focused = FocusRead & { key: string; frameUrl?: string };

async function readFocusEverywhere(page: Page): Promise<Focused | 'end'> {
  let focused: Focused | undefined;
  for (const [index, frame] of page.frames().entries()) {
    const read = await frame.evaluate(readFocus, CRITICAL_ATTR).catch(() => null);
    if (read?.kind === 'element') {
      focused = { ...read, key: `${index}:${read.id}`, ...(frame !== page.mainFrame() ? { frameUrl: frame.url() } : {}) };
    }
  }
  return focused ?? 'end';
}

export interface KeyboardOptions {
  /** Upper bound on Tab presses. Default 400. */
  maxPresses?: number;
}

/**
 * Presses Tab through the page the way a keyboard user would and records where focus goes.
 * A cycle that reaches the end of the page and comes back round is complete. A cycle that
 * never reaches the end is a trap, unless focus is inside an open modal dialog, where holding
 * focus is correct.
 */
export async function checkKeyboard(page: Page, controls: readonly ResolvedControl[], options: KeyboardOptions = {}): Promise<CheckResult<KeyboardEvidence>> {
  const maxPresses = options.maxPresses ?? 400;
  for (const frame of page.frames()) await frame.evaluate(prepareFocusWatch).catch(() => undefined);

  const sequence: KeyboardStop[] = [];
  const firstReach = new Map<number, { step: number; focusVisible: boolean | null }>();
  const descByKey = new Map<string, string>();
  const recent: string[] = [];
  let firstKey: string | undefined;
  let reachedEnd = false;
  let completedCycle = false;
  let inModal = false;
  let trap: string[] | null = null;
  let emptyEnds = 0;
  let presses = 0;

  while (presses < maxPresses) {
    await page.keyboard.press('Tab');
    presses++;
    const focus = await readFocusEverywhere(page);

    if (focus === 'end') {
      if (firstKey !== undefined) reachedEnd = true;
      else if (++emptyEnds >= 3) break; // nothing on the page takes focus
      continue;
    }

    if (focus.key === firstKey) {
      if (reachedEnd) {
        completedCycle = true;
      } else if (focus.inModal) {
        inModal = true;
      } else {
        trap = [...new Set(recent)].map((k) => descByKey.get(k) ?? k);
      }
      break;
    }
    firstKey ??= focus.key;
    descByKey.set(focus.key, focus.desc ?? '');

    if (sequence.length < 400) {
      sequence.push({
        step: presses,
        desc: focus.desc ?? '',
        focusVisible: focus.focusVisible ?? null,
        ...(focus.frameUrl ? { frameUrl: focus.frameUrl } : {}),
        ...(focus.critical != null ? { critical: focus.critical } : {}),
      });
    }
    if (focus.critical != null && !firstReach.has(focus.critical)) {
      firstReach.set(focus.critical, { step: presses, focusVisible: focus.focusVisible ?? null });
    }

    // A loop that doesn't pass through the starting element: catch it from the recent window.
    recent.push(focus.key);
    if (recent.length > 40) recent.shift();
    if (presses >= 60 && !reachedEnd && new Set(recent).size <= 6) {
      if (focus.inModal) inModal = true;
      else trap = [...new Set(recent)].map((k) => descByKey.get(k) ?? k);
      break;
    }
  }

  const keyboardControls: KeyboardControl[] = [];
  for (const control of controls) {
    if (!control.found) continue;
    const reached = firstReach.get(control.index);
    const entry: KeyboardControl = {
      index: control.index,
      label: control.label,
      reached: reached !== undefined,
      focusVisible: reached?.focusVisible ?? null,
      ...(reached ? { firstStep: reached.step } : {}),
    };
    if (!reached) {
      const locator = await locateCritical(page, control.index);
      if (locator && (await locator.isDisabled({ timeout: 2_000 }).catch(() => false))) entry.skipped = 'disabled';
    }
    keyboardControls.push(entry);
  }

  // Audio CAPTCHA controls are reported by the captcha check; here they are evidence only.
  const judged = controls.filter((c) => c.found && c.kind !== 'captcha-audio');
  const entryFor = (c: ResolvedControl) => keyboardControls.find((k) => k.index === c.index)!;
  const unreached = judged.filter((c) => !entryFor(c).reached && !entryFor(c).skipped);
  const findings: Finding[] = [];
  const inconclusive: string[] = [];
  const names = (cs: readonly ResolvedControl[]) => cs.map((c) => `"${c.label}"`).join(', ');

  if (trap) {
    findings.push(
      finding(
        'keyboard-trap',
        unreached.length > 0
          ? `Tab keeps cycling through ${trap.length} element(s) (${trap.slice(0, 4).join(', ')}) and never reaches ${names(unreached)}.`
          : `Tab keeps cycling through ${trap.length} element(s) (${trap.slice(0, 4).join(', ')}) and never reaches the end of the page.`,
        { severity: unreached.length > 0 ? 'blocker' : 'barrier', target: trap[0], details: { trap } },
      ),
    );
  } else if (unreached.length > 0 && inModal) {
    inconclusive.push(`Keyboard focus stayed inside an open dialog, so ${names(unreached)} could not be checked from the keyboard.`);
  } else if (unreached.length > 0 && completedCycle) {
    for (const c of unreached) {
      const locator = await locateCritical(page, c.index);
      const snippet = await locator?.evaluate((el) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 300)).catch(() => undefined);
      const context = (await locator?.evaluate(menuContext).catch(() => undefined)) ?? { visible: true, disclosure: false };
      const where = { target: c.label, ...(snippet ? { snippet } : {}), ...(c.frameUrl ? { frameUrl: c.frameUrl } : {}) };
      if (context.visible) {
        findings.push(finding('keyboard-unreachable', `"${c.label}" was never reached in a full pass through the page (${descByKey.size} Tab stops).`, where));
      } else if (context.disclosure) {
        // A menu opened by a button needs Enter or Space, which the walk never presses.
        inconclusive.push(`"${c.label}" is inside a menu that opens with a button. The walk presses only Tab, so whether that button opens the menu from the keyboard was not tested.`);
      } else {
        findings.push(
          finding('keyboard-unreachable', `"${c.label}" is inside a menu that Tab never opened. It appears to open only on mouse hover, which keyboard users cannot do.`, {
            ...where,
            severity: 'barrier',
          }),
        );
      }
    }
  } else if (unreached.length > 0) {
    inconclusive.push(`The keyboard walk stopped after ${presses} presses without going round the whole page, before reaching ${names(unreached)}.`);
  }

  const invisible = judged.filter((c) => entryFor(c).reached && entryFor(c).focusVisible === false);
  if (invisible.length > 0) {
    findings.push(
      finding('keyboard-focus-invisible', `No visible focus indicator on ${invisible.map((c) => c.label).join(', ')}.`, {
        target: invisible[0]!.label,
        details: { controls: invisible.map((c) => c.label) },
      }),
    );
  }

  return {
    findings,
    inconclusive,
    evidence: { presses, completedCycle, stopsSeen: descByKey.size, inModal, trap, controls: keyboardControls, sequence },
  };
}
