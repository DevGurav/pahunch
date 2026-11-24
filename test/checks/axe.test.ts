import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAxe } from '../../src/checks/axe.ts';
import { useHarness } from '../helpers/harness.ts';

const h = useHarness();

test('axe violations become findings with WCAG numbers and severity from impact', async () => {
  await h.load('axe-violations.html');
  const { findings, evidence } = await checkAxe(h.session.page);
  const byRule = Object.fromEntries(findings.map((f) => [f.rule, f]));

  assert.ok(byRule['axe/image-alt'], 'missing alt is reported');
  assert.deepEqual(byRule['axe/image-alt']?.wcag, ['1.1.1']);
  assert.equal(byRule['axe/image-alt']?.severity, 'barrier', 'critical impact maps to barrier');
  assert.ok(byRule['axe/label'], 'unlabelled input is reported');
  assert.ok(byRule['axe/color-contrast'], 'low contrast is reported');
  assert.match(byRule['axe/image-alt']?.snippet ?? '', /<img/);

  assert.match(evidence.version, /^\d+\.\d+/);
  assert.ok(evidence.passes > 0);
  assert.ok(evidence.violations.every((v) => v.nodes.length <= 10));
});

test('a clean page gives no axe findings', async () => {
  await h.load('captcha-none.html');
  const { findings } = await checkAxe(h.session.page);
  assert.deepEqual(
    findings.filter((f) => f.severity !== 'info').map((f) => f.rule),
    [],
  );
});
