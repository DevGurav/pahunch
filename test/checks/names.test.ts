import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNames } from '../../src/checks/names.ts';
import type { CriticalControl } from '../../src/portals/types.ts';
import { useHarness } from '../helpers/harness.ts';

const h = useHarness();

const controls: CriticalControl[] = [
  { label: 'Login ID field', selector: '#loginid', kind: 'field' },
  { label: 'User ID field', selector: '#userid', kind: 'field' },
  { label: 'Password field', selector: '#pw', kind: 'field' },
  { label: 'Username field', selector: '#uname', kind: 'field' },
  { label: 'Continue button', selector: '#continue', kind: 'button' },
  { label: 'Image button', selector: '#imgbtn', kind: 'button' },
  { label: 'Search button', selector: '#search', kind: 'button' },
  { label: 'Agree checkbox', selector: '#agree', kind: 'checkbox' },
  { label: 'Labelled checkbox', selector: '#agree2', kind: 'checkbox' },
  { label: 'State dropdown', selector: '#state', kind: 'select' },
  { label: 'Send OTP button', selector: '#send', kind: 'button' },
  { label: 'Disabled submit', selector: '#later', kind: 'button' },
  { label: 'Hidden field', selector: '#ghost', kind: 'field' },
  { label: 'Not on the page', selector: '#missing', kind: 'field' },
];

test('each critical control gets the right verdict for its name and role', async () => {
  const resolved = await h.load('names-mixed.html', controls);
  const { findings } = await checkNames(h.session.page, resolved);
  const byTarget = Object.fromEntries(findings.map((f) => [f.target, f.rule]));
  assert.deepEqual(byTarget, {
    'Login ID field': 'name-missing',
    'Password field': 'name-missing',
    'Continue button': 'role-missing',
    'Image button': 'name-missing',
    'Agree checkbox': 'name-missing',
    'State dropdown': 'name-missing',
    'Hidden field': 'name-missing',
  });
});

test('evidence records role and name as the browser computes them', async () => {
  const resolved = await h.load('names-mixed.html', controls);
  const { evidence } = await checkNames(h.session.page, resolved);
  const get = (label: string) => evidence.controls.find((c) => c.label === label);
  assert.equal(get('User ID field')?.role, 'textbox');
  assert.equal(get('User ID field')?.name, 'User ID');
  assert.equal(get('Username field')?.name, 'Enter UserName', 'placeholders count as names');
  assert.equal(get('Send OTP button')?.name, 'Send OTP');
  assert.equal(get('Continue button')?.role, 'text');
  assert.equal(get('Disabled submit')?.disabled, true);
  assert.equal(get('Hidden field')?.hidden, true);
  assert.equal(get('Not on the page'), undefined, 'controls that were not found are left to the audit');
});

test('a meaningless name is reported with what is actually announced', async () => {
  const resolved = await h.load('names-mixed.html', controls);
  const { findings } = await checkNames(h.session.page, resolved);
  const pw = findings.find((f) => f.target === 'Password field');
  assert.match(pw?.summary ?? '', /\*\*\*\*\*\*\*\*/);
});
