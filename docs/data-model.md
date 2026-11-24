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

## Rule catalogue

The source of truth is `src/rules.ts`, which holds each rule's title, its "why" and its "fix". Blocker
criteria are in [0006](decisions/0006-what-counts-as-a-blocker.md).

| Rule | Check | Default severity | WCAG | Raised to blocker when | Lowered when |
| --- | --- | --- | --- | --- | --- |
| `captcha-image-only` | captcha | blocker | 1.1.1 | | not on the task path → barrier |
| `captcha-audio-unreachable` | captcha | barrier | 1.1.1, 2.1.1, 4.1.2 | the audio option is neither focusable nor exposed, on the task path | |
| `captcha-with-audio` | captcha | info | 1.1.1 | | |
| `captcha-third-party` | captcha | info | 1.1.1 | | |
| `captcha-text` | captcha | info | 1.1.1 | | |
| `keyboard-unreachable` | keyboard | blocker | 2.1.1 | (only after a complete Tab cycle) | |
| `keyboard-trap` | keyboard | blocker | 2.1.2 | | every critical control was reached → barrier |
| `keyboard-focus-invisible` | keyboard | barrier | 2.4.7 | | |
| `name-missing` | names | barrier | 4.1.2, 1.3.1 | | |
| `role-missing` | names | barrier | 4.1.2 | | |
| `lang-indic-unmarked` | lang | barrier | 3.1.2 | | fewer than 30 characters → info |
| `lang-page-wrong` | lang | barrier | 3.1.1 | | |
| `pdf-scanned` | pdf | barrier | 1.1.1 | | |
| `pdf-untagged` | pdf | info | 1.3.1 | | |
| `axe/<rule id>` | axe | barrier for critical or serious impact, info otherwise | from axe tags | never | |

## Evidence per check

Each check also returns raw evidence, which `result.json` stores next to its findings:

| Check | Evidence |
| --- | --- |
| captcha | `groups[]`: kind (image, canvas, text, third-party, unknown), `onPath`, `imageAlt`, the audio option (`focusable`, `exposed`, description), snippet |
| names | `controls[]`: role and name as computed, `disabled`, `hidden`, the first lines of the aria snapshot |
| lang | `frames[]`: `htmlLang`, Indic characters total and unmarked, Latin and Indic counts under `<html lang>`, samples |
| keyboard | presses, `completedCycle`, `inModal`, `trap`, per-control `reached`, `firstStep` and `focusVisible`, and the focus sequence (first 400 stops) |
| pdf | `pdfs[]`: URL, HTTP status, bytes, pages, text characters, `tagged`, result (text, scanned, not-pdf, too-large, error) |
| axe | axe-core version, violations and incomplete (first 10 nodes each), number of passes |

## Verdicts

`blocked > inconclusive > barriers > no-blockers-found`. See `src/verdict.ts` and
[0004](decisions/0004-verdicts-not-scores.md). Checks can report parts they couldn't decide through
`inconclusive[]`, such as a keyboard walk stuck in an open dialog. Any entry makes the task at best
inconclusive.

## `result.json`

*Draft. The full shape is fixed in Phase 3 together with the audit runner, and this page will be
updated in the same change.* It will hold the portal metadata, start and end times, the tool,
browser and axe-core versions, the robots.txt record, the per-check findings, the
critical-control table (found, keyboard-reachable, accessible name, role), any reasons the task was
inconclusive, and the verdict.
