/* The wipe's shared frame clock — the arithmetic half of the desync fix.
 *
 *     node --test tests/test_wipe_sync.mjs        (or: npm run test:wipe)
 *
 * web/wipe.js is a classic script for the browser, but everything above its
 * `typeof document === 'undefined'` guard is pure and exported under CommonJS
 * precisely so this file can assert on it with no DOM and no canvas.
 *
 * WHAT IS BEING PROVEN. The prototype ran two independently-looping <img>
 * elements, so `growth`'s two sides drifted 1,220 ms per loop — 123 f/2,920 ms
 * against 85 f/1,700 ms — and the wipe silently compared two different moments.
 * The fix is that ONE wall clock T is asked of BOTH sides, and each answers
 * from its OWN delay array. Two loops of different length are then both at the
 * correct point of themselves at every T, forever. That is what these
 * assertions check: not that the two indices are equal (they cannot be), but
 * that each side's index is the one its own timing array demands for
 * `T mod its own total`, and that this holds identically on loop 1 and loop 40
 * rather than drifting.
 *
 * Every delay array here is read from tests/fixtures/frame-timing.json, which
 * `python3 scripts/dump_frame_timing.py --write` derives from the real files in
 * web/assets/. No invented numbers.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const clock = require(path.join(here, '..', 'web', 'wipe.js'));
const TIMING = JSON.parse(readFileSync(path.join(here, 'fixtures', 'frame-timing.json'), 'utf8'));

const delaysOf = (name) => {
  const t = TIMING[name];
  assert.ok(t, `fixture missing ${name} — re-run scripts/dump_frame_timing.py --write`);
  return t.delays;
};

/* The independent oracle: walk the delays from the start, the naive way, and
 * see which frame covers t. If this and the binary search ever disagree, the
 * search is wrong. */
function expectedFrame(delays, t) {
  const total = delays.reduce((a, b) => a + b, 0);
  let r = ((t % total) + total) % total;
  for (let i = 0; i < delays.length; i++) {
    if (r < delays[i]) return i;
    r -= delays[i];
  }
  return delays.length - 1;
}

test('growth: the two sides that actually drifted — 123f/2920ms against 85f/1700ms', () => {
  const src = delaysOf('growth.src.gif');
  const cut = delaysOf('growth.gif');
  assert.equal(src.length, 123);
  assert.equal(cut.length, 85);

  const A = clock.buildTimeline(src);
  const B = clock.buildTimeline(cut);
  assert.equal(A.total, 2920);
  assert.equal(B.total, 1700);
  assert.equal(A.total - B.total, 1220, 'the drift docs/HANDOFF.md measured');

  /* Sampled wall-clock instants, including several past the point where two
   * independent loops would have fallen a whole loop apart. */
  const samples = [0, 1, 19, 20, 21, 850, 1699, 1700, 1701, 2919, 2920, 2921,
                   5000, 12345, 60000, 123456];
  for (const t of samples) {
    const ia = clock.frameAtTime(A, t);
    const ib = clock.frameAtTime(B, t);
    assert.equal(ia, expectedFrame(src, t), `side A at t=${t}`);
    assert.equal(ib, expectedFrame(cut, t), `side B at t=${t}`);
    /* Both sides are inside their own loop's own position — the definition of
     * "the same moment" when the two loops are not the same length. */
    assert.equal(A.offsets[ia] <= t % A.total, true);
    assert.equal(B.offsets[ib] <= t % B.total, true);
  }
});

test('growth: the same instant of the loop gives the same pair on loop 1 and loop 40', () => {
  const A = clock.buildTimeline(delaysOf('growth.src.gif'));
  const B = clock.buildTimeline(delaysOf('growth.gif'));
  /* The common period of the two loops. Under the shared clock, T and
   * T + lcm land on an identical pair; under two free-running <img>s they
   * would not, which is the drift. */
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const lcm = (A.total / gcd(A.total, B.total)) * B.total;
  assert.equal(lcm, 248200);   // gcd(2920,1700)=20, so 146 source loops = 146 x 1700ms
  for (const t of [0, 37, 640, 1699, 2921, 9999]) {
    for (const k of [1, 2, 5, 40]) {
      assert.equal(clock.frameAtTime(A, t), clock.frameAtTime(A, t + lcm * k), `A t=${t} k=${k}`);
      assert.equal(clock.frameAtTime(B, t), clock.frameAtTime(B, t + lcm * k), `B t=${t} k=${k}`);
    }
  }
});

