import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { auditDate, auditPortal, writeResult } from '../src/audit.ts';
import type { Portal } from '../src/portals/types.ts';
import { useHarness } from './helpers/harness.ts';

const h = useHarness();

const portalFor = (url: string, critical: Portal['critical']): Portal => ({
  id: 'fixture',
  name: 'Fixture portal',
  owner: 'Test',
  jurisdiction: 'Central',
  task: 'Reach the login form',
  steps: [{ kind: 'goto', url }],
  critical,
});

test('an image CAPTCHA login is Blocked, and the result folder holds every file', async () => {
  const portal = portalFor(`${h.server.baseUrl}/captcha-image-only.html`, [
    { label: 'Username field', selector: '#user', kind: 'field' },
    { label: 'CAPTCHA field', selector: '#captcha', kind: 'captcha-field' },
    { label: 'Login button', selector: '#login-btn', kind: 'button' },
  ]);
  const files = await auditPortal(portal, h.session);
  assert.equal(files.result.verdict, 'blocked');
  assert.equal(files.result.counts.blocker, 1);
  assert.deepEqual(files.result.inconclusiveReasons, []);
  assert.equal(files.result.critical.find((c) => c.label === 'Login button')?.reached, true);
  assert.equal(files.result.critical.find((c) => c.label === 'Username field')?.name, 'Username');
  assert.ok(files.result.tool.axe);

  const dir = await mkdtemp(join(tmpdir(), 'pahunch-'));
  try {
    const folder = await writeResult(dir, files);
    assert.deepEqual((await readdir(folder)).sort(), ['axe.json', 'page.html.gz', 'result.json', 'screenshot.jpg', 'transcript.txt']);
    const saved = JSON.parse(await readFile(join(folder, 'result.json'), 'utf8'));
    assert.equal(saved.verdict, 'blocked');
    const html = gunzipSync(await readFile(join(folder, 'page.html.gz'))).toString('utf8');
    assert.match(html, /data-pahunch-critical/);
    assert.match(await readFile(join(folder, 'transcript.txt'), 'utf8'), /Username, edit/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a page that does not load is inconclusive, never clean', async () => {
  const portal = portalFor('http://127.0.0.1:9/', [{ label: 'Field', selector: '#x', kind: 'field' }]);
  const { result } = await auditPortal(portal, h.session);
  assert.equal(result.verdict, 'inconclusive');
  assert.match(result.inconclusiveReasons[0] ?? '', /Task step failed/);
});

test('an HTTP error page is inconclusive and not retried', async () => {
  const portal = portalFor(`${h.server.baseUrl}/no-such-page.html`, [{ label: 'Field', selector: '#x', kind: 'field' }]);
  const { result } = await auditPortal(portal, h.session);
  assert.equal(result.verdict, 'inconclusive');
  assert.match(result.inconclusiveReasons[0] ?? '', /HTTP 404/);
});

test('a critical control that no longer exists makes a clean page inconclusive', async () => {
  const portal = portalFor(`${h.server.baseUrl}/captcha-none.html`, [
    { label: 'Username field', selector: '#user', kind: 'field' },
    { label: 'Renamed button', selector: '#gone', kind: 'button' },
  ]);
  const { result } = await auditPortal(portal, h.session);
  assert.equal(result.verdict, 'inconclusive');
  assert.match(result.inconclusiveReasons.join(' '), /Critical control not found: "Renamed button"/);
});

test('the results folder is named for the date in India', () => {
  assert.equal(auditDate(new Date('2026-11-24T20:00:00Z')), '2026-11-25');
  assert.equal(auditDate(new Date('2026-11-24T10:00:00Z')), '2026-11-24');
});
