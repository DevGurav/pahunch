import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAriaLine } from '../src/checks/aria.ts';

test('role with a quoted name and attributes', () => {
  assert.deepEqual(parseAriaLine('- heading "Passport Seva" [level=1]'), {
    indent: 0,
    role: 'heading',
    name: 'Passport Seva',
    attrs: ['level=1'],
    inline: '',
  });
});

test('role with no name, then a colon for children', () => {
  assert.deepEqual(parseAriaLine('  - combobox:'), { indent: 2, role: 'combobox', name: '', attrs: [], inline: '' });
  assert.deepEqual(parseAriaLine('- textbox'), { indent: 0, role: 'textbox', name: '', attrs: [], inline: '' });
});

test('plain text lines and roles with inline text', () => {
  assert.deepEqual(parseAriaLine('- text: Continue'), { indent: 0, role: 'text', name: '', attrs: [], inline: 'Continue' });
  assert.deepEqual(parseAriaLine('    - paragraph: Login ID *'), { indent: 4, role: 'paragraph', name: '', attrs: [], inline: 'Login ID *' });
});

test('escaped quotes in names and quoted inline text', () => {
  assert.equal(parseAriaLine('- button "Say \\"hi\\""')?.name, 'Say "hi"');
  assert.equal(parseAriaLine('- text: "12: noon"')?.inline, '12: noon');
});

test('property lines such as /url are skipped', () => {
  assert.equal(parseAriaLine('  - /url: /home'), undefined);
  assert.equal(parseAriaLine('not a snapshot line'), undefined);
});

test('names with non-Latin text survive', () => {
  assert.equal(parseAriaLine('- link "हिन्दी"')?.name, 'हिन्दी');
});