test('growth: hand-computed frames, not just agreement with the oracle', () => {
  const src = delaysOf('growth.src.gif');
  const cut = delaysOf('growth.gif');
  const A = clock.buildTimeline(src);
  const B = clock.buildTimeline(cut);
  /* Both files start on a run of 20 ms frames, so the first stretch is
   * arithmetic anyone can check by hand: frame = floor(t / 20). */
  assert.equal(src.slice(0, 40).every((d) => d === 20), true);
  assert.equal(cut.slice(0, 40).every((d) => d === 20), true);
  for (const t of [0, 19, 20, 39, 40, 100, 400, 799]) {
    assert.equal(clock.frameAtTime(A, t), Math.floor(t / 20), `A t=${t}`);
    assert.equal(clock.frameAtTime(B, t), Math.floor(t / 20), `B t=${t}`);
  }
  /* At t = 1700 the cut side has completed exactly one loop and is back on
   * frame 0 while the source is still 1,220 ms from the end of its own. Two
   * free <img>s would be showing the same thing here by accident and different
   * things everywhere else; one clock makes both answers deliberate. */
  assert.equal(clock.frameAtTime(B, 1700), 0);
  assert.equal(clock.frameAtTime(A, 1700), expectedFrame(src, 1700));
  assert.notEqual(clock.frameAtTime(A, 1700), 0);
});

test('paper-plane: the WebP cut file DOES carry timing — 97f/2400ms, its source 96f/2400ms', () => {
  /* docs/HANDOFF.md says this file "carries no frame durations at all" and
   * drifts 2,400 ms. Pillow cannot read WebP frame durations; webpmux can, and
   * the bytes hold 40, 80, 20, 20 ... totalling exactly the source's 2,400 ms.
   * So the two loops are the same length and never drift at all — the frame
   * counts differ by one, which one clock handles because neither side is ever
   * indexed by the other's count. */
  const webp = delaysOf('paper-plane.webp');
  const src = delaysOf('paper-plane.src.gif');
  assert.equal(webp.length, 97);
  assert.equal(src.length, 96);
  const A = clock.buildTimeline(src);
  const B = clock.buildTimeline(webp);
  assert.equal(A.total, 2400);
  assert.equal(B.total, 2400);
  assert.equal(A.total, B.total, 'no drift once the timing is actually read');
  for (const t of [0, 41, 121, 1200, 2399, 2400, 2401, 48000, 123456]) {
    assert.equal(clock.frameAtTime(A, t), expectedFrame(src, t), `src at t=${t}`);
    assert.equal(clock.frameAtTime(B, t), expectedFrame(webp, t), `webp at t=${t}`);
  }
});

test('megaphone and hurricane: the pairs that already agreed still agree', () => {
  for (const [a, b] of [['megaphone.src.gif', 'megaphone.gif'],
                        ['hurricane.src.gif', 'hurricane.gif']]) {
    const A = clock.buildTimeline(delaysOf(a));
    const B = clock.buildTimeline(delaysOf(b));
    assert.equal(A.total, B.total);
    for (const t of [0, 500, 3019, 3020, 9999, 250000]) {
      assert.equal(clock.frameAtTime(A, t), clock.frameAtTime(B, t), `${a}/${b} at t=${t}`);
    }
  }
});

test('every corpus asset: the search agrees with the naive walk at every frame boundary', () => {
  for (const [name, t] of Object.entries(TIMING)) {
    const tl = clock.buildTimeline(t.delays);
    assert.equal(tl.total, t.total_ms, `${name} total`);
    assert.equal(tl.count, t.frames, `${name} count`);
    for (let i = 0; i < tl.count; i++) {
      const start = tl.offsets[i];
      assert.equal(clock.frameAtTime(tl, start), i, `${name} at the start of frame ${i}`);
      assert.equal(clock.frameAtTime(tl, start + tl.delays[i] - 1), i, `${name} at the end of frame ${i}`);
      /* And a full loop later, unchanged. */
      assert.equal(clock.frameAtTime(tl, start + tl.total * 7), i, `${name} frame ${i} after 7 loops`);
    }
  }
});

