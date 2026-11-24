# Architecture

pahunch loads a fixed set of public pages from government portals in a real browser, runs checks on
the page as the browser built it, turns the findings into one verdict per task, writes dated results
to disk, and builds a static report from those results.

## Data flow

```text
src/portals/*.ts           what to load, the task steps, which controls the task needs
        │
        ▼
src/browser/session.ts     one Chromium context, one page; pacing; robots.txt recorded
        │  task steps: goto / click-to-open-dialog only
        ▼
src/checks/*.ts            captcha · names · lang · transcript · axe · keyboard · pdf
        │  Finding[] + evidence per check
        ▼
src/verdict.ts             blocked > inconclusive > barriers > no-blockers-found
        │
        ▼
results/<date>/<portal>/   result.json · axe.json · transcript.txt · screenshot.jpg · page.html.gz
        │
        ▼
src/report/build.ts        site/ (static HTML), published by CI to GitHub Pages
```

## Components

| Component | Responsibility | Status |
| --- | --- | --- |
| `src/types.ts` | `Finding`, `Severity`, `Verdict` | done |
| `src/verdict.ts` | Findings and unchecked parts → one verdict | done |
| `src/browser/robots.ts` | Records whether a task URL is disallowed (RFC 9309 matching) | done |
| `src/rules.ts` | Single catalogue of rule ids: severity, WCAG, title, why, fix | done |
| `src/checks/critical.ts` | Resolves critical controls in every frame and tags them `data-pahunch-critical` | done |
| `src/checks/aria.ts` | Parses Playwright's aria snapshot lines | done |
| `src/browser/session.ts` | Launches Chromium, names the tool in the user agent, paces loads, records robots.txt | done |
| `src/portals/` | Task definitions (`central.ts`, `maharashtra.ts`) and the list of portals left out (`index.ts`) | done |
| `src/cli/discover.ts` | Prints forms, labels, buttons, CAPTCHA and audio candidates, key links and frames for a page | done |
| `src/checks/` | `captcha`, `names`, `lang`, `keyboard`, `pdf`, `axe`, `transcript`, one per file | done |
| `src/audit.ts`, `src/cli/audit.ts` | Runs a portal's steps and checks, writes results | planned (Phase 3) |
| `src/report/` | Static site from results | planned (Phase 4) |
| `src/cli/check-site.ts` | Runs the same checks against the report site itself | planned (Phase 4) |

## Key invariants

1. **No side effects on live sites.** Task steps are `goto` or a click that opens a public dialog
   or menu. Nothing is typed into a live form, nothing is submitted, and no CAPTCHA is attempted.
2. **Sequential and paced.** One page at a time, with at least 5 seconds between loads on the same
   portal and about 10 loads per portal per run at most.
3. **Untrusted content stays data.** Text, names, snippets and URLs from scanned pages are stored
   as data and escaped when rendered. The report never includes raw page HTML.
4. **Results are append-only.** A run writes a new `results/<date>/` folder. The report reads the
   newest result for each portal.
5. **Honest wording.** "No blockers found" is the best verdict there is. Nothing is ever called
   accessible.

## Critical controls

A task is defined by the controls a person must use to finish it, such as the Aadhaar number field,
the CAPTCHA field and the Login button. Each one is located by a **Playwright selector** (CSS, plus
`:has-text()`, `>> visible=true` and similar), never by its computed accessible name, because a
missing name is one of the things we are testing for. Before the checks run, each resolved element
is tagged with `data-pahunch-critical="<index>"` in our browser's copy of the page, so code running
inside the page can recognise it. The keyboard and names checks report on each critical control.
If a selector matches nothing, the portal definition is out of date and the task becomes
inconclusive rather than clean.

## Frames

Login forms sometimes live in iframes. The checks that inspect the DOM run in every frame, and each
finding records the frame's URL. The keyboard check follows focus into frames by asking each frame
which element it has focused.

## Code that runs in the page

Functions passed to `page.evaluate` are serialised and run in the browser. They can't use imports
or Node values. tsx compiles our TypeScript with esbuild, which may wrap functions with a
`__name(...)` helper that doesn't exist in the page, so the session adds a tiny shim for it to
every page. See `docs/troubleshooting.md`.
