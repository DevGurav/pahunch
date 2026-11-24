# 2. Why an image CAPTCHA is a wall

A CAPTCHA tries to tell people from bots with a puzzle that's easy for a person and hard for a
program. The classic Indian government version is a picture of five or six wobbly characters and a
box to type them into.

For a blind user, that picture is not "hard". It's impossible. A screen reader can only announce an
image's `alt` text, and the `alt` can't contain the answer without giving it away to the bots as
well.

## What WCAG says

WCAG 1.1.1 (Non-text Content, Level A) has a specific exception for CAPTCHAs: you may use one, *as
long as* you also provide a version that works through another sense, usually audio, and you
describe what the CAPTCHA is for. An image CAPTCHA with no audio option fails Level A, the most
basic level.

## Five patterns seen on real portals (discovery, 24 Nov 2026)

| Pattern | Seen on | What a blind user experiences |
| --- | --- | --- |
| Image plus a real audio **link**, and an `alt` that explains | eCourts case status | "Enter the characters shown in the image, or select the audio, graphic … Play CAPTCHA Audio, link". There's a way through. |
| Image plus a real audio **button** | CPGRAMS sign-in | The button is reachable with Tab. There's a way through. |
| Image plus an audio **icon** (`<i aria-label="listen captcha">`) | Voters' Services electoral search | The icon can't be focused and isn't in the accessibility tree. Mouse users get audio; keyboard and screen-reader users never find it. |
| Image with `alt=""` | MahaDBT, RTI Online | `alt=""` means "decorative, skip me", so the screen reader is silent and the user lands on an unexplained text box. |
| Image, no audio at all | Aaple Sarkar | No way through without sighted help. |

The third row is the subtle one. The option *exists*, so a sighted tester ticks the box, but it
exists only for people who use a mouse.

## How pahunch decides (`src/checks/captcha.ts`)

1. Find visible images or canvases (at least 40×15 px) whose own attributes, or their parent's,
   mention "captcha". Speaker and refresh icons inside links or buttons are excluded.
2. Find the CAPTCHA's field in the same form, or the nearest container that has a text input.
3. Look nearby for an audio option: anything mentioning audio, listen, speak or sound. Then ask two
   questions: can the Tab key reach it (*focusable*), and is it, or does it sit inside, a button or
   link (*exposed*)?
4. Decide whether it's on the task path: its field is one of the task's critical controls, or its
   form contains one.

| Result | Rule | Severity |
| --- | --- | --- |
| No audio option, on the task path | `captcha-image-only` | blocker |
| Audio option neither focusable nor exposed, on the task path | `captcha-audio-unreachable` | blocker |
| Audio option only one of focusable or exposed | `captcha-audio-unreachable` | barrier |
| Audio option focusable and exposed | `captcha-with-audio` | info |

What it can't tell: whether the audio itself is understandable. Distorted audio CAPTCHAs are often
hard for everyone. That needs a person.

## What a good fix looks like

The simplest fix is to drop the puzzle. An OTP sent to the registered mobile number, or server-side
rate limiting, stops bots without asking anyone to read a picture. If the CAPTCHA has to stay:

```html
<img src="/captcha" alt="Security code image. Use the audio button if you cannot see it.">
<button type="button" id="captcha-audio">Play audio security code</button>
<label for="captcha">Security code</label>
<input id="captcha" name="captcha" autocomplete="off">
```

A real `<button>` is focusable, announced as a button, and works with Enter and Space without any
extra script.
