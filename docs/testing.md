# Testing

## Levels

| Level | What | Where | Network |
| --- | --- | --- | --- |
| Unit | Pure logic: verdict precedence, robots matching, transcript formatting, report escaping | `test/*.test.ts` | none |
| Check integration | Each check runs in real Chromium against a fixture page served from `test/fixtures/` by a local server. Every check has a page with the problem and a clean page. | `test/checks/*.test.ts` | localhost only |
| Audit runner | A whole portal audit against fixtures: a Blocked verdict and all five result files; a page that doesn't load, an HTTP error and a vanished control all come out inconclusive, never clean | `test/audit.test.ts` | localhost only |
| Report | The report builder turns a fake result into HTML. Hostile snippets and names come out escaped, our marker attribute is stripped, Marathi is marked `lang="mr"` | `test/report.test.ts` | none |
| Dogfood | The report site is checked by the tool itself: no blockers and no barriers, including serious or critical axe violations | `npm run check:site` | localhost only |

Live portals are **not** tested in CI ([0003](decisions/0003-no-live-scans-in-ci.md)). An audit run
is an operation, not a test. Its output is checked by hand before results are committed
([runbook](runbook.md)).

## Running

```sh
npm run typecheck
npm test                  # all unit and check tests
npx tsx --test test/verdict.test.ts   # a single file
```

Green means typecheck is clean and every test passes. Check tests need Chromium
(`npx playwright install chromium`).

## Fixture rules

- One problem per fixture, named after it: `captcha-image-only.html`, `lang-ok.html`.
- No external resources. Fixtures must not fetch anything from the internet; use data URIs.
- PDF fixtures are generated at test time with pdf-lib, so the repo doesn't hold binary blobs
  whose origin can't be seen.

## Not tested, on purpose

- **Live portals.** They change without notice, and CI can't reach many of them.
- **Real screen-reader output.** The transcript comes from Chromium's accessibility tree through
  Playwright. NVDA's speech may differ. See roadmap Phase 5.
- **Firefox and Safari.** Results describe Chromium (Chrome and Edge users), which is what most
  screen-reader users in India pair with NVDA on Windows. That's a common pattern, not a measured
  fact.
