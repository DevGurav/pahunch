import type { CheckId, Finding, Severity } from './types.ts';

export type RuleId =
  | 'captcha-image-only'
  | 'captcha-audio-unreachable'
  | 'captcha-with-audio'
  | 'captcha-third-party'
  | 'captcha-text'
  | 'keyboard-unreachable'
  | 'keyboard-trap'
  | 'keyboard-focus-invisible'
  | 'name-missing'
  | 'role-missing'
  | 'lang-indic-unmarked'
  | 'lang-page-wrong'
  | 'pdf-scanned'
  | 'pdf-untagged';

export interface RuleInfo {
  check: CheckId;
  /** Default severity. A check may lower it with a reason, e.g. a CAPTCHA that isn't on the task path. */
  severity: Severity;
  wcag: string[];
  title: string;
  /** Why this matters to a screen-reader user, in plain words. */
  why: string;
  /** What the site should change. */
  fix: string;
}

export const AUTOMATED_LABEL = 'Automated check: not yet tried by a screen-reader user.';

/**
 * Blocker criteria are deliberately narrow: only problems no workaround gets past
 * (docs/decisions/0006-what-counts-as-a-blocker.md).
 */
export const RULES: Record<RuleId, RuleInfo> = {
  'captcha-image-only': {
    check: 'captcha',
    severity: 'blocker',
    wcag: ['1.1.1'],
    title: 'Image CAPTCHA with no audio or other non-visual option',
    why: 'A blind person cannot read the characters in the picture, and there is no other way past it. Without sighted help, the task ends here.',
    fix: 'Offer an audio CAPTCHA as a real button with a clear name that the keyboard can reach, or replace the CAPTCHA with something that needs no sight, such as an OTP to the registered mobile number or server-side rate limiting.',
  },
  'captcha-audio-unreachable': {
    check: 'captcha',
    severity: 'barrier',
    wcag: ['1.1.1', '2.1.1', '4.1.2'],
    title: 'Audio CAPTCHA option that the keyboard cannot reach',
    why: 'An audio option exists, but it is an icon that the Tab key skips and that is not exposed as a button. A screen-reader user may never find out it is there.',
    fix: 'Make the audio option a <button> (or a link) with a clear name such as "Play audio CAPTCHA".',
  },
  'captcha-with-audio': {
    check: 'captcha',
    severity: 'info',
    wcag: ['1.1.1'],
    title: 'Image CAPTCHA with a reachable audio option',
    why: 'An audio alternative is offered and the keyboard can reach it. Whether the audio itself is easy to understand has not been tested.',
    fix: 'Nothing to fix for this check. Distorted audio CAPTCHAs are often hard to follow, so test the audio with real users.',
  },
  'captcha-third-party': {
    check: 'captcha',
    severity: 'info',
    wcag: ['1.1.1'],
    title: 'Third-party CAPTCHA (reCAPTCHA, hCaptcha or Turnstile)',
    why: 'These services offer a non-visual route, but it is known to fail for some screen-reader users, for example when they are asked to solve many audio challenges in a row.',
    fix: 'Prefer checks that need no puzzle at all, such as an OTP or rate limiting. If a third-party CAPTCHA stays, keep its accessibility options turned on.',
  },
  'captcha-text': {
    check: 'captcha',
    severity: 'info',
    wcag: ['1.1.1'],
    title: 'Text CAPTCHA',
    why: 'The challenge is real text, so a screen reader can read it out. It still adds a step, and maths or logic questions can be hard for people with cognitive disabilities.',
    fix: 'Nothing to fix for this check.',
  },
  'keyboard-unreachable': {
    check: 'keyboard',
    severity: 'blocker',
    wcag: ['2.1.1'],
    title: 'Task control the Tab key never reaches',
    why: 'People who use a keyboard instead of a mouse, including screen-reader users filling in a form, cannot reach this control, so they cannot finish the task. A screen-reader user might stumble on it only by reading the page line by line, and nothing tells them it can be clicked.',
    fix: 'Use a real <button>, <a href> or form control. If a custom element is unavoidable, give it tabindex="0", a role, and handlers for Enter and Space.',
  },
  'keyboard-trap': {
    check: 'keyboard',
    severity: 'blocker',
    wcag: ['2.1.2'],
    title: 'Keyboard focus gets stuck',
    why: 'Pressing Tab keeps cycling through the same few elements outside any dialog, so a keyboard user can never get to the rest of the page.',
    fix: 'Remove the script that pulls focus back, or let Tab and Shift+Tab move out of the component.',
  },
  'keyboard-focus-invisible': {
    check: 'keyboard',
    severity: 'barrier',
    wcag: ['2.4.7'],
    title: 'No visible focus indicator on a task control',
    why: 'Sighted keyboard users and people with low vision cannot see where they are on the form. This does not affect blind users directly.',
    fix: 'Remove outline: none, or replace it with a clear :focus-visible style such as a 2px outline in a colour with good contrast.',
  },
  'name-missing': {
    check: 'names',
    severity: 'barrier',
    wcag: ['4.1.2', '1.3.1'],
    title: 'Task control with no usable accessible name',
    why: 'A screen reader announces only "edit" or "button" (or reads out a meaningless name such as a row of stars), with nothing to say what the control is for. On any form with more than one field, the user has to guess.',
    fix: 'Connect the visible label with <label for="id">Login ID</label>, or add aria-label. For an image button, give the image alt text that says what the button does.',
  },
  'role-missing': {
    check: 'names',
    severity: 'barrier',
    wcag: ['4.1.2'],
    title: 'Clickable task control not exposed as a button or link',
    why: 'The control is announced as plain text, so a screen-reader user is not told it can be activated, and it may not respond to Enter or Space.',
    fix: 'Use <button> for actions and <a href> for navigation instead of a clickable <div> or <span>.',
  },
  'lang-indic-unmarked': {
    check: 'lang',
    severity: 'barrier',
    wcag: ['3.1.2'],
    title: 'Hindi, Marathi or other Indic text not marked with its language',
    why: 'Screen readers choose a voice from the lang attribute. Unmarked Devanagari given to an English voice may come out garbled, as spelled-out characters, or not at all, depending on the speech engine.',
    fix: 'Mark the language: <html lang="mr"> for a Marathi page, or <span lang="hi">हिन्दी</span> for a Hindi phrase on an English page.',
  },
  'lang-page-wrong': {
    check: 'lang',
    severity: 'barrier',
    wcag: ['3.1.1'],
    title: 'Page language does not match its text',
    why: 'The page declares one language but is written in another, so a screen reader reads every word with the wrong voice and pronunciation.',
    fix: 'Set <html lang> to the language the page is actually written in, and change it when the user switches language.',
  },
  'pdf-scanned': {
    check: 'pdf',
    severity: 'barrier',
    wcag: ['1.1.1'],
    title: 'Scanned PDF with no text',
    why: 'The PDF is a picture of paper. A screen reader finds nothing in it to read.',
    fix: 'Publish the document from its source file (Word, LibreOffice) as a tagged PDF, or run OCR and tag the result, or publish the content as an HTML page.',
  },
  'pdf-untagged': {
    check: 'pdf',
    severity: 'info',
    wcag: ['1.3.1'],
    title: 'PDF without tags',
    why: 'The text can be read, but headings, lists and tables carry no structure, so screen-reader users cannot jump between sections.',
    fix: 'Export with the "Tagged PDF" option turned on, or add tags in a PDF editor.',
  },
};

/** Builds a Finding from a rule's defaults. `extra` may override severity, with the reason in summary. */
export function finding(rule: RuleId, summary: string, extra: Partial<Omit<Finding, 'rule' | 'check'>> = {}): Finding {
  const info = RULES[rule];
  return { check: info.check, rule, severity: info.severity, wcag: info.wcag, summary, ...extra };
}

/** Converts axe tags such as "wcag111" or "wcag1410" to "1.1.1" / "1.4.10". */
export function wcagFromAxeTags(tags: readonly string[]): string[] {
  const out: string[] = [];
  for (const tag of tags) {
    const m = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
    if (m) out.push(`${m[1]}.${m[2]}.${m[3]}`);
  }
  return out;
}
