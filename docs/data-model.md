# Result format

Results are files, not a database. A run writes one folder per portal:

```text
results/
  2026-11-24/
    passport/
      result.json       the verdict, findings and critical-control table (below)
      axe.json          raw axe-core output (violations and incomplete)
      transcript.txt    "what a screen reader would hear", from the accessibility tree
      screenshot.jpg    the viewport at the end of the task steps
      page.html.gz      the DOM at the end of the task steps, gzipped, as evidence
```

Past folders are never edited. The report reads the newest date for each portal.

## `Finding`

Defined in `src/types.ts`.

| Field | Type | Notes |
| --- | --- | --- |
| `check` | `'axe' \| 'captcha' \| 'keyboard' \| 'names' \| 'lang' \| 'pdf'` | |
| `rule` | string | A rule id from `src/rules.ts`, or `axe/<axe rule id>` |
| `severity` | `'blocker' \| 'barrier' \| 'info'` | |
| `wcag` | string[] | Success criteria, e.g. `["1.1.1"]` |
| `summary` | string | One plain-language line about this instance |
| `target` | string? | CSS selector, control label or URL |
| `snippet` | string? | Truncated outerHTML. **Untrusted.** |
| `frameUrl` | string? | Set when the element is inside an iframe |
| `details` | object? | Check-specific extras |

## Verdicts

`blocked > inconclusive > barriers > no-blockers-found`. See `src/verdict.ts` and
[0004](decisions/0004-verdicts-not-scores.md).

## `result.json`

*Draft. The full shape is fixed in Phase 3 together with the audit runner, and this page will be
updated in the same change.* It will hold the portal metadata, start and end times, the tool,
browser and axe-core versions, the robots.txt record, the per-check findings, the
critical-control table (found, keyboard-reachable, accessible name, role), any reasons the task was
inconclusive, and the verdict.
