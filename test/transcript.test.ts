import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshotToTranscript } from '../src/checks/transcript.ts';

// Real ariaSnapshot() output for patterns seen on portals (see docs/build-log.md, 2026-11-24).
const SNAPSHOT = `- heading "Passport Seva" [level=1]
- navigation:
  - list:
    - listitem:
      - link "Home":
        - /url: /
    - listitem:
      - link:
        - /url: /x
        - img
- main:
  - paragraph: Login ID *
  - textbox
  - text: User ID
  - textbox "User ID"
  - textbox "********"
  - text: Continue Login
  - button:
    - img
  - button "Search"
  - combobox:
    - option "Maharashtra" [selected]
  - checkbox "I agree" [checked]
  - button "Submit" [disabled]
  - paragraph: माहिती नोंद करा`;

test('a snapshot becomes the lines a screen reader would roughly announce', () => {
  assert.deepEqual(snapshotToTranscript(SNAPSHOT), [
    'heading level 1, Passport Seva',
    'navigation landmark',
    'list',
    'Home, link',
    'link, no name',
    'graphic, no name',
    'main landmark',
    'Login ID *',
    'edit, no name',
    'User ID',
    'User ID, edit',
    '********, edit',
    'Continue Login',
    'button, no name',
    'graphic, no name',
    'Search, button',
    'combo box, no name',
    'Maharashtra, option, selected',
    'I agree, check box, checked',
    'Submit, button, unavailable',
    'माहिती नोंद करा',
  ]);
});

test('empty input gives an empty transcript', () => {
  assert.deepEqual(snapshotToTranscript(''), []);
});
