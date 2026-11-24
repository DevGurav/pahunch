# 4. What automated checks can and can't see

## How axe-core decides

axe-core is a library of rules. Each one looks for a specific pattern in the page's DOM and
accessibility tree: an `<img>` with no `alt`, an `<input>` with no label, text whose colour contrast
is below 4.5:1. Each rule is tagged with the WCAG success criteria it relates to (`wcag111` → 1.1.1),
and each result has an **impact**: minor, moderate, serious or critical.

Every rule result falls into one of four buckets:

| Bucket | Meaning | What pahunch does |
| --- | --- | --- |
| violations | The rule failed | Each rule becomes one finding. Critical or serious impact → barrier; otherwise info |
| incomplete | axe couldn't decide ("needs review") | Saved as evidence, never counted |
| passes | The rule passed | Counted only |
| inapplicable | Nothing on the page for this rule | Ignored |

axe was designed to avoid false positives. When it isn't sure, it says "incomplete" instead of
guessing. That's why we run it, and why we never count its "incomplete" bucket.

## How much automated checks find

Less than you'd hope:

- In 2017 the UK's Government Digital Service built a page full of known accessibility failures and
  ran ten automated tools against it. **29% of the barriers were found by none of them**
  ([GDS accessibility blog](https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/)).
- Deque, the company behind axe-core, analysed more than 2,000 of its own audits in 2021. Automated
  tests found about **57% of the issues by volume**, but issues turned up for only **16 of the 50**
  WCAG 2.1 AA success criteria
  ([Deque coverage report](https://www.deque.com/automated-accessibility-coverage-report/)). That's a
  vendor's own number.

Either way, a clean automated result is not a clean site.

## What axe can't know, and what pahunch adds

| axe can't tell | pahunch's answer |
| --- | --- |
| Which elements the task depends on | Portal definitions list the **critical controls**. Only those can produce blockers ([0006](../decisions/0006-what-counts-as-a-blocker.md)). |
| Whether an audio CAPTCHA option can actually be reached | `captcha` check: focusable? exposed? |
| Whether the Tab key ever gets to the Login button | `keyboard` check: a real walk through the tab order |
| Whether Hindi or Marathi text will be spoken correctly | `lang` check |
| Whether a linked notice is a scanned image | `pdf` check |
| What the whole page sounds like | `transcript.txt` for every result |

## What nobody's automated check can see

- Whether a name makes sense: "Button 1" is a name, but not a useful one.
- Whether error messages are announced when a form is submitted. We never submit.
- Timeouts, OTP flows and everything after login. We never log in.
- Whether the audio CAPTCHA is understandable.
- Whether the whole experience makes sense to a person who can't see it.

All of those need a person using a screen reader. That's why every pahunch finding carries the label
*"Automated check: not yet tried by a screen-reader user."*
