# Roadmap

State markers: **[done]**, **[in progress]**, **[not started]**. Update them in the same change that
moves them.

## Phase 0: Bootstrap [in progress]

- [done] Scaffold: TypeScript on Node with tsx, Playwright, axe-core, pdf.js
- [done] Verdict logic and robots.txt matcher, with tests
- [done] Project documents and decision records 0001–0005
- [in progress] CI: typecheck and tests on every push
- [not started] Public repository on GitHub

## Phase 1: Portal discovery [not started]

- [not started] Browser session: pacing, user agent with the tool's name, robots.txt recorded
- [not started] `npm run discover`: forms, controls, CAPTCHA candidates, frames, PDF links
- [not started] Load each candidate portal's task page once and confirm the URL, the critical
  controls, and whether automated browsing is blocked
- [not started] `src/portals/*.ts` for every portal that can be checked

Candidate portals (central): UDID / Swavlamban Card, Department of Empowerment of Persons with
Disabilities, CPGRAMS, Passport Seva, myAadhaar, income tax e-filing, IRCTC, DigiLocker, National
Scholarship Portal, the Voters' Service Portal, eCourts services, the EPFO member portal and the
National Career Service. Maharashtra: Aaple Sarkar and MahaDBT. A portal that blocks automated
browsing or has moved is replaced, and the reason goes in the build log.

## Phase 2: Check engine [not started]

Each check is built test-first against a fixture with the problem and a clean one.

- [not started] Rule catalogue (`src/rules.ts`)
- [not started] captcha: image-only CAPTCHA with no audio alternative
- [not started] names: critical controls with no accessible name or no role
- [not started] lang: Indic text with no matching `lang`
- [not started] keyboard: critical controls the Tab key can't reach, traps, invisible focus
- [not started] pdf: scanned PDFs with no text layer; untagged PDFs
- [not started] axe: WCAG 2.1 A/AA rules
- [not started] transcript: "what a screen reader would hear", from the accessibility tree

## Phase 3: Run the audit [not started]

- [not started] Audit runner and CLI
- [not started] Run every portal; check the evidence for each Blocked verdict by hand
- [not started] Commit dated results

## Phase 4: Report site [not started]

- [not started] Scorecard, one page per portal, methodology and limits, where to send the findings
- [not started] The report passes its own checks (`npm run check:site`) in CI
- [not started] Published on GitHub Pages

## Phase 5 (optional): Real screen-reader runs [not started]

Drive NVDA through Guidepup on a Windows machine to upgrade some findings from "automated" to
"screen-reader run". This needs NVDA installed on the machine, so it only happens with the owner's
agreement. It would supersede part of decision 0001.
