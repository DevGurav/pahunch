# 0005: How live portals are loaded

Status: accepted (2026-11-24)

## Context

pahunch loads other people's websites, government sites at that. It has to be gentle, transparent,
and clearly on the right side of the line between visiting a page and probing a system.

## Decision

1. **A fixed list of public task pages. No crawling.** Each portal definition names the URLs to load.
2. **Steps may only navigate or open public dialogs.** `goto`, or a click on something like a
   "Login" button that opens a modal. No typing into live forms, no submissions, no logins, no OTPs,
   no CAPTCHA attempts.
3. **Paced and sequential.** One browser page at a time, at least 5 seconds between loads on the
   same portal, and about 10 loads per portal per run at most. PDFs count as loads: at most 5 per
   task page.
4. **Identified.** The user agent is Chromium's own, with `pahunch/<version>
   (+https://github.com/DevGurav/pahunch)` appended, so a site operator can see what is visiting and
   why.
5. **robots.txt is recorded, not used to decide.** robots.txt governs crawlers. pahunch loads a
   handful of named pages the way a visitor or a browser extension would, so it goes ahead either
   way, and the result records whether the task URL was disallowed.
6. **Blocks are respected.** If a portal answers with a block, a bot challenge or a geo-block, the
   audit records that and the portal is left out. Nobody changes the user agent, rotates IPs or
   uses other tricks to get past it.
7. **Not a security tool.** No vulnerability probing, no fuzzing, no hidden paths.
8. **No borrowed authority.** The report uses no government emblems, logos or branding, and its
   tone is factual and focused on fixes.

## Consequences

- Some portals may drop out because they block automated browsers. That is a finding worth noting,
  not something to get around.
- Login-gated tasks such as downloading e-Aadhaar after OTP are out of reach. The audit covers the
  path up to and including the login form, which is where image CAPTCHAs sit.

## Alternatives considered

- **Crawling each portal for broader coverage.** Rejected: more load, less relevance, and it would
  make robots.txt binding.
- **Testing logged-in flows with a personal account.** Rejected for now: it would put personal data
  in results, and OTP flows can't be automated without collecting the OTP.
