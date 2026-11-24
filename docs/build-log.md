# Build log

Newest first. Each entry covers what was built and why, what went wrong, the tradeoffs, what was
verified, and what comes next.

---

## 2026-11-24: Report site

### What was built

- `src/report/`: a static site with no JavaScript at all, built from the newest result for each
  portal. It has a scorecard (`index.html`), one page per portal, a methodology page, and a "send
  the findings" page. Full transcripts are published as text files.
- Every page sends `Content-Security-Policy: default-src 'none'; style-src 'self'; …`, so even an
  escaping bug couldn't run script. Everything taken from a scanned page goes through one `esc()`
  helper, and `test/report.test.ts` feeds it a `<script>` snippet and a hostile accessible name.
- Indic text inside the report is wrapped in `<span lang="…">`, using `mr` for Maharashtra portals
  and `hi` otherwise, so the report doesn't make the mistake it reports.
- `npm run check:site` serves the built site locally and runs pahunch's own names, lang, axe and
  keyboard checks on all 18 pages, with the skip link and main navigation as critical controls. CI
  fails on any blocker or barrier, including serious or critical axe violations, then deploys to
  GitHub Pages.

### Decisions and tradeoffs

- **No screenshots on the site.** They're kept in `results/` as evidence, but putting government
  pages, emblems included, on our own pages would look like borrowed authority (decision 0005, rule
  8). The element's HTML and the transcript carry the evidence instead.
- **Plain template literals instead of a framework.** Eighteen pages don't need one, and with one
  escaping helper the safety rule is easy to see.
- **Layout fixes after looking at it.** Screenshots at 1280 px and 390 px showed dates wrapping
  mid-value and counts separated from their badges on phones. Both fixed.

### Verified

- `npm run check:site`: all 18 pages pass. `npm test`: 69/69.

---

## 2026-11-24: First audit

### What was built

- `src/audit.ts`: runs a portal's steps on a **fresh page**, tags the critical controls, saves the
  screenshot and DOM, then runs names → captcha → lang → transcript → axe → keyboard → pdf and decides
  the verdict. It never throws. A page that doesn't load, an HTTP error, a block page, a failed
  step, a vanished control or a crashed check all become inconclusive reasons. `npm run audit` gives
  each portal its own browser.
- Tests cover the failure paths, which must come out inconclusive and never clean.

### Review of the first run, and what it changed

The first full run gave 4 Blocked, 2 Inconclusive, 8 Barriers found, 1 clean. Per the runbook,
every Blocked verdict and every surprise was checked against the saved `page.html.gz`:

- **The four Blocked verdicts held up.** e-Shram, a PNG CAPTCHA with `alt="Captcha"`; the only
  "listen" on that page is a separate consent-form feature. Aaple Sarkar, an image plus a "Try
  another" link; its CAPTCHA field is also `readonly` until focused and blocks paste. MahaDBT, an image
  with **no `alt` at all** (not an empty one, as discovery suggested) and a Refresh link. MSEDCL, a
  `<canvas>` CAPTCHA. In all four, a search of the saved HTML for audio, speak, volume, listen or
  sound found only Modernizr classes and service names.
- **MSEDCL isn't a text CAPTCHA.** Discovery took `span#lblCaptcha` for a text challenge, but it is
  only the Marathi label "कॅप्चा*". The check was right to flag the canvas. To stop a label like that
  ever passing as a readable challenge, text challenges that only say "captcha" are now ignored.
- **Voters' Services: the CAPTCHA image wasn't recognised.** It sits three levels below
  `div.captcha-div` next to a `<p>Captcha Code</p>` caption, and the detector looked only two levels
  up. It now looks four levels up and at a short caption beside the image.
