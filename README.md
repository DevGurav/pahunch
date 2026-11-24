# pahunch

**Can a blind citizen use India's government portals?**

pahunch (पहुँच, "reach" or "access") runs automated accessibility checks on citizen-service
portals such as Passport Seva, myAadhaar, IRCTC, income tax e-filing, the voter search, eCourts and
the UDID disability card portal. For each portal it takes one task people actually come for, such
as reaching the login form or searching a record, and asks one question: *would someone using a
screen reader be stopped from finishing it?*

**Report: [devgurav.github.io/pahunch](https://devgurav.github.io/pahunch/)** · First audit run on
24 November 2026 · [Roadmap](docs/roadmap.md)

## What the first audit found

| Verdict | Portals |
| --- | --- |
| **Blocked** | Aaple Sarkar, e-Shram, MahaDBT, MSEDCL (Mahavitaran) |
| **Inconclusive** | Department of Empowerment of Persons with Disabilities |
| **Barriers found** | myAadhaar, CPGRAMS, DigiLocker, National Career Service, National Scholarship Portal, Passport Seva, RTI Online, UDID, Voters' Services |
| **No blockers found by automated checks** | eCourts services |

- All four Blocked portals ask for an image (or canvas) CAPTCHA with no audio or other
  non-visual option. That includes **all three Maharashtra portals**. Every other central portal
  with a CAPTCHA offers an audio option that the keyboard can reach.
- On 6 of the 15, a control the task needs has no usable accessible name. A screen reader says
  "edit" and nothing more.
- Four portals (IRCTC, the EPFO member portal, PM-KISAN and the income tax e-filing login) refused
  the automated browser and were left out rather than worked around.

## Why this matters

Indian law already requires these sites to work for blind users. The Rights of Persons with
Disabilities Act, 2016 requires government services to be accessible, and the Guidelines for Indian
Government Websites (GIGW 3.0, 2023) take their accessibility rules from WCAG 2.1. In April 2025 the
Supreme Court held that digital access is part of the right to life under Article 21
(*Pragya Prasun v. Union of India*, 2025 INSC 599).

The last large audit of Indian government websites was published by the Centre for Internet and
Society in 2016, against the older WCAG 2.0. This is a smaller check that can be repeated, and it
looks at the tasks people use these sites for rather than at home pages.

## What it checks

On each task's pages:

| Check | Looks for | WCAG |
| --- | --- | --- |
| captcha | An image-only CAPTCHA with no audio or other non-visual alternative | 1.1.1 |
| keyboard | Task controls the Tab key can't reach, focus traps, focus you can't see | 2.1.1, 2.1.2, 2.4.7 |
| names | Task inputs and buttons with no accessible name ("edit, blank") | 4.1.2 |
| lang | Hindi, Marathi or other Indic text not marked with its language | 3.1.2 |
| pdf | Linked PDFs that are scanned images with no text in them | 1.1.1 |
| axe | The standard axe-core rules for WCAG 2.1 A and AA | various |

Each task gets a verdict rather than a score: **Blocked**, **Barriers found**, **No blockers found
by automated checks**, or **Inconclusive**. A score out of 100 averages away the one problem that
stops a person completely ([why](docs/decisions/0004-verdicts-not-scores.md)).

> Every result comes from automated checks and has not yet been tried by a screen-reader user.
> Automated checks find only part of the real problems, so "no blockers found" never means
> "accessible".

## Quick start

Needs Node 22 or later.

```sh
npm ci
npx playwright install chromium
npm test                                      # check engine against local fixture pages, no network
npm run audit -- --portal passport            # audit one portal (run from an Indian network)
npm run audit -- --portal passport --headed   # same, with the browser window visible
npm run report                                # build the report site into site/
```

## How it fits together

```text
portal definition → browser session → checks → verdict → results/<date>/<portal>/ → report site
```

- **Portal definition** (`src/portals/`): the task's URLs, the steps to get there, and the controls
  the task depends on.
- **Browser session** (`src/browser/`): one paced Chromium page. It never logs in, submits a form or
  solves a CAPTCHA.
- **Checks** (`src/checks/`): each returns findings plus its own evidence.
- **Verdict** (`src/verdict.ts`): one verdict per task.
- **Results** (`results/`): committed JSON, a "what a screen reader would hear" transcript, a
  screenshot and the page's HTML, all dated.
- **Report** (`src/report/`): a static site built from the results and published on GitHub Pages.

More in [docs/architecture.md](docs/architecture.md). The rules for how live sites are loaded are in
[docs/decisions/0005-scanning-rules.md](docs/decisions/0005-scanning-rules.md).

## Docs

- [Architecture](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [Build log](docs/build-log.md) · [Decisions](docs/decisions/)
- [Testing](docs/testing.md) · [CLI](docs/api.md) · [Result format](docs/data-model.md) · [Security](docs/security.md) · [Glossary](docs/glossary.md)
- [Runbook](docs/runbook.md) · [Troubleshooting](docs/troubleshooting.md)
- [Learning notes](docs/learning/): plain-language explainers on screen readers, CAPTCHAs, language tags and WCAG

## Licence

Code: [MIT](LICENSE). Findings in `results/` and on the report site: CC BY 4.0. Reuse them, with
credit.
