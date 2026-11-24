# 3. `lang`, and how a screen reader speaks Hindi and Marathi

A screen reader doesn't detect languages by itself. It reads the `lang` attribute and picks a voice:

```html
<html lang="en">            <!-- the page is English -->
<span lang="hi">हिन्दी</span>  <!-- this phrase is Hindi -->
```

NVDA has an option, *Automatic language switching*, that changes voice when it meets a `lang`.
That only works if the speech engine has a voice for the language. eSpeak NG, which ships with
NVDA, has Hindi and Marathi voices. Windows' own voices need the language pack installed.

## What goes wrong without it

If Devanagari text sits under `lang="en"`, or under no `lang` at all, the English voice gets text it
can't pronounce. Depending on the engine, it may garble it, spell out character names one by one,
or skip it. None of these is "reading it".

The reverse also happens. The myAadhaar beta declares `<html lang="hi">` on a page written in
English, so a screen reader would read every English word with Hindi pronunciation rules.

## Two rules in `src/checks/lang.ts`

| Rule | When | Severity |
| --- | --- | --- |
| `lang-indic-unmarked` | Text in Indic scripts (Devanagari to Malayalam) under no Indic `lang` | barrier from 30 characters; info below (a lone "हिन्दी" link) |
| `lang-page-wrong` | `<html lang>` is an Indic language but the page's own text is mostly Latin letters (200 or more, and over ten times the Indic count) | barrier |

Only text a screen reader would actually read counts. Hidden elements, `aria-hidden` regions,
scripts and styles are skipped. `<option>` text inside a visible dropdown is counted, because
users hear it when they move through the list.

The check accepts any Indic language code for Indic text. It doesn't try to tell Hindi from Marathi
(both use Devanagari), because a Hindi voice reading Marathi is understandable, while an English
voice reading either is not.

## Seen during discovery

- **MSEDCL's bill page:** written in Marathi with no `lang` anywhere.
- **DEPwD's Hindi home page:** marked `lang="hi-IN"`, which is correct.
- **Many English pages:** an unmarked "हिन्दी" link in the header. Minor (info), but it's the first
  thing a Hindi speaker looks for.

## The fix

Mark the page with the language it's written in, and mark phrases that switch:

```html
<html lang="mr">
  …
  <a href="/en" lang="en">English</a>
```

For a bilingual header: `<a href="/hi" lang="hi">हिन्दी</a>`.