- **Voters' Services: discovery was wrong about the audio icon.** The saved page shows
  `<i role="button" tabindex="0" aria-label="listen captcha">`, which is focusable and exposed. The
  check correctly reports a reachable audio option. The discovery entry below, learning note 2 and
  the context of decision 0006 had described it as unfocusable. The note was fixed, and 0006 got a
  dated correction (decision records aren't rewritten).
- **DEPwD: the Public Grievance link lives in a closed sub-menu.** Tab alone never reaches links in
  closed menus. Whether that means a barrier depends on how the menu opens. A menu that opens only on
  hover is now reported as a barrier. A menu behind a disclosure button (`aria-expanded`,
  `aria-controls`) is inconclusive, because the walk doesn't press Enter. The names check no longer
  calls a link in a closed menu "hidden from screen readers". DEPwD's menu has a disclosure toggle,
  so it is inconclusive, for an honest reason.
- **NCS: an announcement dialog holds focus on load**, correctly, as a modal should. The task now
  starts by closing it, as a keyboard user would.
- **Shared-page leftovers.** In tests, a failed navigation bled into the next audit. Each audit now
  gets its own page.
- **myAadhaar serves two sites from one address.** The same URL sometimes redirects to
  `myaadhaarbeta.uidai.gov.in` (declares `lang="hi"` on an English page) and sometimes serves the
  regular site (declares `lang="en"`, but its language list uses display names such as
  `lang="हिंदी"` instead of language codes). The portal note now says so. The committed result is
  from the beta.

### Final results (second full run, same code for every portal)

| Verdict | Portals |
| --- | --- |
| Blocked | Aaple Sarkar, e-Shram, MahaDBT, MSEDCL |
| Inconclusive | DEPwD |
| Barriers found | myAadhaar, CPGRAMS, DigiLocker, NCS, NSP, Passport Seva, RTI Online, UDID, Voters' Services |
| No blockers found by automated checks | eCourts |

- **All three Maharashtra portals are Blocked** by an image or canvas CAPTCHA with no audio option,
  and so is e-Shram. Every other central portal with a CAPTCHA (CPGRAMS, eCourts, RTI Online,
  Voters' Services) offers a reachable audio option.
- **Unnamed task controls on 6 of 15** (Aaple Sarkar, MahaDBT, MSEDCL, NSP, Passport Seva, RTI
  Online). Unmarked Indic text or a wrong page language on 4. Scanned PDFs linked from the task page
  on 2 (Aaple Sarkar, UDID).
- Most runs took 3–40 s, mostly the pacing and the keyboard walk.

### Next

The report site, then publishing.

---

## 2026-11-24: Check engine

### What was built

Seven checks in `src/checks/`, each written test-first against fixture pages that copy patterns
seen on real portals during discovery, plus the rule catalogue (`src/rules.ts`) that holds every
rule's severity, WCAG reference and plain-language "why" and "fix".

- **critical.ts**: resolves each portal's critical controls in every frame and tags them
  `data-pahunch-critical="<i>"`, so code running in the page can recognise them.
- **captcha.ts**: finds image and canvas CAPTCHAs (ignoring the speaker and refresh icons beside
  them), the field each goes with, and any audio option. For the audio option it records two
  separate facts: *focusable* (Tab reaches it) and *exposed* (it is, or sits inside, a button or
  link). It also tells third-party widgets and text CAPTCHAs apart, and decides whether the CAPTCHA
  is on the task path.
- **names.ts**: reads each critical control's role and name from Playwright's aria snapshot.
  Flags hidden controls, controls with the wrong role (the clickable `div`), and names with no
  letters or digits in them (the `********` placeholder).
- **lang.ts**: counts Indic characters a screen reader would read and how many sit under no Indic
  `lang`. Also flags a page that declares an Indic language but is written in English.
- **keyboard.ts**: presses Tab through the page, follows focus into iframes, records where it goes,
  and judges reachability, traps and focus visibility for the critical controls.
- **pdf.ts**: fetches up to five linked PDFs (HEAD first, to check size), reads the text of the first
  five pages with pdf.js, and checks the tagged flag.
- **axe.ts**: axe-core with the WCAG 2.1 A/AA tags. "Incomplete" results are kept but never counted.
- **transcript.ts**: turns the aria snapshot into roughly what NVDA would say ("Login, button",
  "edit, no name").

### Problems and how they were solved

- **How to tell "went all the way round" from "stuck in a loop".** A probe showed that in headless
  Chromium, after the last element focus leaves the document (`document.hasFocus()` becomes
  false), then wraps to the first element. So a cycle that passes through that "end" state and comes
  back to its first stop is complete. A cycle that returns without passing through it is a trap,
  unless focus is inside `[aria-modal="true"]` or `dialog[open]`, where holding focus is correct.
  That case makes the task inconclusive instead. A sliding window of the last 40 stops catches
  loops that don't include the first stop.
- **Focus visibility without screenshots.** Before the walk, the check stores a style signature
  (outline, box-shadow, border, background, colour, text decoration) for every focusable element and
  its parent. During the walk, a focused element counts as visibly focused if it has a non-zero
  outline, or if its signature or its parent's has changed. This handles the `outline: none` pages
  and accepts `box-shadow` focus styles.
- **pdfjs-dist 6 removed `isEvalSupported`.** The security doc relied on turning it off to close
  the CVE-2024-4367 path. In version 6 that eval-based font path no longer exists, so the option is
  gone. `destroy()` also moved to the loading task. Code and `docs/security.md` were updated to match.
- **Hook ordering in `node:test`.** A second top-level `before()` didn't wait for the harness's
  own, so per-test setup now happens inside the tests. Noted in troubleshooting.

### Decisions

- **Blocker criteria narrowed and sharpened** ([0006](decisions/0006-what-counts-as-a-blocker.md)).
  An unlabelled field is a barrier, not a blocker, because the visible text next to it usually gives
  the answer and the claim has to survive pushback. An audio option that is neither focusable nor
  exposed counts as no option at all, so it is a blocker on the task path.
- **Audio CAPTCHA controls are owned by the captcha check.** The names and keyboard checks keep
  them as evidence only, so one problem isn't counted three times.
- **Indic text threshold of 30 characters.** Below it (typically a lone "हिन्दी" link) the finding
  is info. Above it, real content is being misread.

### Verified

- `npm test`: 55/55. `npm run typecheck`: clean.

### Next

Phase 3: the audit runner (`src/audit.ts` and `npm run audit`), which runs a portal's steps, every
check and the verdict, and writes `results/<date>/<portal>/`. Then run all fifteen portals and
review every Blocked verdict by hand against the saved HTML.

---

## 2026-11-24: Portal discovery

### What was built

- `src/browser/session.ts`: one Chromium context with the tool named in the user agent
  (`… pahunch/0.1.0 (+https://github.com/DevGurav/pahunch)`), `en-IN` locale, IST timezone and a
  1366×768 viewport, which is common on Indian laptops. `pace()` enforces the 5-second gap between
  loads. `recordRobots()` fetches and matches robots.txt and never throws. `settle()` waits for
  network idle but gives up after 10 s, because analytics beacons on some portals never go quiet.
  The `__name` shim for tsx is added to every frame through an init script.
- `npm run discover -- <url>`: prints every visible input and its label, buttons with where they
  lead, CAPTCHA candidates, anything that looks like an audio option, links to login, apply and
  contact pages, frames, Indic text count and PDF links. Full JSON and a screenshot go to `tmp/`.
- `src/portals/`: fifteen task definitions, 12 central and 3 Maharashtra, plus a list of the
  portals left out and why.

### What discovery showed

Looking at real pages before writing the checks changed the design in several places:

- **Placeholders become names.** `<input placeholder="Enter UserName">` gets the accessible name
  "Enter UserName" from the browser. MahaDBT's password field has the placeholder `********`, so a
  screen reader announces the field's name as eight stars. The names check therefore flags names
  that contain no letters or digits, not just empty ones.
- **Clickable `div`s are common.** Passport Seva's Continue button is a `div` with `tabindex="0"`
  and a click handler (the page is built with React Native Web). Tab can reach it, but the
  accessibility snapshot shows plain text, `text: Continue`, with no role. That calls for a
  separate `role-missing` rule, distinct from "unreachable".
- **Audio options can exist and still be unusable.** On the Voters' Services portal the audio
  CAPTCHA is an `<i aria-label="listen captcha">` icon. It isn't focusable, and an `aria-label` on
  an element with no role is ignored, so the icon is absent from the accessibility tree. A sighted
  mouse user sees an audio option; a blind keyboard user doesn't. The CAPTCHA check has to look
  at whether the alternative can be reached and is exposed, not just whether it exists.
- **`alt=""` hides the CAPTCHA entirely.** MahaDBT and RTI Online mark their CAPTCHA images as
  decorative. The screen reader skips the image and lands on an unlabelled text box.
- **A page can declare the wrong language.** The myAadhaar beta declares `lang="hi"` on an English
  page, so every English word would be read with a Hindi voice. The lang check needs a rule for
  the page-level mismatch as well as for unmarked Indic phrases.
- **Pop-ups on load.** Passport Seva's home page opens an announcement modal that intercepts every
  click, and the myAadhaar beta is dimmed by an overlay. Portal steps gained a `press Escape` kind,
  and the keyboard check must tell a focus trap from focus correctly held inside an open dialog.
- **Good practice exists.** eCourts and CPGRAMS both pair their image CAPTCHA with a real,
  focusable audio control, and eCourts' CAPTCHA image has a descriptive `alt`. The audit has to be
  able to say "this one is fine".

### Portals left out

Four portals refused the automated browser, and per [0005](decisions/0005-scanning-rules.md) they
are recorded and left out rather than worked around: IRCTC (`ERR_HTTP2_PROTOCOL_ERROR`, twice),
the EPFO member portal and PM-KISAN (both "The URL you requested has been blocked"), and the income
tax e-filing login (no response in 60 s, twice). RTI Online, e-Shram and MSEDCL's bill page took
their places. The list lives in `src/portals/index.ts` and will be shown on the report's methodology
page.

### Decisions and tradeoffs

- **Critical controls use Playwright selectors, not plain CSS.** Several controls have no id, and
  `:has-text()` or `>> visible=true` locate them robustly. Before the checks run, each resolved
  element gets a `data-pahunch-critical` attribute so code running in the page can recognise it.
  That attribute only exists in our browser's copy of the page.
- **Voters' Services: two selectors use `aria-label` attributes.** It's the only stable hook on
  that page. This doesn't bias the results, because the checks read the computed name and role from
  the browser, not from the selector.
- **Portals are grouped in two files** (`central.ts`, `maharashtra.ts`) instead of one file each.
  Fifteen tiny files added navigation without adding clarity.

### Verified

- `npm run typecheck` clean. CI green on the first push (31 s).
- Each portal's task page loaded once and its controls were confirmed by eye from the discover
  output and screenshots.

### Next

Phase 2: the rule catalogue and the checks, each test-first against fixture pages that copy the
patterns above.

---

## 2026-11-24: Bootstrap

### Why this project

The aim was a serious, real-world problem that runs on a laptop at no cost and leads to something
that can be fixed. The shortlist covered several fields: digital-arrest scams aimed at older people,
court delays (from the Development Data Lab's 80 million eCourts records), onion prices at Maharashtra
mandis, snakebite travel times, generic medicine prices, unregistered loan apps, and groundwater in
Marathwada. Government websites and blind users won because:

- **The gap is old.** The last large audit (CIS, 2016) tested 7,800 government sites against WCAG
  2.0. About 75% of them had barriers. Nothing comparable has been published against WCAG 2.1,
  which GIGW 3.0 now adopts.
- **The law is clear.** The RPwD Act 2016 and GIGW 3.0 both require accessible government services.
  In April 2025 the Supreme Court held that digital access is part of Article 21 (*Pragya Prasun v.
  Union of India*).
- **The output can be fixed.** A finding like "the Login button is a `<div>` with no name" comes with
  an exact fix a web team can apply in an afternoon.
- **No special data is needed.** The data is the public web, loaded the way a browser loads it.

### Decisions

- **Automated checks only, for now** ([0001](decisions/0001-automated-checks-only.md)). No manual
  screen-reader testing in this round. Every finding is labelled as automated, and the best verdict
  is "no blockers found by automated checks", never "accessible".
- **TypeScript, Playwright, axe-core, pdf.js** ([0002](decisions/0002-typescript-playwright-axe.md)).
  axe-core is a JavaScript library, and Playwright gives us real rendering, frames and an
  accessibility snapshot. Staying in JS avoids a glue layer.
- **CI never scans live sites** ([0003](decisions/0003-no-live-scans-in-ci.md)). Many government
  sites block foreign datacenter IPs, and scanning on every push would add load for no reason.
- **Verdicts, not scores** ([0004](decisions/0004-verdicts-not-scores.md)). A score of 92/100 can
  hide an image CAPTCHA that stops a blind user completely.
- **Scanning rules** ([0005](decisions/0005-scanning-rules.md)). Public pages only, a fixed list of
  task URLs, no logins or submissions, paced loads, the tool named in the user agent, and robots.txt
  recorded. If a portal blocks automated browsing, it is left out rather than worked around.

### What was built

- npm project: `playwright` 1.65, `@axe-core/playwright` 4.14, `pdfjs-dist` 6.5, `tsx` 4.23;
  `typescript` 7.0 and `pdf-lib` for test fixtures. No build step: tsx runs the TypeScript directly,
  and `tsc --noEmit` only typechecks.
- `src/types.ts`: `Finding`, `Severity`, `Verdict`.
- `src/verdict.ts`: the precedence rule. A blocker wins over everything, and anything left unchecked
  outranks barriers, because the unchecked part might hold a blocker.
- `src/browser/robots.ts`: an RFC 9309 matcher (longest match wins, Allow wins ties, `*` and `$`
  supported). It only records the answer, because the tool doesn't crawl.
- The playbook's document set, decision records 0001–0005, and the first learning note.

### Problems and tradeoffs

- **TypeScript 7 is the new native compiler.** Defaults changed from 5.x. `types` must now be listed
  explicitly (`["node"]`), so tsconfig spells out every option instead of relying on defaults.
- **`.ts` import extensions.** Because nothing is emitted, imports use `.ts` extensions
  (`allowImportingTsExtensions`). That's clearer to read than `.js` paths that point at files which
  don't exist.

### Verified

- `npm run typecheck`: clean.
- `npm test`: 15/15 (verdict precedence: 6; robots matching: 9).

### Next

Phase 1: the browser session and `npm run discover`, then load each candidate portal once to
confirm its task page and critical controls before writing the checks. Seeing real CAPTCHAs and
login forms first keeps the detectors honest.
