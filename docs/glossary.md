# Glossary

**Accessibility tree.** A second version of the page that the browser builds for assistive
technology. It keeps what matters to a screen reader (roles, names, states, text) and drops pure
decoration. Screen readers read this, not the pixels.

**Accessible name.** What a screen reader announces for a control: "Login, button". It comes from
the visible label, `aria-label`, `alt` text, and other sources, in an order defined by the
[accname spec](https://www.w3.org/TR/accname-1.2/). A control with no accessible name is announced
by its role alone ("edit, blank").

**ARIA.** Attributes such as `role`, `aria-label` and `aria-expanded` that fix up the accessibility
tree when plain HTML isn't enough. Plain HTML is better when it fits.

**Barrier.** Our severity for a problem that makes a task harder but doesn't, on the automated
evidence, stop it.

**Blocker.** Our severity for a problem on the task's path that stops a screen-reader user, such as
an image-only CAPTCHA or a Login control the keyboard can't reach.

**CAPTCHA.** A test meant to tell people from bots. An image of distorted characters with no audio
or other non-visual alternative can't be passed by a blind person at all.

**Critical control.** A control the task can't be finished without, such as the Aadhaar number
field, the CAPTCHA field or the Login button. Each portal definition lists them by CSS selector.

**Focus, focus indicator.** The element that keyboard input goes to, and the visible ring or
highlight that shows where it is. Keyboard users who can see need the indicator; screen-reader users
need focus to land in the right places.

**Focus trap.** A place the Tab key can enter but not leave. It is correct inside an open modal
dialog and a defect anywhere else.

**GIGW.** Guidelines for Indian Government Websites. Version 3.0 (2023) covers websites and apps.
Its accessibility section is adopted from WCAG 2.1.

**Inconclusive.** Our verdict when part of the task couldn't be checked, for example because a
critical control's selector matched nothing. It might hide a blocker, so it's never reported as
clean.

**`lang` attribute.** Declares the language of a page (`<html lang="en">`) or of a part of it
(`<span lang="hi">`). Screen readers use it to choose a voice. Hindi text marked as English may be
read with the wrong voice, spelled out, or skipped.

**NVDA.** NonVisual Desktop Access, a free, open-source screen reader for Windows, widely used in
India.

**RPwD Act.** The Rights of Persons with Disabilities Act, 2016. It requires government services
and information to be accessible.

**Screen reader.** Software that turns the accessibility tree into speech or braille and lets the
user move through a page with the keyboard.

**Scanned PDF.** A PDF whose pages are images of paper. With no text layer, a screen reader finds
nothing to read.

**Tagged PDF.** A PDF that carries a structure tree (headings, paragraphs, tables) for assistive
technology. Having text isn't enough to make a PDF tagged.

**Transcript.** Our approximation of what a screen reader would announce on a page, in order, built
from the accessibility tree. It's evidence and teaching material, not a recording.

**Verdict.** One of Blocked, Inconclusive, Barriers found, or No blockers found by automated checks.

**WCAG.** Web Content Accessibility Guidelines from the W3C. Version 2.1 (2018) is the one GIGW 3.0
adopts. Levels A and AA are the usual legal target.
