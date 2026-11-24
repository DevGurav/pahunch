# 0003: CI never scans live portals

Status: accepted (2026-11-24)

## Context

GitHub-hosted runners sit in foreign datacenters. Many Indian government sites block or throttle
foreign and datacenter IPs, so a CI scan would mostly measure those blocks. Scanning on every push
would also load the portals far more often than the findings change.

## Decision

- CI runs the typecheck, the tests (fixture pages on localhost), the report build from committed
  results, and the report's own accessibility check, then deploys the report.
- Live audits are run by hand from a machine on an Indian network. Their results are reviewed and
  committed as dated folders.

## Consequences

- Results are dated snapshots, not live status. The report shows each portal's audit date.
- Results can be reproduced from the commit, because each run stores the page HTML, the transcript
  and the tool, browser and axe-core versions.
- Fresh results need someone to run the audit and commit them.

## Alternatives considered

- **Scheduled CI scans through an Indian proxy or self-hosted runner.** That costs money, and a
  self-hosted runner on a home machine is a security risk for a public repo.
