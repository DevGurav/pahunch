# Changelog

Notable changes, newest first. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-24

### Added

- First audit of 15 portals (`results/2026-11-24/`): 4 Blocked, 1 Inconclusive, 9 Barriers found,
  1 No blockers found.
- Report site on GitHub Pages, checked by the tool itself in CI before every deploy.
- `npm run audit`, `npm run report` and `npm run check:site`.
- Learning note 5: reading WCAG and GIGW.

### Fixed

- CAPTCHA images nested deep under their container, or captioned beside it, are now found.
- A label such as "कॅप्चा*" is no longer taken for a readable text CAPTCHA.
- Links in closed menus: a hover-only menu is a barrier, a menu behind a disclosure button is
  inconclusive, and neither is called "hidden from screen readers".

### Added before the first run

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
