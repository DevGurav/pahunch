export type Severity = 'blocker' | 'barrier' | 'info';

export type CheckId = 'axe' | 'captcha' | 'keyboard' | 'names' | 'lang' | 'pdf';

/**
 * One problem found on one page. Everything copied from the page (snippet, names, text in
 * `summary` or `details`) is untrusted and must be escaped before it is displayed.
 */
export interface Finding {
  check: CheckId;
  /** A RuleId from src/rules.ts, or `axe/<rule-id>` for axe-core rules. */
  rule: string;
  severity: Severity;
  /** WCAG success criteria, e.g. ['1.1.1']. */
  wcag: string[];
  /** One plain-language line about this instance. */
  summary: string;
  /** Where on the page: a CSS selector, a control label or a URL. */
  target?: string;
  /** Truncated outerHTML of the element. Untrusted. */
  snippet?: string;
  /** Set when the element sits inside an iframe. */
  frameUrl?: string;
  details?: Record<string, unknown>;
}

/**
 * Precedence, highest first: blocked > inconclusive > barriers > no-blockers-found.
 * "no-blockers-found" never means "accessible": automated checks see only part of the problems.
 */
export type Verdict = 'blocked' | 'inconclusive' | 'barriers' | 'no-blockers-found';
