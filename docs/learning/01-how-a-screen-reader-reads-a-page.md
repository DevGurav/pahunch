# 1. How a screen reader reads a page

A screen reader doesn't look at the screen. It can't see that a button is blue or that a picture
shows the word "LOGIN". It reads a second copy of the page that the browser builds for it, called
the **accessibility tree**.

## From HTML to the accessibility tree

For every meaningful element, the browser works out three things:

| | Means | Example |
| --- | --- | --- |
| **Role** | What kind of thing it is | button, link, edit (text box), heading, check box |
| **Name** | What it's called | "Login", "Aadhaar number" |
| **State** | What's going on with it | checked, expanded, disabled, required |

The screen reader speaks those: *"Aadhaar number, edit, required"*, *"Login, button"*.

Three ways to make a Login button, and what a blind user hears for each:

```html
<button>Login</button>
```
→ "Login, button". Correct. It's reachable with Tab, Enter presses it, and it has a role and a name.

```html
<div class="btn" onclick="login()">Login</div>
```
→ just "Login", as plain text. Tab skips it because a `div` can't take keyboard focus, and nothing
says it's a button. A mouse user never notices. A keyboard or screen-reader user may never find a
way to log in. The check in `src/checks/keyboard.ts` is built to catch this.

```html
<a href="#" onclick="login()"><img src="btn_login.png"></a>
```
→ "link, btn underscore login dot png", or just "link". The picture has no `alt` text, so the
screen reader guesses from the file name or says nothing. The check in `src/checks/names.ts` catches
this.

## How blind users move around a page

Most people don't listen to a page top to bottom. With NVDA in a browser, single keys jump:

| Key | Jumps to the next |
| --- | --- |
| `H` | heading |
| `F` | form field |
| `B` | button |
| `K` | link |
| `Tab` | focusable control (links, buttons, fields) |
| `Insert` + `F7` | (opens a list of all links, headings or landmarks) |

So headings that are really styled `div`s, form fields with no names, and "buttons" that aren't
buttons all break the main ways people get around.

## See it yourself in two minutes

1. Open any government login page in Chrome.
2. Right-click the username box and choose **Inspect**.
3. In DevTools, open the **Accessibility** tab, next to Styles. It shows the element's computed
   **Name** and **Role**, the same values a screen reader receives.
4. Do the same for the CAPTCHA image and the Login button. If Name is empty, a blind user hears
   nothing useful there.

pahunch does this automatically for every control a task depends on, and writes a transcript of what
a screen reader would announce on the whole page (`transcript.txt` in each result).

## Words to know

Accessibility tree, role, accessible name, state, focus, screen reader. All of them are in
[the glossary](../glossary.md).
