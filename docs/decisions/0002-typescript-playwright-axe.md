# 0002: TypeScript on Node, Playwright, axe-core, pdf.js

Status: accepted (2026-11-24)

## Context

Government portals are often single-page apps (Angular, React) or heavy jQuery pages. A useful check
has to see the page after scripts run, inside frames, the way a browser builds it. We also want the
browser's own view of roles and accessible names, a mature WCAG rule engine, and PDF text
extraction.

## Decision

- **Runtime:** Node (22+, CI on 24) with TypeScript, run directly by tsx. No build step; `tsc
  --noEmit` typechecks.
- **Browser:** Playwright with Chromium, for real rendering, frame handling, keyboard input, and
  `ariaSnapshot()` to read roles and accessible names.
- **Rules engine:** axe-core through `@axe-core/playwright`, limited to the WCAG 2.1 A and AA tags.
- **PDFs:** pdf.js (`pdfjs-dist`) to read text layers and the "marked" flag of tagged PDFs.
- **Tests:** Node's built-in test runner (`node:test`) through `tsx --test`.

## Consequences

- axe-core is a JavaScript library, and Playwright's best API is its JS one. One language end to
  end means no glue layer.
- Results describe Chromium, so Chrome and Edge users. Firefox can build a slightly different
  accessibility tree, and that isn't covered.
- tsx's esbuild output can wrap functions in a `__name` helper that breaks `page.evaluate`. The
  session shims it (see troubleshooting).

## Alternatives considered

- **Python with Playwright, injecting axe-core.** Works, but axe stays JavaScript and the glue grows.
- **Puppeteer.** Chromium-only too, with less convenient frame and locator handling and no aria
  snapshot.
- **Lighthouse.** Built around a 0–100 score (see 0004) and runs only part of axe.
- **pa11y.** A good runner for page-level scans, but our checks are task-shaped. They need critical
  controls, keyboard walks and frames, which would mean working around its model.
