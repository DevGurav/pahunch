# 5. Reading WCAG and GIGW

Every pahunch finding links to a WCAG success criterion. This note explains what those numbers mean
and how they connect to Indian law.

## WCAG in one page

The Web Content Accessibility Guidelines are written by the W3C. Version 2.1 (2018) is the one Indian
government guidelines adopt. They are organised in layers:

| Layer | Example |
| --- | --- |
| 4 principles: Perceivable, Operable, Understandable, Robust | **1** Perceivable |
| Guidelines under each principle | **1.1** Text alternatives |
| Success criteria, each testable, each with a level | **1.1.1** Non-text content (Level **A**) |

Level **A** is the minimum, **AA** is the usual legal target, and **AAA** is aspirational. When a
pahunch finding says "WCAG 1.1.1", it links to the W3C's *Understanding* page for that criterion,
which explains its intent, who it helps, and how to meet it.

The criteria that matter most for blind users on the portals in this report:

| Criterion | Level | In plain words | pahunch rules |
| --- | --- | --- | --- |
| 1.1.1 Non-text content | A | Images need text alternatives; a CAPTCHA needs a non-visual version | `captcha-*`, `pdf-scanned`, axe `image-alt` |
| 1.3.1 Info and relationships | A | Structure (labels, headings, tables) must be in the code, not just the look | `name-missing`, `pdf-untagged`, axe `label` |
| 2.1.1 Keyboard | A | Everything must work from the keyboard | `keyboard-unreachable` |
| 2.1.2 No keyboard trap | A | Focus must never get stuck | `keyboard-trap` |
| 2.4.7 Focus visible | AA | You can see where keyboard focus is (for low vision) | `keyboard-focus-invisible` |
| 3.1.1 Language of page | A | The page says what language it is in | `lang-page-wrong`, axe `html-has-lang` |
| 3.1.2 Language of parts | AA | Phrases in another language are marked | `lang-indic-unmarked` |
| 4.1.2 Name, role, value | A | Every control has a name and a role that assistive technology can read | `name-missing`, `role-missing` |

Most of these are Level **A**, the floor, not the ceiling.

## GIGW 3.0

The *Guidelines for Indian Government Websites and Apps*, version 3.0 (2023), were prepared by the
National Informatics Centre with STQC and CERT-In, and adopted by the Department of Administrative
Reforms and Public Grievances. They cover much more than accessibility, including content, security
and hosting. Their accessibility section is adopted from WCAG 2.1. STQC, under MeitY, audits and
certifies government sites against GIGW.

GIGW also asks each site to name a **Web Information Manager**, the person responsible for its
content. That's who the report's "send the findings" page points to.

## The law behind it

- **Rights of Persons with Disabilities Act, 2016.** Section 40 asks the government to set
  accessibility standards, including for information and communication technology. Section 42
  requires accessible content and electronic media. Section 46 gives service providers, government
  or private, a deadline to provide services that meet those standards.
- **Supreme Court, April 2025** (*Pragya Prasun v. Union of India*, 2025 INSC 599): digital access is
  part of the right to life under Article 21. The case was about digital KYC excluding blind people
  and acid-attack survivors, and the Court ordered KYC processes to be made accessible.

## How to read a pahunch finding

1. **Title:** what kind of problem it is, e.g. "Image CAPTCHA with no audio or other non-visual option".
2. **Summary:** this instance on this page.
3. **WCAG link:** the rule it breaks. Open the *Understanding* page to see why the rule exists.
4. **Element:** the exact HTML, so a developer can find it in seconds.
5. **Why it matters / How to fix it:** written for the team that owns the site.

The label *"Automated check: not yet tried by a screen-reader user"* is part of every finding, so
that nobody mistakes a machine's evidence for a person's experience.
