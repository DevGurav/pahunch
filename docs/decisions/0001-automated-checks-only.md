# 0001: Automated checks only, labelled as such

Status: accepted (2026-11-24)

## Context

The real test of accessibility is a screen-reader user trying the task. This round has no time for
manual screen-reader testing. Automated tools catch only part of what blocks people: they can tell
that a button has no name, but not that a correctly named form is confusing to fill in.

## Decision

Every result in this round comes from automated checks, and the project says so everywhere:

- Each finding and each verdict in the report carries the label "Automated check: not yet tried by
  a screen-reader user".
- The best possible verdict is "No blockers found by automated checks". The word "accessible" is
  never used for a site.
- The checks favour **precision over recall**. A blocker is reported only when the evidence is
  direct (an image CAPTCHA with no audio option in its form, a critical control with no accessible
  name, a critical control the Tab key never reaches). Every Blocked verdict is reviewed by hand
  against the saved page before it is published.

## Consequences

- Some real blockers will be missed, such as confusing error messages, timeouts, or OTP flows that
  only appear after login. The methodology page lists what the checks can't see.
- What is published can be defended: each claim points to an element in a saved page.
- A later round can add real screen-reader runs (roadmap Phase 5) with a new decision record that
  supersedes this one.

## Alternatives considered

- **Manual NVDA testing of five portals.** Strongest evidence, but no time for it this round. Kept
  for later.
- **A broad automated scan of hundreds of sites.** Gives a striking headline number, but it is
  shallow, home-page-only, and easy to misread. Depth on the tasks people come for is more useful
  and easier to act on.
