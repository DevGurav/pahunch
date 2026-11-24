# Changelog

Notable changes, newest first. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Checks: captcha, names, lang, keyboard, pdf, axe, and a screen-reader transcript, each tested
  against fixture pages.
- Rule catalogue with plain-language "why" and "fix" text; blocker criteria (decision 0006).
- Fifteen portal task definitions and the list of portals left out for blocking automated browsers.
- `npm run discover` for inspecting a new portal.
- Browser session with pacing, the tool named in the user agent, and robots.txt recorded.
- Project scaffold: TypeScript on Node run with tsx, Playwright, axe-core, pdf.js.
- Verdict logic (`blocked > inconclusive > barriers > no-blockers-found`) and a robots.txt matcher,
  with unit tests.
- Project documents and the first five decision records.
- CI running typecheck and tests on every push.
