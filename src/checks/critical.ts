import type { Locator, Page } from 'playwright';
import type { ControlKind, CriticalControl } from '../portals/types.ts';

export const CRITICAL_ATTR = 'data-pahunch-critical';

export interface ResolvedControl {
  index: number;
  label: string;
  kind: ControlKind;
  selector: string;
  found: boolean;
  /** Set when the control sits inside an iframe. */
  frameUrl?: string;
  /** Why it wasn't found, when the selector itself failed. */
  error?: string;
}

/**
 * Finds each critical control (searching every frame) and tags it with
 * `data-pahunch-critical="<index>"`, so code running inside the page can recognise it.
 * The attribute exists only in our browser's copy of the page.
 */
export async function markCritical(page: Page, controls: readonly CriticalControl[]): Promise<ResolvedControl[]> {
  const resolved: ResolvedControl[] = [];
  for (const [index, control] of controls.entries()) {
    const entry: ResolvedControl = { index, label: control.label, kind: control.kind, selector: control.selector, found: false };
    for (const frame of page.frames()) {
      try {
        const locator = frame.locator(control.selector).first();
        if ((await locator.count()) === 0) continue;
        await locator.evaluate((el, [attr, i]) => el.setAttribute(attr, i), [CRITICAL_ATTR, String(index)] as const, { timeout: 5_000 });
        entry.found = true;
        delete entry.error;
        if (frame !== page.mainFrame()) entry.frameUrl = frame.url();
        break;
      } catch (error) {
        entry.error = String(error).split('\n')[0]?.slice(0, 200);
      }
    }
    resolved.push(entry);
  }
  return resolved;
}

/** The tagged element for a critical control, in whichever frame it lives. */
export async function locateCritical(page: Page, index: number): Promise<Locator | undefined> {
  for (const frame of page.frames()) {
    const locator = frame.locator(`[${CRITICAL_ATTR}="${index}"]`);
    if ((await locator.count().catch(() => 0)) > 0) return locator.first();
  }
  return undefined;
}
