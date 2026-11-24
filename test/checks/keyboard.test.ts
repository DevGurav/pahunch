import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkKeyboard } from '../../src/checks/keyboard.ts';
import { useHarness } from '../helpers/harness.ts';

const h = useHarness();

test('reachable controls with a visible focus ring give no findings; disabled ones are skipped', async () => {
  const resolved = await h.load('keyboard-ok.html', [
    { label: 'Username field', selector: '#user', kind: 'field' },
    { label: 'Login button', selector: '#go', kind: 'button' },
    { label: 'Disabled submit', selector: '#later', kind: 'button' },
  ]);
  const { findings, evidence, inconclusive } = await checkKeyboard(h.session.page, resolved);
  assert.deepEqual(findings, []);
  assert.deepEqual(inconclusive, []);
  assert.equal(evidence.completedCycle, true);
  const byLabel = Object.fromEntries(evidence.controls.map((c) => [c.label, c]));
  assert.equal(byLabel['Login button']?.reached, true);
  assert.equal(byLabel['Login button']?.focusVisible, true);
  assert.equal(byLabel['Disabled submit']?.skipped, 'disabled');
});

test('a clickable div the Tab key never reaches is a blocker', async () => {
  const resolved = await h.load('keyboard-div-button.html', [
    { label: 'Username field', selector: '#user', kind: 'field' },
    { label: 'Login button', selector: '#login', kind: 'button' },
  ]);
  const { findings } = await checkKeyboard(h.session.page, resolved);
  assert.deepEqual(
    findings.map((f) => [f.rule, f.severity, f.target]),
    [['keyboard-unreachable', 'blocker', 'Login button']],
  );
});

test('outline: none with no other focus style is flagged; a box-shadow focus style is not', async () => {
  const resolved = await h.load('keyboard-focus-invisible.html', [
    { label: 'Username field', selector: '#user', kind: 'field' },
    { label: 'Login button', selector: '#go', kind: 'button' },
    { label: 'Help button', selector: '#help', kind: 'button' },
  ]);
  const { findings, evidence } = await checkKeyboard(h.session.page, resolved);
  assert.deepEqual(
    findings.map((f) => [f.rule, f.severity]),
    [['keyboard-focus-invisible', 'barrier']],
  );
  assert.match(findings[0]?.summary ?? '', /Username field.*Login button/);
  assert.equal(evidence.controls.find((c) => c.label === 'Help button')?.focusVisible, true);
});

test('a focus trap that hides the Login button is a blocker', async () => {
  const resolved = await h.load('keyboard-trap.html', [{ label: 'Login button', selector: '#go', kind: 'button' }]);
  const { findings, evidence } = await checkKeyboard(h.session.page, resolved);
  assert.deepEqual(
    findings.map((f) => [f.rule, f.severity]),
    [['keyboard-trap', 'blocker']],
  );
  assert.ok(evidence.trap && evidence.trap.length <= 2);
});

test('focus held inside an open modal is not a trap; the task is inconclusive instead', async () => {
  const resolved = await h.load('keyboard-modal.html', [{ label: 'Login button', selector: '#go', kind: 'button' }]);
  const { findings, evidence, inconclusive } = await checkKeyboard(h.session.page, resolved);
  assert.deepEqual(findings, []);
  assert.equal(evidence.inModal, true);
  assert.equal(inconclusive?.length, 1);
  assert.match(inconclusive?.[0] ?? '', /dialog/);
});

const grievance = [{ label: 'Public Grievance link', selector: 'a[href*="public-grievance"]', kind: 'link' as const }];

test('a link in a hover-only menu is a barrier, not a blocker', async () => {
  const resolved = await h.load('menu-hover.html', grievance);
  const { findings, inconclusive } = await checkKeyboard(h.session.page, resolved);
  assert.deepEqual(
    findings.map((f) => [f.rule, f.severity]),
    [['keyboard-unreachable', 'barrier']],
  );
  assert.match(findings[0]?.summary ?? '', /hover/);
  assert.deepEqual(inconclusive, []);
});

test('a link in a menu that opens on keyboard focus is reached', async () => {
  const resolved = await h.load('menu-focus.html', grievance);
  const { findings, evidence } = await checkKeyboard(h.session.page, resolved);
  assert.equal(evidence.controls[0]?.reached, true);
  assert.deepEqual(findings, []);
});

test('a link behind a disclosure button is inconclusive: the walk only presses Tab', async () => {
  const resolved = await h.load('menu-button.html', grievance);
  const { findings, inconclusive } = await checkKeyboard(h.session.page, resolved);
  assert.deepEqual(findings, []);
  assert.match(inconclusive?.[0] ?? '', /button/);
});

test('controls inside an iframe are followed', async () => {
  const resolved = await h.load('critical.html', [{ label: 'Inner field', selector: '#inner', kind: 'field' }]);
  const { findings, evidence } = await checkKeyboard(h.session.page, resolved);
  assert.equal(evidence.controls[0]?.reached, true);
  assert.deepEqual(findings, []);
});
