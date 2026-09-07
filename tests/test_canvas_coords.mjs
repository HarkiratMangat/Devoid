/* Devoid — 4.1's falsifier, written before the feature it tests.
 *
 * The canvas is displayed at whatever size the layout gives it; the engine works
 * in SOURCE pixels. A half-pixel error there is invisible on screen and permanent
 * in the output, so "close enough" is not a passing grade: a source pixel must
 * survive the round trip to display space and back EXACTLY.
 *
 * Run: node tests/test_canvas_coords.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { displayToSource, sourceToDisplay, artRect } = require('../web/canvas.js');

let checks = 0;
const ok = () => { checks++; };

/* Every case is (source size, display box). The display box carries a non-zero
 * origin wherever it can, because the real one is an offset rect inside #stage
 * and an origin bug is exactly what a 0,0-only test cannot see. */
const CASES = [
  // the corpus: eight 260x260 assets, measured with PIL, not assumed
  ['corpus 260 shrunk to 200',    260,  260, { x: 0,   y: 0,    width: 200,   height: 200 }],
  ['corpus 260 at .wipe 560',     260,  260, { x: 37,  y: 91,   width: 560,   height: 560 }],
  ['corpus 260 pixel-for-pixel',  260,  260, { x: 12,  y: 5,    width: 260,   height: 260 }],
  // PLAN's edge-case table: "a 1920x480 banner letterboxes into a square"
  ['1920x480 banner into square', 1920, 480, { x: 8,   y: 8,    width: 560,   height: 560 }],
  // and the other way: a square source into a wide box, plus a tall source
  ['260 square into a wide box',  260,  260, { x: 3,   y: 17,   width: 900,   height: 300 }],
  ['1920x480 into a wide box',    1920, 480, { x: 3,   y: 17,   width: 900,   height: 300 }],
  ['480x1920 tall into square',   480,  1920, { x: 0,  y: 0,    width: 560,   height: 560 }],
  // a scale that is not a tidy fraction, so nothing passes by luck
  ['260 at an awkward 337.5',     260,  260, { x: 1.5, y: 2.25, width: 337.5, height: 337.5 }],
];

function gridFor(sw, sh) {
  const pts = [
    [0, 0], [sw, 0], [0, sh], [sw, sh],               // the four corners
    [Math.round(sw / 2), Math.round(sh / 2)],          // the centre
    [1, 1], [sw - 1, sh - 1], [1, sh - 1], [sw - 1, 1],
  ];
  // several arbitrary interior points, deterministic so a failure is reproducible
  let seed = 7;
  const next = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % (n + 1);
  };
  for (let i = 0; i < 24; i++) pts.push([next(sw), next(sh)]);
  return pts;
}

for (const [name, sw, sh, rect] of CASES) {
  const grid = gridFor(sw, sh);
  for (const [sx, sy] of grid) {
    const d = sourceToDisplay({ x: sx, y: sy }, rect, sw, sh);
    const back = displayToSource(d, rect, sw, sh);
    assert.deepEqual(
      [back.x, back.y], [sx, sy],
      `${name}: source (${sx},${sy}) -> display (${d.x},${d.y}) -> source (${back.x},${back.y}) — not the pixel it started on`,
    );
    ok();
  }
  console.log(`  ok  ${name} — ${grid.length} points round-trip exactly`);
}

/* The letterbox itself, not just its inverse. An implementation that scaled x and
 * y independently, or that ignored aspect entirely, would still pass the round
 * trip above, because it would be consistently wrong in both directions. This is
 * the check that catches it. */
{
  const r = artRect({ x: 0, y: 0, width: 560, height: 560 }, 1920, 480);
  assert.equal(r.width, 560, 'a 4:1 banner fills the width of a square box');
  assert.equal(r.height, 140, 'and is 140 tall, not 560');
  assert.equal(r.x, 0);
  assert.equal(r.y, 210, 'letterboxed: (560-140)/2 of bar above and below');
  const topLeft = sourceToDisplay({ x: 0, y: 0 }, { x: 0, y: 0, width: 560, height: 560 }, 1920, 480);
  assert.deepEqual([topLeft.x, topLeft.y], [0, 210],
    'source (0,0) lands on the letterboxed art, not on the container corner');
  console.log('  ok  the letterbox is measured, not assumed — 1920x480 into 560x560 is 560x140 at y=210');
  ok(); ok();
}

/* A click on the letterbox bar is outside the artwork, and must clamp into it
 * rather than hand the engine a negative source pixel it would silently accept. */
{
  const rect = { x: 0, y: 0, width: 560, height: 560 };
  assert.equal(displayToSource({ x: 280, y: 4 }, rect, 1920, 480).y, 0,
    'a point above the art clamps to source row 0');
  assert.equal(displayToSource({ x: 280, y: 556 }, rect, 1920, 480).y, 480,
    'a point below the art clamps to the source height');
  assert.equal(displayToSource({ x: -100, y: 280 }, rect, 260, 260).x, 0,
    'and a point left of a pillarboxed square clamps to column 0');
  console.log('  ok  points outside the artwork clamp into it instead of going negative');
  ok();
}

console.log(`\nPASS — ${checks} coordinate assertions, exact to the source pixel.`);
