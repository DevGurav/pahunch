# Security

pahunch reads untrusted web pages and PDFs and republishes parts of them in a report. The threats
come from that, and from how we load other people's sites.

| Threat | Control |
| --- | --- |
| A scanned page's text, accessible names or HTML snippet carries script into our report (XSS) | Everything from a scanned page is HTML-escaped by one helper in the report builder. Raw page HTML is never inserted. Report pages also send a restrictive Content-Security-Policy (`default-src 'self'`) as a second layer. Tested in `test/report.test.ts`. |
| A malicious PDF exploits the parser | pdfjs-dist 6 no longer has the eval-based font path behind CVE-2024-4367 (its `isEvalSupported` option was removed), and we also turn off font loading. A HEAD request checks the size first and downloads over 15 MB are skipped. Only the first five pages are read, nothing is rendered or executed, and downloaded files aren't kept. |
| A huge or never-ending page response | Navigation and download timeouts; at most 5 PDFs per task page. |
| Our audit harms a live site | Sequential loads, at least 5 seconds apart, about 10 per portal per run. No logins, no form submissions, no CAPTCHA attempts. See [0005](decisions/0005-scanning-rules.md). |
| Personal data ends up in results | Audits never log in, so pages hold no personal data. Screenshots and saved HTML are of public pages only. |
| Secrets | There are none. CI uses only the default `GITHUB_TOKEN` to publish GitHub Pages. |

## Legal and ethical position

Loading a public page in a browser and reading it is what every visitor does. pahunch does that for
a short, fixed list of pages, names itself in its user agent, and does nothing a visitor couldn't.
It doesn't probe for security weaknesses, and it isn't a security scanner. If a portal answers with
a bot challenge or a block, the audit records that and leaves the portal out rather than getting
around it.
