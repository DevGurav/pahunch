# 0004: One verdict per task, not a score

Status: accepted (2026-11-24)

## Context

Accessibility reports usually lead with a number, such as Lighthouse's 0–100 or "conformance: 63%".
A number averages problems together. A login page can score 92 because forty small things are right
while the one thing that matters, an image CAPTCHA with no alternative, makes login impossible for a
blind user. People act on the headline number, so it should reflect the problem that stops them.

## Decision

Each portal's task gets exactly one verdict, decided in this order (`src/verdict.ts`):

1. **Blocked:** at least one blocker on the task's path.
2. **Inconclusive:** no blocker found, but part of the task couldn't be checked (the page didn't
   load, a critical control wasn't found). The unchecked part might hold a blocker.
3. **Barriers found:** no blocker, but barriers such as serious axe violations, unmarked Indic text
   or scanned PDFs.
4. **No blockers found by automated checks:** nothing above. It is never called "accessible"
   ([0001](0001-automated-checks-only.md)).

Counts (axe violations by impact, findings per check) are shown as supporting detail under the
verdict, never added up into a score.

## Consequences

- The scorecard is quick to scan, and each verdict points to the evidence for it.
- Two Blocked portals can differ a lot in how much else is wrong. The detail pages show that.

## Alternatives considered

- **Weighted score.** Needs arbitrary weights, and still hides blockers.
- **WCAG conformance percentage.** Automated checks can't establish conformance, so the number would
  be wrong in a way that looks precise.
