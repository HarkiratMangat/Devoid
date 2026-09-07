/* The update check offers an update when compareVersions(latest, current) > 0.
 * Every case below is one where getting it wrong is silent: the app simply
 * stops offering updates, or offers one that does not exist. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { compareVersions: cmp } = createRequire(import.meta.url)('../lib/versions.js');

test('a string compare would get these wrong', () => {
  // "1.10.0" < "1.9.0" as STRINGS. This is the bug the file exists to prevent.
  assert.equal(cmp('1.10.0', '1.9.0'), 1);
  assert.equal(cmp('1.9.0', '1.10.0'), -1);
  assert.equal(cmp('2.0.0', '1.99.99'), 1);
  assert.equal(cmp('1.0.10', '1.0.9'), 1);
});

test('a leading v is the GitHub tag convention, not a difference', () => {
  assert.equal(cmp('v1.0.0', '1.0.0'), 0);
  assert.equal(cmp('1.0.0', 'v1.0.0'), 0);
  assert.equal(cmp('v1.0.1', 'v1.0.0'), 1);
});

test('missing fields are zero', () => {
  assert.equal(cmp('1.0', '1.0.0'), 0);
  assert.equal(cmp('1', '1.0.0'), 0);
  assert.equal(cmp('1.0.1', '1.0'), 1);
});

test('equal means equal, which is what suppresses the dialog', () => {
  assert.equal(cmp('1.0.0', '1.0.0'), 0);
  assert.equal(cmp('12.34.56', '12.34.56'), 0);
});

test('the moderate field climbs past 9 — this repo says so explicitly', () => {
  // docs/CHANGELOG.md: "MODERATE can climb past 9 (v1.10.x, v1.11.x) and
  // reaching double digits is NOT a reason to bump MAJOR."
  assert.equal(cmp('v1.11.0', 'v1.2.0'), 1);
  assert.equal(cmp('v1.2.0', 'v1.11.0'), -1);
});
