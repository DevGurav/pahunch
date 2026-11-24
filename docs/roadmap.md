# Roadmap

State markers: **[done]**, **[in progress]**, **[not started]**. Update them in the same change that
moves them.

## Phase 0: Bootstrap [done]

- [done] Scaffold: TypeScript on Node with tsx, Playwright, axe-core, pdf.js
- [done] Verdict logic and robots.txt matcher, with tests
- [done] Project documents and decision records 0001–0005
- [done] CI: typecheck and tests on every push
- [done] Public repository: github.com/DevGurav/pahunch

## Phase 1: Portal discovery [done]

- [done] Browser session: pacing, user agent with the tool's name, robots.txt recorded
- [done] `npm run discover`: forms, controls, CAPTCHA candidates, audio options, links, frames,
  PDF links
- [done] Each candidate's task page loaded once to confirm the URL, the critical controls and any
  blocking
- [done] 15 portals defined in `src/portals/`. Central: UDID, DEPwD, CPGRAMS, Passport Seva,
  myAadhaar, DigiLocker, NSP, Voters' Services, eCourts, NCS, RTI Online, e-Shram. Maharashtra:
  Aaple Sarkar, MahaDBT, MSEDCL.
- [done] Left out because they block automated browsing: IRCTC, EPFO member portal, PM-KISAN,
  income tax e-filing login

## Phase 2: Check engine [done]

Each check was built test-first against a fixture with the problem and a clean one. 55 tests.

- [done] Rule catalogue (`src/rules.ts`) and blocker criteria ([0006](decisions/0006-what-counts-as-a-blocker.md))
- [done] Critical controls tagged across frames
- [done] captcha: image-only CAPTCHA, an audio option that can't be reached, third-party and text CAPTCHAs, task path or not
- [done] names: critical controls with no usable name or no role
- [done] lang: unmarked Indic text; a page declaring the wrong language
- [done] keyboard: controls the Tab key can't reach, traps (distinguished from modal dialogs), invisible focus
- [done] pdf: scanned PDFs with no text; untagged PDFs
- [done] axe: WCAG 2.1 A/AA rules
- [done] transcript: "what a screen reader would hear", from the aria snapshot
- [done] Learning notes 2–4: CAPTCHAs, `lang`, what automated checks can't see

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