test('degenerate timing: zeros, a missing array, one frame, negative t', () => {
  /* A GIF delay of 0 means "as fast as possible"; browsers clamp to 100 ms. */
  const z = clock.buildTimeline([0, 0, 0]);
  assert.deepEqual(z.delays, [100, 100, 100]);
  assert.equal(z.total, 300);
  assert.equal(clock.frameAtTime(z, 250), 2);

  /* A file with no timing at all gets a uniform cadence — the only honest
   * guess — rather than a division by zero. */
  const none = clock.buildTimeline([]);
  assert.equal(none.count, 1);
  assert.equal(clock.frameAtTime(none, 99999), 0);

  /* A single-frame preview (which is what /api/assets/{id}/preview returns) is
   * a still, and asking the clock for any t must not throw. */
  const one = clock.buildTimeline([40]);
  assert.equal(clock.frameAtTime(one, 0), 0);
  assert.equal(clock.frameAtTime(one, 123456), 0);

  /* rAF timestamps are monotonic, but a seek can hand back a negative offset. */
  const g = clock.buildTimeline(delaysOf('growth.gif'));
  assert.equal(clock.frameAtTime(g, -20), expectedFrame(delaysOf('growth.gif'), -20));
  assert.equal(clock.frameAtTime(g, -20), 84);
});

test('timeOfFrame is the inverse of frameAtTime, which is how the film strip seeks', () => {
  const A = clock.buildTimeline(delaysOf('growth.src.gif'));
  const B = clock.buildTimeline(delaysOf('growth.gif'));
  for (const i of [0, 1, 42, 84, 122]) {
    const t = clock.timeOfFrame(A, i);
    assert.equal(clock.frameAtTime(A, t), i, `A round trip on frame ${i}`);
    /* Clicking frame i of the left side puts the right side on whichever of
     * ITS frames covers that instant — a defined answer for every i, including
     * the 38 frames the cut side does not have. */
    const j = clock.frameAtTime(B, t);
    assert.ok(j >= 0 && j < B.count, `B lands in range for A frame ${i}`);
    assert.equal(j, expectedFrame(delaysOf('growth.gif'), t));
  }
});

/* ── the "can the seam help?" gate ──────────────────────────────────────────
 * The measured corpus cases, as pixel counts, fed through the real comparator.
 * See wipe.js's own comment for where these came from. */

function synthPair({ w, h, bbox, differing, delta }) {
  const a = new Uint8ClampedArray(w * h * 4);
  const b = new Uint8ClampedArray(w * h * 4);
  a.fill(255); b.fill(255);
  let left = differing;
  for (let y = bbox[1]; y < bbox[3] && left > 0; y++) {
    for (let x = bbox[0]; x < bbox[2] && left > 0; x++) {
      b[(y * w + x) * 4 + 3] = 255 - delta;
      left--;
    }
  }
  return { a, b };
}

test('the seam gate: the three real ambiguous regions in the corpus land as measured', () => {
  const W = 260, H = 260;

  // megaphone, both counters: 50 differing px in a 9x10 bbox, fully opaque flip.
  const meg = synthPair({ w: W, h: H, bbox: [116, 181, 125, 191], differing: 50, delta: 255 });
  const m1 = clock.compareAlpha(meg.a, meg.b, W, H, [116, 181, 125, 191]);
  assert.equal(m1.differing, 50);
  assert.equal(m1.bboxArea, 90);
  assert.ok(Math.abs(m1.regionFraction - 0.5556) < 0.001, `region ${m1.regionFraction}`);
  assert.ok(Math.abs(m1.canvasFraction - 0.00074) < 0.00001, `canvas ${m1.canvasFraction}`);
  assert.equal(clock.seamCanHelp(m1), false, 'megaphone: 50 px of 67,600 — the card, not the seam');

  // paper-plane: 636 differing px in a 29x29 bbox.
  const pp = synthPair({ w: W, h: H, bbox: [103, 178, 132, 207], differing: 636, delta: 255 });
  const m2 = clock.compareAlpha(pp.a, pp.b, W, H, [103, 178, 132, 207]);
  assert.equal(m2.differing, 636);
  assert.equal(m2.bboxArea, 841);
  assert.ok(Math.abs(m2.canvasFraction - 0.00941) < 0.00001, `canvas ${m2.canvasFraction}`);
  assert.equal(clock.seamCanHelp(m2), true, 'paper-plane: 636 px — the seam can discriminate');

  /* THE FINDING THAT SET THE THRESHOLD: PLAN.md's suggested metric — differing
   * px as a fraction of the region's own area — cannot separate these two,
   * because a protect/remove flip changes the whole enclosed region either way.
   * Both are well above 2%, so a 2% region gate would never fire. */
  assert.ok(m1.regionFraction > 0.02 && m2.regionFraction > 0.02);
});

