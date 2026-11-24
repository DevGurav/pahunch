# Contributing

## Setup

Node 22 or later (CI uses 24).

```sh
npm ci
npx playwright install chromium
```

## Before every commit

```sh
npm run typecheck
npm test
```

Both must pass. If you touched the report, also run `npm run report` and `npm run check:site`.

## Commits

- Conventional subject, imperative, lowercase, no full stop: `feat(checks): detect canvas captchas`.
- Types: `feat fix refactor perf test docs build chore ci`.
- Most commits are subject-only. Add one or two lines of body only when the reason isn't obvious.
  Longer reasoning belongs in `docs/build-log.md` or a decision record.
- One logical change per commit. Stage files on purpose, not with `git add -A`.

## Definition of done

- [ ] Typecheck and tests green
- [ ] `docs/build-log.md` has an entry, and every doc the change made wrong is fixed
- [ ] A new decision has a new record in `docs/decisions/`
- [ ] `docs/roadmap.md` shows the new state
- [ ] Committed and pushed

## Adding a portal

1. Run `npm run discover -- <task page url>` and read the output: forms, inputs, buttons, CAPTCHA
   candidates, frames, PDF links, robots.txt.
2. Add `src/portals/<id>.ts` with the URLs, the task steps (navigation and opening public dialogs
   only) and the task's critical controls, found by CSS selector.
3. Register it in `src/portals/index.ts`.
4. Run `npm run audit -- --portal <id> --headed` and check the result by eye before committing it.

## Adding a check

1. Add the rule ids, with severity, WCAG references and the "why" and "fix" text, to `src/rules.ts`.
2. Add a fixture page with the problem and a clean one under `test/fixtures/`, and write the test
   first.
3. Implement the check in `src/checks/<name>.ts`, wire it into `src/audit.ts`, and document it in
   `docs/data-model.md`.

## Scanning rules

Read `docs/decisions/0005-scanning-rules.md` before changing anything that loads a live site.
