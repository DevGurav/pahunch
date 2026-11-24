# Build log

Newest first. Each entry covers what was built and why, what went wrong, the tradeoffs, what was
verified, and what comes next.

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
