# Runbook

pahunch isn't a running service. "Operating" it means running an audit, reviewing it, and
publishing the report.

## Run an audit

Use a machine on an Indian network. Many portals block foreign and datacenter IPs.

```sh
npm ci && npx playwright install chromium
npm run audit -- --all          # or --portal <id>; takes a few minutes per portal
```

Results land in `results/<today>/<portal>/`. If a run dies halfway, the folders that finished are
complete. Re-run only the missing portals with `--portal`.

## Review before publishing

For every **Blocked** verdict, open the finding's snippet and `page.html.gz` and confirm the
element is real and on the task's path. A false blocker is worse than a missed one, because it costs
the report its credibility. For **Inconclusive**, read `inconclusiveReasons`. Usually the portal
changed and its definition needs updating; fix it and re-run.

## Publish

Commit the new `results/<date>/` folder and push to `main`. CI builds the report, checks it with
`npm run check:site`, and deploys it to GitHub Pages.

## Roll back

Revert the commit that added the bad results and push. The report rebuilds from the previous date.
Don't delete or edit dated folders by hand.

## Sending findings to a department

Each portal page in the report is written so it can be sent as is. GIGW requires every government
site to name a Web Information Manager, so look for that contact in the site's footer or "Contact
us" page. Other routes are CPGRAMS (pgportal.gov.in) and the Office of the Chief Commissioner for
Persons with Disabilities. Whether and when to send is the maintainer's decision. The tool never
sends anything.
