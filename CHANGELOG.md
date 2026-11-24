# Changelog

Notable changes, newest first. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Project scaffold: TypeScript on Node run with tsx, Playwright, axe-core, pdf.js.
- Verdict logic (`blocked > inconclusive > barriers > no-blockers-found`) and a robots.txt matcher,
  with unit tests.
- Project documents and the first five decision records.
- CI running typecheck and tests on every push.
