# Working in this repo

Operating notes: commands, conventions, and the rules that must not be broken. Keep this short and
current.

## Commands

| Task | Command |
| --- | --- |
| Install | `npm ci`, then `npx playwright install chromium` |
| Typecheck | `npm run typecheck` |
| Tests (local fixtures, no network) | `npm test` |
| Inspect a candidate portal page | `npm run discover -- <url>` |
| Audit one portal / all | `npm run audit -- --portal <id>` / `npm run audit -- --all` |
| Build the report site | `npm run report` |
| Check the report site itself | `npm run check:site` |

## Rules that must not be broken

1. Never log in, submit a form, solve a CAPTCHA, or work around a block on a live portal. Task steps
   may only navigate and open public dialogs. See `docs/decisions/0005-scanning-rules.md`.
2. Live portals are never scanned from CI. Audits run from a machine on an Indian network.
3. Everything taken from a scanned page (text, accessible names, HTML snippets, URLs) is untrusted.
   It is escaped before it reaches the report.
4. `results/<date>/` is history. Never edit a past result; re-run and add a new date.
5. Never write "accessible" for a clean run. The wording is "no blockers found by automated checks",
   and every finding carries the automated-only label.

## Conventions

- TypeScript, ESM, run with tsx; no build step. Relative imports use `.ts` extensions.
- Code passed to `page.evaluate` runs in the browser. It must be self-contained: no imports and no
  closures over Node values. Pass data in as the argument.
- One check per file in `src/checks/`. A check returns `Finding[]` plus its own evidence object.
- Rule ids, severities, WCAG references and the "why" and "fix" text live in `src/rules.ts` only.
- Each check has a fixture with the problem and a clean one in `test/fixtures/`.
- Commit subjects are short conventional ones (`feat(checks): ...`). Reasoning goes in the docs.

## Where the truth lives

- Design: `docs/architecture.md`. Decisions: `docs/decisions/`. Progress: `docs/roadmap.md`.
- Result format: `docs/data-model.md`. Rule catalogue: `src/rules.ts`.
- Known footguns: `docs/troubleshooting.md`.
