import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRobots } from '../src/browser/robots.ts';

const AGENT = 'pahunch';

test('Disallow: / blocks every path', () => {
  assert.deepEqual(matchRobots('User-agent: *\nDisallow: /', '/login', AGENT), {
    disallowed: true,
    rule: 'Disallow: /',
  });
});

test('an empty Disallow allows everything', () => {
  assert.equal(matchRobots('User-agent: *\nDisallow:', '/login', AGENT).disallowed, false);
});

test('no robots rules means allowed', () => {
  assert.equal(matchRobots('', '/anything', AGENT).disallowed, false);
});

test('the longest matching rule wins', () => {
  const txt = 'User-agent: *\nDisallow: /services\nAllow: /services/public';
  assert.equal(matchRobots(txt, '/services/public/form', AGENT).disallowed, false);
  assert.equal(matchRobots(txt, '/services/private', AGENT).disallowed, true);
});

test('Allow wins a tie', () => {
  const txt = 'User-agent: *\nDisallow: /a\nAllow: /a';
  assert.equal(matchRobots(txt, '/a/b', AGENT).disallowed, false);
});

test('wildcards and the end anchor', () => {
  const txt = 'User-agent: *\nDisallow: /*.pdf$';
  assert.equal(matchRobots(txt, '/docs/notice.pdf', AGENT).disallowed, true);
  assert.equal(matchRobots(txt, '/docs/notice.pdf?x=1', AGENT).disallowed, false);
});

test('groups for other agents are ignored', () => {
  const txt = 'User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /private';
  assert.equal(matchRobots(txt, '/login', AGENT).disallowed, false);
});

test('a group naming our token replaces the * group', () => {
  const txt = 'User-agent: *\nDisallow: /\n\nUser-agent: pahunch\nAllow: /';
  assert.equal(matchRobots(txt, '/login', AGENT).disallowed, false);
});

test('consecutive User-agent lines share one group; comments are ignored', () => {
  const txt = 'User-agent: bingbot # search\nUser-agent: *\nDisallow: /x # private';
  assert.equal(matchRobots(txt, '/x/y', AGENT).disallowed, true);
});
