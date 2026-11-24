import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useHarness } from '../helpers/harness.ts';

const h = useHarness();

test('found controls are tagged in the page and reported as found', async () => {
  const resolved = await h.load('critical.html', [
    { label: 'User field', selector: '#user', kind: 'field' },
    { label: 'Go button', selector: 'button:has-text("Go")', kind: 'button' },
  ]);
  assert.deepEqual(
    resolved.map((r) => [r.label, r.found]),
    [
      ['User field', true],
      ['Go button', true],
    ],
  );
  assert.equal(await h.session.page.getAttribute('#user', 'data-pahunch-critical'), '0');
  assert.equal(await h.session.page.getAttribute('button', 'data-pahunch-critical'), '1');
});

test('a selector that matches nothing is reported as not found', async () => {
  const [resolved] = await h.load('critical.html', [{ label: 'Missing', selector: '#nope', kind: 'field' }]);
  assert.equal(resolved?.found, false);
});

test('controls inside an iframe are found and carry the frame URL', async () => {
  const [resolved] = await h.load('critical.html', [{ label: 'Inner field', selector: '#inner', kind: 'field' }]);
  assert.equal(resolved?.found, true);
  assert.match(resolved?.frameUrl ?? '', /critical-inner\.html$/);
});

test('an invalid selector is reported as not found with the error', async () => {
  const [resolved] = await h.load('critical.html', [{ label: 'Broken', selector: 'button:::', kind: 'button' }]);
  assert.equal(resolved?.found, false);
  assert.ok(resolved?.error);
});
