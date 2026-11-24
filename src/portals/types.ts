/**
 * What a portal's task is and how to get there. Steps may only navigate or open public dialogs
 * (docs/decisions/0005-scanning-rules.md); nothing is ever typed into a live form or submitted.
 */
export type Step =
  | { kind: 'goto'; url: string }
  /** Opens a public dialog or menu, e.g. a "Login" button that shows a modal. Never a submit. */
  | { kind: 'click'; selector: string; why: string }
  /** Dismisses a popup, e.g. an announcement shown on load. */
  | { kind: 'press'; key: 'Escape'; why: string };

export type ControlKind = 'field' | 'captcha-field' | 'select' | 'checkbox' | 'button' | 'link' | 'captcha-audio';

/**
 * A control the task can't be finished without. Located by a Playwright selector that does not
 * depend on the control's accessible name, because a missing name is one of the things we test.
 */
export interface CriticalControl {
  /** What a sighted person would call it, e.g. "Login ID field". */
  label: string;
  selector: string;
  kind: ControlKind;
}

export interface Portal {
  id: string;
  name: string;
  owner: string;
  jurisdiction: 'Central' | 'Maharashtra';
  /** The task, in plain words: "Reach the login form". */
  task: string;
  steps: Step[];
  critical: CriticalControl[];
  /** What we saw while defining it, and anything out of reach. */
  notes?: string;
}

/** A portal we tried and could not audit, and why. Shown on the methodology page. */
export interface ExcludedPortal {
  name: string;
  owner: string;
  url: string;
  reason: string;
  checkedOn: string;
}