test('the seam gate: a sub-half-opacity fade is refused even when it is large', () => {
  const W = 260, H = 260;
  /* A ghost at alpha 100 (delta 155, mean 0.61) over an 18x18 patch — 0.48% of
   * the canvas. At full opacity that patch would earn the seam; at 61% it does
   * not, which is the magnitude term doing real work with the area held
   * constant rather than riding along with it. */
  const box = [80, 80, 98, 98];                 // 18 x 18 = 324 px
  const f = synthPair({ w: W, h: H, bbox: box, differing: 324, delta: 155 });
  const m = clock.compareAlpha(f.a, f.b, W, H, box);
  assert.equal(m.differing, 324);
  assert.equal(m.regionFraction, 1);
  assert.ok(Math.abs(m.meanDelta - 155 / 255) < 0.001);
  assert.ok(m.conspicuity < clock.SEAM_MIN_CONSPICUITY, `conspicuity ${m.conspicuity}`);
  assert.equal(clock.seamCanHelp(m), false);

  /* The same area at full opacity clears the gate — the magnitude term is
   * doing real work rather than riding along. */
  const solid = synthPair({ w: W, h: H, bbox: box, differing: 324, delta: 255 });
  assert.equal(clock.seamCanHelp(clock.compareAlpha(solid.a, solid.b, W, H, box)), true);
});

test('the seam gate: two renders that barely differ inside the region are refused', () => {
  const W = 260, H = 260;
  const box = [0, 0, 260, 260];
  /* 130 px changed across the whole frame — a re-quantised edge. Conspicuity
   * alone would be ambiguous; the region-fraction floor PLAN.md specified
   * catches it, which is why both gates are kept. */
  const f = synthPair({ w: W, h: H, bbox: box, differing: 130, delta: 255 });
  const m = clock.compareAlpha(f.a, f.b, W, H, box);
  assert.ok(m.regionFraction < clock.SEAM_MIN_REGION_FRACTION);
  assert.equal(clock.seamCanHelp(m), false);
});

test('the seam gate: dither noise is not a decision', () => {
  const W = 64, H = 64, box = [0, 0, 64, 64];
  /* measure_preview_fidelity.py measured a max alpha delta of 3 between a
   * preview and a full render. Nothing at that level may count as differing. */
  const f = synthPair({ w: W, h: H, bbox: box, differing: 64 * 64, delta: 3 });
  const m = clock.compareAlpha(f.a, f.b, W, H, box);
  assert.equal(m.differing, 0);
  assert.equal(clock.seamCanHelp(m), false);
});

test('a null or silly bbox falls back to the whole frame instead of dividing by zero', () => {
  assert.deepEqual(clock.clampBox(null, 260, 260), [0, 0, 260, 260]);
  assert.deepEqual(clock.clampBox([10, 10, 5, 5], 260, 260), [0, 0, 260, 260]);
  assert.deepEqual(clock.clampBox([-5, -5, 999, 999], 260, 260), [0, 0, 260, 260]);
});

test('the wipe tags name the two answers, never "as it came" / "cut"', () => {
  assert.deepEqual(clock.tagsFor('assume_protect', true, false), { a: 'keep it', b: 'cut it' });
  assert.deepEqual(clock.tagsFor('fade', true, false), { a: 'keep the fade', b: 'cut the fade' });
  /* An unmapped flag still gets its own two values rather than a wrong label. */
  assert.deepEqual(clock.tagsFor('erosion', 1, 3), { a: 'erosion 1', b: 'erosion 3' });
  assert.deepEqual(clock.tagsFor('feather_band', true, false), { a: 'feather band on', b: 'feather band off' });
});
