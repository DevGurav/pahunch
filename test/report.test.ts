import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PortalResult } from '../src/audit.ts';
import { buildSite } from '../src/report/build.ts';
import { esc, withLang } from '../src/report/html.ts';
import type { LoadedResult } from '../src/report/load.ts';
import { AUTOMATED_LABEL } from '../src/rules.ts';

const HOSTILE = '<script>alert(1)</script>';
const HOSTILE_NAME = '"><img src=x onerror=alert(1)>';

function fakeResult(): LoadedResult {
  const result: PortalResult = {
    schema: 1,
    portal: { id: 'mahadbt', name: 'MahaDBT', owner: 'Government of Maharashtra', jurisdiction: 'Maharashtra', task: 'Reach the applicant login form' },
    startedAt: '2026-11-24T10:00:00.000Z',
    finishedAt: '2026-11-24T10:01:00.000Z',
    tool: { name: 'pahunch', version: '0.1.0', userAgent: 'test', browser: 'chromium 1', axe: '4.11.0' },
    pages: [{ requested: 'https://example.invalid/login', finalUrl: 'https://example.invalid/login', status: 200, title: 'Login' }],
    robots: null,
    critical: [
      { index: 0, label: 'Username field', kind: 'field', selector: '#u', found: true, role: 'textbox', name: HOSTILE_NAME, reached: true, focusVisible: false },
      { index: 1, label: 'CAPTCHA field', kind: 'captcha-field', selector: '#c', found: true, role: 'textbox', name: '', reached: true, focusVisible: true },
    ],
    verdict: 'blocked',
    inconclusiveReasons: [],
    findings: [
      {
        check: 'captcha',
        rule: 'captcha-image-only',
        severity: 'blocker',
        wcag: ['1.1.1'],
        summary: 'The task needs this image CAPTCHA, and there is no audio or other non-visual option.',
        snippet: `<img id="CaptchaImage" alt="" data-pahunch-critical="3">${HOSTILE}`,
        target: 'img#CaptchaImage',
      },
      { check: 'lang', rule: 'lang-indic-unmarked', severity: 'barrier', wcag: ['3.1.2'], summary: '40 characters of Indic text are not marked; e.g. वीज देयक अवलोकन' },
      { check: 'axe', rule: 'axe/image-alt', severity: 'info', wcag: ['1.1.1'], summary: 'Images must have alternate text (2 elements).' },
    ],
    counts: { blocker: 1, barrier: 1, info: 1 },
    evidence: {},
    errors: [],
  };
  return { date: '2026-11-24', folder: 'x', result, transcript: `heading level 1, MahaDBT\nedit, no name\n${HOSTILE}` };
}

test('esc escapes every character that matters in HTML', () => {
  assert.equal(esc(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('withLang marks Devanagari runs and escapes the rest', () => {
  assert.equal(withLang('Pay <now> वीज देयक!', 'mr'), 'Pay &lt;now&gt; <span lang="mr">वीज देयक</span>!');
});

test('the built site never contains raw markup taken from a scanned page', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pahunch-site-'));
  try {
    await buildSite([fakeResult()], [{ name: 'IRCTC', owner: 'Railways', url: 'https://x.invalid', reason: 'Blocked.', checkedOn: '2026-11-24' }], dir);
    const portal = await readFile(join(dir, 'portals', 'mahadbt.html'), 'utf8');
    assert.ok(!portal.includes('<script>alert(1)</script>'), 'snippet script is escaped');
    assert.ok(!portal.includes('<img src=x onerror'), 'hostile accessible name is escaped');
    assert.ok(portal.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!portal.includes('data-pahunch-critical'), 'our own marker is stripped from snippets');
    assert.ok(portal.includes('<span lang="mr">वीज देयक अवलोकन</span>'), 'Marathi text is marked for a Maharashtra portal');
    assert.ok(portal.includes(AUTOMATED_LABEL));
    assert.match(portal, /Content-Security-Policy/);

    const index = await readFile(join(dir, 'index.html'), 'utf8');
    assert.match(index, /Blocked/);
    assert.match(index, /IRCTC/);
    assert.match(index, /portals\/mahadbt\.html/);

    const transcript = await readFile(join(dir, 'transcripts', 'mahadbt.txt'), 'utf8');
    assert.match(transcript, /edit, no name/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
