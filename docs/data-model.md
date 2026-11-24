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

## `result.json` (schema 1)

Defined as `PortalResult` in `src/audit.ts`.

| Field | Notes |
| --- | --- |
| `schema` | `1`. Bump it if a field changes meaning. |
| `portal` | `id`, `name`, `owner`, `jurisdiction`, `task`, `notes`, copied from the definition at run time |
| `startedAt`, `finishedAt` | ISO 8601, UTC |
| `tool` | pahunch version, full user agent, Chromium version, axe-core version |
| `pages[]` | Each page the steps loaded: requested URL, final URL after redirects, HTTP status, title |
| `robots` | robots.txt URL, status, and whether the first task URL was disallowed. Recorded, not obeyed ([0005](decisions/0005-scanning-rules.md)) |
| `critical[]` | One row per critical control: `label`, `kind`, `selector`, `found`, `frameUrl`, plus `role`, `name`, `disabled` from the names check and `reached`, `focusVisible` from the keyboard check |
| `verdict` | `blocked`, `inconclusive`, `barriers` or `no-blockers-found` |
| `inconclusiveReasons[]` | Why part of the task couldn't be checked |
| `findings[]` | Every `Finding`, from every check |
| `counts` | Findings by severity |
| `evidence` | Per-check evidence (see above). axe is summarised here; the full output is in `axe.json` |
| `errors[]` | Checks that crashed. Each also adds an inconclusive reason |

The steps stop at the first failure (page not loading, HTTP 4xx or 5xx, a block page, a failed
click). The result is then written with whatever was gathered, and the verdict is inconclusive.
