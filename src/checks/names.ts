import type { Page } from 'playwright';
import type { ControlKind } from '../portals/types.ts';
import { finding } from '../rules.ts';
import type { CheckResult, Finding } from '../types.ts';
import { parseAriaLine } from './aria.ts';
import { locateCritical, type ResolvedControl } from './critical.ts';

export interface ControlName {
  index: number;
  label: string;
  kind: ControlKind;
  /** Role as the accessibility snapshot reports it; '' when the control isn't in the tree. */
  role: string;
  name: string;
  disabled: boolean;
  hidden: boolean;
  /** First lines of the control's aria snapshot, kept as evidence. */
  snapshot: string;
}

const EXPECTED_ROLES: Record<ControlKind, readonly string[]> = {
  field: ['textbox', 'searchbox', 'spinbutton', 'combobox'],
  'captcha-field': ['textbox', 'searchbox', 'spinbutton'],
  select: ['combobox', 'listbox'],
  checkbox: ['checkbox', 'switch'],
  button: ['button', 'link', 'menuitem', 'tab'],
  link: ['link', 'button', 'menuitem', 'tab'],
  'captcha-audio': ['button', 'link'],
};

const KIND_WORD: Record<ControlKind, string> = {
  field: 'form field',
  'captcha-field': 'form field',
  select: 'dropdown',
  checkbox: 'check box',
  button: 'button',
  link: 'link',
  'captcha-audio': 'button',
};

/** Roughly how NVDA speaks each role. */
export const SPOKEN_ROLE: Record<string, string> = {
  textbox: 'edit',
  searchbox: 'search edit',
  spinbutton: 'spin button',
  combobox: 'combo box',
  listbox: 'list box',
  checkbox: 'check box',
  switch: 'switch',
  button: 'button',
  link: 'link',
  menuitem: 'menu item',
  tab: 'tab',
};

const HAS_WORDS = /[\p{L}\p{N}]/u;

/**
 * Reads each critical control's role and accessible name as the browser computes them (through
 * Playwright's aria snapshot) and flags controls a screen reader can't announce usefully.
 * Audio CAPTCHA controls are left to the captcha check, so they aren't reported twice.
 */
export async function checkNames(page: Page, controls: readonly ResolvedControl[]): Promise<CheckResult<{ controls: ControlName[] }>> {
  const evidence: ControlName[] = [];
  const findings: Finding[] = [];

  for (const control of controls) {
    if (!control.found) continue;
    const locator = await locateCritical(page, control.index);
    if (!locator) continue;

    const snapshot = (await locator.ariaSnapshot({ timeout: 5_000 }).catch(() => '')).trim();
    const first = snapshot
      .split('\n')
      .map(parseAriaLine)
      .find((line) => line !== undefined);
    const entry: ControlName = {
      index: control.index,
      label: control.label,
      kind: control.kind,
      role: first?.role ?? '',
      name: first?.name ?? '',
      disabled: await locator.isDisabled({ timeout: 2_000 }).catch(() => false),
      hidden: snapshot === '',
      snapshot: snapshot.split('\n').slice(0, 4).join('\n'),
    };
    evidence.push(entry);
    if (control.kind === 'captcha-audio') continue;

    const html = await locator.evaluate((el) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 300)).catch(() => undefined);
    const where = { target: control.label, ...(html ? { snippet: html } : {}), ...(control.frameUrl ? { frameUrl: control.frameUrl } : {}) };

    if (entry.hidden) {
      findings.push(finding('name-missing', `"${control.label}" is not in the accessibility tree at all, so a screen reader never announces it.`, where));
    } else if (!EXPECTED_ROLES[control.kind].includes(entry.role)) {
      const heard = entry.role === 'text' ? `plain text ("${first?.inline ?? ''}")` : `a "${entry.role}"`;
      findings.push(finding('role-missing', `"${control.label}" is announced as ${heard}, not as a ${KIND_WORD[control.kind]}.`, where));
    } else if (!HAS_WORDS.test(entry.name)) {
      const spoken = SPOKEN_ROLE[entry.role] ?? entry.role;
      findings.push(
        finding(
          'name-missing',
          entry.name
            ? `"${control.label}" is announced as "${entry.name}, ${spoken}". The name has no words in it.`
            : `"${control.label}" is announced only as "${spoken}", with no name.`,
          where,
        ),
      );
    }
  }

  return { findings, evidence: { controls: evidence } };
}
