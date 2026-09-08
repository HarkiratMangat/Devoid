/* Falsifiers for lib/prefs.js. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DEFAULTS, DAY_MS, readPrefs, writePrefs, shouldCheckOnLaunch } = require('../lib/prefs.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'devoid-prefs-'));

test('a missing prefs file reads as the defaults, and the default is ON', () => {
  assert.deepStrictEqual(readPrefs(path.join(tmp(), 'nope')), DEFAULTS);
  assert.strictEqual(DEFAULTS.checkOnLaunch, true);
});

test('a CORRUPT prefs file must not stop the app -- it reads as defaults', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'prefs.json'), '{not json at all');
  assert.deepStrictEqual(readPrefs(d), DEFAULTS);
  fs.writeFileSync(path.join(d, 'prefs.json'), 'null');
  assert.deepStrictEqual(readPrefs(d), DEFAULTS);
  fs.writeFileSync(path.join(d, 'prefs.json'), '[1,2,3]');
  assert.strictEqual(readPrefs(d).checkOnLaunch, true);
});

test('a partial prefs file keeps the defaults for what it does not say', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'prefs.json'), JSON.stringify({ checkOnLaunch: false }));
  assert.deepStrictEqual(readPrefs(d), { checkOnLaunch: false, lastCheck: 0 });
});

test('writePrefs round-trips and creates its directory', () => {
  const d = path.join(tmp(), 'nested', 'deeper');
  assert.strictEqual(writePrefs(d, { checkOnLaunch: false, lastCheck: 42 }), true);
  assert.deepStrictEqual(readPrefs(d), { checkOnLaunch: false, lastCheck: 42 });
});

test('OFF means off, however overdue the check is', () => {
  assert.strictEqual(shouldCheckOnLaunch({ checkOnLaunch: false, lastCheck: 0 }, 1e12), false);
});

test('ON and never checked is due', () => {
  assert.strictEqual(shouldCheckOnLaunch({ checkOnLaunch: true, lastCheck: 0 }, 1e12), true);
});

test('THE THROTTLE: reopening the window does not re-ping GitHub', () => {
  const now = 1e12;
  // `activate` reopens a window without restarting, so this happens all afternoon
  assert.strictEqual(shouldCheckOnLaunch({ checkOnLaunch: true, lastCheck: now - 1000 }, now), false);
  assert.strictEqual(shouldCheckOnLaunch({ checkOnLaunch: true, lastCheck: now - DAY_MS + 1 }, now), false);
  assert.strictEqual(shouldCheckOnLaunch({ checkOnLaunch: true, lastCheck: now - DAY_MS }, now), true);
});

test('A CLOCK THAT WENT BACKWARDS must not wedge the check off forever', () => {
  // a timezone change, a restored backup, a prefs.json copied from another Mac
  const now = 1e12;
  assert.strictEqual(shouldCheckOnLaunch({ checkOnLaunch: true, lastCheck: now + 1e9 }, now), true);
});

test('a garbage lastCheck is treated as never', () => {
  for (const bad of [null, undefined, 'soon', NaN, {}]) {
    assert.strictEqual(shouldCheckOnLaunch({ checkOnLaunch: true, lastCheck: bad }, 1e12), true);
  }
});
