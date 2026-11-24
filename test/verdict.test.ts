import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideVerdict } from '../src/verdict.ts';
import type { Finding, Severity } from '../src/types.ts';

const finding = (severity: Severity): Finding => ({
  check: 'captcha',
  rule: 'captcha-image-only',
  severity,
  wcag: ['1.1.1'],
  summary: 'test finding',
});

test('a clean run is no-blockers-found', () => {
  assert.equal(decideVerdict([], []), 'no-blockers-found');
});

test('info findings alone do not change the verdict', () => {
  assert.equal(decideVerdict([finding('info')], []), 'no-blockers-found');
});

test('a barrier gives barriers', () => {
  assert.equal(decideVerdict([finding('info'), finding('barrier')], []), 'barriers');
});

test('anything unchecked outranks barriers', () => {
  assert.equal(decideVerdict([finding('barrier')], ['control not found: Submit']), 'inconclusive');
});

test('unchecked parts with no findings are inconclusive, not clean', () => {
  assert.equal(decideVerdict([], ['page did not load']), 'inconclusive');
});

test('a blocker wins over everything', () => {
  assert.equal(decideVerdict([finding('barrier'), finding('blocker')], ['control not found: Submit']), 'blocked');
});
