# 0006: What counts as a blocker

Status: accepted (2026-11-24). Refines the blocker list in the original plan.

## Context

"Blocked" is the verdict people will quote, so it must survive a department's web team pushing
back. The first plan made four things blockers: an image-only CAPTCHA, a task control the Tab key
can't reach, a task control with no accessible name, and a focus trap.

Discovery (build log, 2026-11-24) showed that "no name" is too broad for that list. Passport Seva's
Login ID field has no label, but the visible text "Login ID *" sits right above it, and a
screen-reader user reading the page in browse mode hears that text before reaching the field. It
fails WCAG 1.3.1 and 4.1.2 (Level A) and is worth fixing. But calling the whole task "Blocked" for
it invites a fair rebuttal ("the label is right there"), and losing that argument costs the report
its credibility.

Discovery also turned up the opposite case. On Voters' Services the audio CAPTCHA option is an
`<i aria-label="listen captcha">` icon. The keyboard can't focus it, and it has no role, so it
doesn't appear in the accessibility tree. A blind user has no way to find it, which makes the
CAPTCHA as closed to them as one with no audio at all.

## Decision

A finding is a **blocker** only when, on the evidence we hold, no workaround gets past it:

1. **`captcha-image-only`**: an image or canvas CAPTCHA on the task path with no audio or other
   non-visual option.
2. **`captcha-audio-unreachable`**, when the audio option is **both** unfocusable **and** not
   exposed as a button or link, and the CAPTCHA is on the task path.
3. **`keyboard-unreachable`**: a critical control that a **complete** pass through the page with Tab
   never reaches. "Complete" means focus reached the end of the page and came back round. If the walk
   stopped early, the result is inconclusive, not blocked.
4. **`keyboard-trap`**: Tab cycles without ever reaching the end of the page, outside any open
   modal dialog, and a critical control stays out of reach.

Everything else is a **barrier** at most. That includes critical controls with no usable name
(`name-missing`), clickable controls with no role (`role-missing`), an audio option that is only
one of unfocusable or unexposed, invisible focus, unmarked Indic text, scanned PDFs, and any axe
violation. axe can't tell which elements are on the task path.

Some situations make the task **inconclusive** rather than clean: focus held inside an open dialog,
a keyboard walk that ran out of presses, or a critical control whose selector matched nothing.

## Consequences

- Fewer tasks will be marked Blocked, and each one points to a single element that can be checked
  against the saved page.
- Unlabelled fields still appear prominently, as barriers with a WCAG Level A reference. They are
  not played down; they just don't decide the headline verdict alone.
- A future round with real screen-reader runs (roadmap Phase 5) may show that some barriers stop
  people in practice. That evidence would justify superseding this record.

## Alternatives considered

- **Keep `name-missing` as a blocker.** It's simpler, but it overclaims for fields with adjacent
  visible text, which is the common case on these portals.
- **Make critical-impact axe violations blockers.** axe doesn't know the task path. An unlabelled
  newsletter box in the footer isn't a wall in front of the login.
