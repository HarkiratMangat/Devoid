/* Falsifiers for web/regionmask.js's colour-tolerance test -- the piece that
 * decides which pixels inside a disputed bbox actually get marked, replacing
 * a plain rectangle. Only the DOM-free colour math is testable here; the
 * canvas-drawing half needs a browser and is exercised by gate:ui instead. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { hexToRgb, pixelMatchesHex, DEFAULT_TOLERANCE } = require('../web/regionmask.js');

test('hexToRgb parses with or without a leading #', () => {
  assert.deepStrictEqual(hexToRgb('002864'), { r: 0, g: 40, b: 100 });
  assert.deepStrictEqual(hexToRgb('#002864'), { r: 0, g: 40, b: 100 });
});

test('pixelMatchesHex is true for the exact colour -- THE case this exists for', () => {
  assert.strictEqual(pixelMatchesHex(0, 40, 100, '002864'), true);
});

test('pixelMatchesHex is false for a colour far outside tolerance', () => {
  // white next to the corpus's navy outline colour -- background, not the region
  assert.strictEqual(pixelMatchesHex(255, 255, 255, '002864'), false);
});

test('pixelMatchesHex tolerance is inclusive at the boundary, exclusive just past it', () => {
  const t = DEFAULT_TOLERANCE;
  assert.strictEqual(pixelMatchesHex(0, 40, 100 - t, '002864', t), true);
  assert.strictEqual(pixelMatchesHex(0, 40, 100 - t - 1, '002864', t), false);
});

test('a caller-supplied tolerance overrides the default, in both directions', () => {
  assert.strictEqual(pixelMatchesHex(0, 40, 130, '002864', 30), true);   // 30px off, tol 30: match
  assert.strictEqual(pixelMatchesHex(0, 40, 130, '002864', 10), false);  // same pixel, tol 10: no
});
