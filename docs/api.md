# Command-line interface

pahunch has no network API. Its interface is four npm scripts. This page is the contract for them.
Arguments go after `--`.

## `npm run discover -- <url> [--click <selector>] [--headed]`

Loads one page and prints what's needed to write a portal definition: final URL and HTTP status,
title, `<html lang>`, frames, forms with their inputs and labels, buttons, CAPTCHA candidates,
Indic text count, PDF links, and the robots.txt result. A screenshot goes to `tmp/discover/`
(gitignored). `--click` opens a public dialog first, for example a "Login" button that opens a modal.
It never types into or submits anything.

## `npm run audit -- (--portal <id> | --all) [--headed] [--out <dir>]`

Runs each portal's task steps and every check, then writes `<out>/<YYYY-MM-DD>/<portal-id>/`
(default out: `results`). Portals run one after another. Exit code: 0 when every portal produced a
result, including Blocked and Inconclusive verdicts; 1 on a usage error or a crash.

## `npm run report [-- --results <dir> --out <dir>]`

Builds the static report from the newest result for each portal. Defaults: `results` → `site`.

## `npm run check:site [-- --site <dir>]`

Serves the built report locally and runs the checks on every page. Exit code 1 if any page has a
blocker or a serious or critical axe violation. CI runs this before publishing.

*Status: `discover` lands in Phase 1, `audit` in Phase 3, `report` and `check:site` in Phase 4.*
