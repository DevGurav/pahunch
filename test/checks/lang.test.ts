import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLang } from '../../src/checks/lang.ts';
import { useHarness } from '../helpers/harness.ts';

const h = useHarness();

test('unmarked Marathi on an English page is a barrier; hidden and marked text are not counted', async () => {
  await h.load('lang-unmarked.html');
  const { findings, evidence } = await checkLang(h.session.page);
  assert.deepEqual(
    findings.map((f) => [f.rule, f.severity]),
    [['lang-indic-unmarked', 'barrier']],
  );
  const main = evidence.frames[0]!;
  assert.equal(main.htmlLang, 'en');
  // "हिन्दी" (6) + the visible Marathi sentence + the "घरगुती" option, but not the lang="mr", hidden or aria-hidden text.
  const sentence = 'वीज देयक अवलोकन आणि भरणा करण्यासाठी ग्राहक क्रमांक नोंद करा आणि पुढे जा'.replace(/[^ऀ-ൿ]/g, '').length;
  assert.equal(main.indicUnmarked, 6 + sentence + 'घरगुती'.length);
});

test('a lone unmarked language toggle is only info', async () => {
  await h.load('lang-toggle-only.html');
  const { findings } = await checkLang(h.session.page);
  assert.deepEqual(
    findings.map((f) => [f.rule, f.severity]),
    [['lang-indic-unmarked', 'info']],
  );
});

test('correctly marked pages give no findings', async () => {
  await h.load('lang-ok.html');
  const { findings } = await checkLang(h.session.page);
  assert.equal(findings.length, 0);
});

test('a page declaring Hindi but written in English is lang-page-wrong', async () => {
  await h.load('lang-page-wrong.html');
  const { findings } = await checkLang(h.session.page);
  assert.deepEqual(
    findings.map((f) => f.rule),
    ['lang-page-wrong'],
  );
  assert.match(findings[0]?.summary ?? '', /"hi"/);
});

test('a Marathi page with no lang at all is a barrier', async () => {
  await h.load('lang-none-marathi.html');
  const { findings } = await checkLang(h.session.page);
  assert.deepEqual(
    findings.map((f) => [f.rule, f.severity]),
    [['lang-indic-unmarked', 'barrier']],
  );
  assert.match(findings[0]?.summary ?? '', /declares no language/);
});
