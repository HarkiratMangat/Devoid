/* Falsifiers for lib/deps.js. Every case here can FAIL -- each was run against
 * the defect it names before the fix landed. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { toolPath, brewFormulae, findBrew, engineVerdict, updateVerdict, ENGINE_FLOOR } = require('../lib/deps.js');
const { compareVersions } = require('../lib/versions.js');

const has = (...present) => (p) => present.includes(p);

test('toolPath adds Homebrew to a Finder PATH -- THE defect', () => {
  const finder = '/usr/bin:/bin:/usr/sbin:/sbin';
  assert.strictEqual(
    toolPath(finder, has('/opt/homebrew/bin')),
    '/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin'
  );
});

test('toolPath never duplicates a directory the shell already set', () => {
  const shell = '/opt/homebrew/bin:/usr/bin';
  assert.strictEqual(toolPath(shell, has('/opt/homebrew/bin')), shell);
});

test('toolPath skips a prefix that does not exist on this Mac', () => {
  assert.strictEqual(toolPath('/usr/bin', has('/opt/homebrew/bin')), '/usr/bin:/opt/homebrew/bin');
  assert.strictEqual(toolPath('/usr/bin', has()), '/usr/bin');
});

test('toolPath survives an empty or absent PATH', () => {
  assert.strictEqual(toolPath('', has('/usr/local/bin')), '/usr/local/bin');
  assert.strictEqual(toolPath(undefined, has()), '');
});

test('brewFormulae maps webpmux to webp -- the formula, not the binary', () => {
  assert.deepStrictEqual(brewFormulae(['webpmux']), ['webp']);
});

test('brewFormulae dedupes, sorts, and ignores things brew cannot install', () => {
  assert.deepStrictEqual(
    brewFormulae(['pngquant', 'gifsicle', 'pngquant', 'avif', 'numpy']),
    ['gifsicle', 'pngquant']
  );
});

test('findBrew prefers Apple silicon and returns null when brew is absent', () => {
  assert.strictEqual(findBrew(has('/opt/homebrew/bin/brew', '/usr/local/bin/brew')), '/opt/homebrew/bin/brew');
  assert.strictEqual(findBrew(has('/usr/local/bin/brew')), '/usr/local/bin/brew');
  assert.strictEqual(findBrew(has()), null);
});

test('engineVerdict tells ABSENT from DEGRADED -- they are different sentences', () => {
  const absent = engineVerdict(
    { available: false, missing: ['engine: no engine: $DEVOID_SKILL unset'], engine_version: 'unavailable' },
    compareVersions
  );
  assert.strictEqual(absent.state, 'absent');
  assert.match(absent.engineError, /DEVOID_SKILL unset/);

  const degraded = engineVerdict(
    { available: true, missing: ['gifsicle', 'webpmux'], engine_version: '6.4.1' },
    compareVersions
  );
  assert.strictEqual(degraded.state, 'degraded');
  assert.deepStrictEqual(degraded.binaries, ['gifsicle', 'webpmux']);
});

test('engineVerdict reports the binaries even when the engine is absent', () => {
  const v = engineVerdict(
    { available: false, missing: ['engine: nothing here', 'pngquant'], engine_version: 'unavailable' },
    compareVersions
  );
  assert.strictEqual(v.state, 'absent');
  assert.deepStrictEqual(v.binaries, ['pngquant']);
});

test('engineVerdict does not treat avif as a binary or a failure', () => {
  const v = engineVerdict({ available: true, missing: ['avif'], engine_version: '6.4.1' }, compareVersions);
  assert.strictEqual(v.state, 'ok');
  assert.deepStrictEqual(v.binaries, []);
});

test('engineVerdict catches an engine below the floor, and passes the floor itself', () => {
  assert.strictEqual(
    engineVerdict({ available: true, missing: [], engine_version: '6.3.2' }, compareVersions).state, 'stale');
  assert.strictEqual(
    engineVerdict({ available: true, missing: [], engine_version: ENGINE_FLOOR }, compareVersions).state, 'ok');
  // ⚠️ the string-compare trap lib/versions.js exists for: 6.10.0 is NEWER.
  assert.strictEqual(
    engineVerdict({ available: true, missing: [], engine_version: '6.10.0' }, compareVersions).state, 'ok');
});

test('engineVerdict stays UNKNOWN when the server said nothing -- never a dialog', () => {
  for (const bad of [null, undefined, 'nope', 42]) {
    assert.strictEqual(engineVerdict(bad, compareVersions).state, 'unknown');
  }
});

test('updateVerdict says AHEAD when the tag is newer than the newest release', () => {
  // 🔴 THE LIVE CASE: the engine repo's newest release is v6.3.0 and its newest
  // tag is v6.4.1. A boolean check would offer a DOWNGRADE.
  assert.strictEqual(updateVerdict('6.4.1', 'v6.3.0', compareVersions), 'ahead');
});

test('updateVerdict says BEHIND only when it really is', () => {
  assert.strictEqual(updateVerdict('6.2.0', 'v6.3.0', compareVersions), 'behind');
  assert.strictEqual(updateVerdict('6.3.0', 'v6.3.0', compareVersions), 'current');
  assert.strictEqual(updateVerdict('v6.3.0', '6.3.0', compareVersions), 'current');
});

test('updateVerdict does not fall for a string compare across a tens boundary', () => {
  assert.strictEqual(updateVerdict('6.10.0', 'v6.9.0', compareVersions), 'ahead');
  assert.strictEqual(updateVerdict('6.9.0', 'v6.10.0', compareVersions), 'behind');
});

test('updateVerdict stays UNKNOWN when either side is missing', () => {
  assert.strictEqual(updateVerdict(null, 'v6.3.0', compareVersions), 'unknown');
  assert.strictEqual(updateVerdict('6.3.0', null, compareVersions), 'unknown');
  assert.strictEqual(updateVerdict('unavailable', 'v6.3.0', compareVersions), 'behind'); // parses to 0.0.0
});
