import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCaptcha } from '../../src/checks/captcha.ts';
import { useHarness } from '../helpers/harness.ts';

const h = useHarness();
const rules = (fs: { rule: string }[]) => fs.map((f) => f.rule).sort();

test('an image CAPTCHA with no audio option on the task path is a blocker', async () => {
  await h.load('captcha-image-only.html', [{ label: 'CAPTCHA field', selector: '#captcha', kind: 'captcha-field' }]);
  const { findings, evidence } = await checkCaptcha(h.session.page);
  assert.deepEqual(rules(findings), ['captcha-image-only']);
  assert.equal(findings[0]?.severity, 'blocker');
  assert.equal(evidence.groups[0]?.kind, 'image');
  assert.equal(evidence.groups[0]?.onPath, true);
  assert.equal(evidence.groups[0]?.imageAlt, 'Captcha');
});

test('the refresh icon next to a CAPTCHA is not mistaken for a second CAPTCHA', async () => {
  await h.load('captcha-image-only.html');
  const { evidence } = await checkCaptcha(h.session.page);
  assert.equal(evidence.groups.length, 1);
});

test('an empty alt is called out: the screen reader skips the image entirely', async () => {
  await h.load('captcha-alt-empty.html', [{ label: 'CAPTCHA field', selector: '#CaptchaInputText', kind: 'captcha-field' }]);
  const { findings, evidence } = await checkCaptcha(h.session.page);
  assert.deepEqual(rules(findings), ['captcha-image-only']);
  assert.equal(evidence.groups[0]?.imageAlt, '');
  assert.match(findings[0]?.summary ?? '', /alt text is empty/);
});

test('a focusable audio button makes it captcha-with-audio (info)', async () => {
  await h.load('captcha-audio-button.html', [{ label: 'CAPTCHA field', selector: '#Captcha', kind: 'captcha-field' }]);
  const { findings, evidence } = await checkCaptcha(h.session.page);
  assert.deepEqual(rules(findings), ['captcha-with-audio']);
  assert.equal(findings[0]?.severity, 'info');
  assert.equal(evidence.groups[0]?.audio?.focusable, true);
});

test('an audio icon that is neither focusable nor exposed is a blocker on the task path', async () => {
  await h.load('captcha-audio-icon.html', [{ label: 'CAPTCHA field', selector: 'input[name="captcha"]', kind: 'captcha-field' }]);
  const { findings, evidence } = await checkCaptcha(h.session.page);
  assert.deepEqual(rules(findings), ['captcha-audio-unreachable']);
  assert.equal(findings[0]?.severity, 'blocker');
  assert.equal(evidence.groups[0]?.audio?.focusable, false);
  assert.equal(evidence.groups[0]?.audio?.exposed, false);
});

test('the same icon off the task path is only a barrier', async () => {
  await h.load('captcha-audio-icon.html');
  const { findings } = await checkCaptcha(h.session.page);
  assert.equal(findings[0]?.severity, 'barrier');
});

test('third-party, text, off-path and hidden CAPTCHAs are told apart', async () => {
  await h.load('captcha-variants.html', [
    { label: 'Mobile field', selector: '#mobile', kind: 'field' },
    { label: 'Consumer number', selector: '#consumerNo', kind: 'field' },
  ]);
  const { findings } = await checkCaptcha(h.session.page);
  assert.deepEqual(rules(findings), ['captcha-image-only', 'captcha-text', 'captcha-third-party']);
  const offPath = findings.find((f) => f.rule === 'captcha-image-only');
  assert.equal(offPath?.severity, 'barrier', 'the feedback form is not part of the task');
});

test('a page with no CAPTCHA gives no findings', async () => {
  await h.load('captcha-none.html');
  const { findings, evidence } = await checkCaptcha(h.session.page);
  assert.equal(findings.length, 0);
  assert.equal(evidence.groups.length, 0);
});

test('a CAPTCHA inside an iframe is found and carries the frame URL', async () => {
  await h.load('captcha-frame.html', [{ label: 'CAPTCHA field', selector: '#captcha', kind: 'captcha-field' }]);
  const { findings } = await checkCaptcha(h.session.page);
  assert.deepEqual(rules(findings), ['captcha-image-only']);
  assert.match(findings[0]?.frameUrl ?? '', /captcha-image-only\.html$/);
  assert.equal(findings[0]?.severity, 'blocker');
});
