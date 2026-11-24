# Troubleshooting

## `ReferenceError: __name is not defined` inside `page.evaluate`

tsx compiles with esbuild, which can wrap named functions in a `__name(fn, "name")` helper. When
Playwright serialises a function into the page, the helper isn't there. The browser session adds an
init script that defines `globalThis.__name` as a pass-through in every frame. If you create a page
or context yourself in a test, go through `openSession()` or add the same init script.

## `browserType.launch: Executable doesn't exist`

Run `npx playwright install chromium`. CI runs `npx playwright install --with-deps chromium`.

## A portal times out or returns 403, "Access Denied", or a bot challenge

Check from a normal browser on the same network first. If it works there but not in the audit, the
site is blocking automated browsing. Record it in the build log and leave the portal out. Don't
change the user agent or use other tricks to get past it ([0005](decisions/0005-scanning-rules.md)).

## npm swallows the arguments

Arguments must come after `--`: `npm run audit -- --portal passport`. In PowerShell, quote any
selector that contains spaces or `#`.
