/* Devoid — Stage 3: the wipe, and what it unlocks.  (PLAN.md 3.0a–3.5)

   WHAT THIS FILE OWNS
   - The answer-pair wipe. Two RENDERS OF THE TWO ANSWERS behind one draggable
     seam, fetched from POST /api/assets/{id}/preview. Not a before/after.
   - Canvas frame decoding driven by ONE shared wall clock, which is the fix for
     the two sides drifting apart.
   - The question card: the fallback used only when the two renders are too
     alike for a seam to discriminate.
   - The ledger, fed by the real ledger_a / ledger_b from the preview response.

   TWO MEASURED BUGS THIS REPLACES — both are in docs/HANDOFF.md.

   (1) THE WRONG PAIR. The prototype put the untouched source on the left and
       the cut output on the right. Both candidate answers look identical on the
       source side, so a before/after cannot discriminate between them. The pair
       is now `--assume-protect` against `--assume-remove` (or any other flag's
       two values — see loadPair).

   (2) DESYNC. Two independently-looping <img> elements cannot be synchronised;
       `growth` drifts 1,220 ms per loop (123 f / 2,920 ms source against
       85 f / 1,700 ms cut). The fix is structural: every side is decoded to
       frames, and ONE clock asks each side "which of YOUR frames belongs to
       wall-clock T?". Both sides therefore show the same moment by
       construction, not by the coincidence of matching loop lengths. Note that
       two sides of different total length are still both correct at T — a side
       is at `T mod its own total`, which is what "the same moment" means for
       loops that are not the same length.

   ⚠️ ONE HANDOFF CLAIM IS WRONG AND IS CORRECTED HERE. HANDOFF.md says
   paper-plane's cut WebP "carries no frame durations at all". The bytes carry
   them: `webpmux -info web/assets/paper-plane.webp` lists 40, 80, 20, 20 … for
   97 frames totalling 2,400 ms — exactly its source's total. Pillow's WebP
   plugin does not expose per-frame `duration`, which is where the claim came
   from. Any decoder that reads the container (the browser's ImageDecoder does)
   gets the real timing, so that half of the desync bug is fixed by using a real
   decoder rather than by working around missing data.

   MODULE SHAPE. Loaded as a classic script by web/index.html, whose structure
   is frozen. It also exports its pure functions under CommonJS so
   tests/test_wipe_sync.mjs can assert the clock's arithmetic with no DOM.
   Everything that touches `document` is behind the guard at the bottom. */

(function (root) {
  'use strict';

  /* ══ PURE: the shared frame clock ═══════════════════════════════════════
     No DOM, no decoder. This is the whole desync fix and it is unit-tested. */

  /* GIF89a says a delay of 0 means "as fast as possible"; every browser clamps
     it to 100 ms, so we do too. It is also the fallback for a file that really
     does carry no timing — a uniform cadence is the only honest guess, and the
     caller is told (see decode()'s `timingSynthesised`). */
  var DEFAULT_DELAY_MS = 100;

  function normalizeDelays(raw, fallbackMs) {
    var fb = fallbackMs > 0 ? fallbackMs : DEFAULT_DELAY_MS;
    if (!Array.isArray(raw) || raw.length === 0) return [fb];
    return raw.map(function (d) {
      return typeof d === 'number' && isFinite(d) && d > 0 ? d : fb;
    });
  }

  /* A timeline is a side's own timing, turned into cumulative offsets so
     "which frame is showing at T" is a search rather than a walk. */
  function buildTimeline(rawDelays, fallbackMs) {
    var delays = normalizeDelays(rawDelays, fallbackMs);
    var offsets = new Array(delays.length);
    var t = 0;
    for (var i = 0; i < delays.length; i++) {
      offsets[i] = t;
      t += delays[i];
    }
    return { delays: delays, offsets: offsets, total: t, count: delays.length };
  }

  /* The one function both sides call with the SAME t. Each side answers from
     its own timeline, so a 1,700 ms loop and a 2,920 ms loop are both at the
     correct point of themselves at every instant, forever. */
  function frameAtTime(tl, tMs) {
    if (!tl || !tl.count) return 0;
    if (tl.count === 1 || !(tl.total > 0)) return 0;
    var t = tMs % tl.total;
    if (t < 0) t += tl.total;
    var lo = 0, hi = tl.count - 1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (tl.offsets[mid] <= t) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  /* The time at which a given frame starts. Used to seek from the film strip:
     click frame 42 on the left and the right side lands on whatever frame of
     ITS OWN covers that instant, which is the only meaningful answer. */
  function timeOfFrame(tl, index) {
    if (!tl || !tl.count) return 0;
    var i = index % tl.count;
    if (i < 0) i += tl.count;
    return tl.offsets[i];
  }

  /* ══ PURE: "can the seam help?"  (PLAN.md 3.0b) ═════════════════════════

     MEASURED, on the real corpus, 2026-09-04 — this is the render PLAN.md
     insists the number be picked in front of. Every ambiguous-protection
     region in the eight shipped assets, found as a transparent component of
     the cut output that does not touch the border (which is exactly the
     enclosed counter the protect/remove question is about):

       megaphone  region 1   50 px in a  9x10 bbox   region 0.556   canvas 0.074%
       megaphone  region 2   50 px in a  9x10 bbox   region 0.556   canvas 0.074%
       paper-plane           636 px in a 29x29 bbox  region 0.756   canvas 0.941%
       galaxy · growth · hurricane · rocket · satellite · secure — none

     THE FINDING THAT CHANGED THE DESIGN: the fraction of the region's OWN area
     that differs is 0.556–0.756 for every real case, and it cannot be small,
     because flipping protect to remove changes the whole enclosed region by
     construction. A 2% region-fraction gate therefore never fires — and it
     fires least on precisely the case it was meant to catch, since a 3 px
     sliver that flips entirely is 100% different within its own 3 px bbox.
     PLAN.md's suggested metric is degenerate for this question. Measurement is
     why we know that rather than shipping a threshold that never fires.

     What does separate the two real classes is how much of what the eye is
     looking at changes: 0.074% of the canvas against 0.941%, an order of
     magnitude, with the megaphone counters being exactly the "seam cannot
     help" case (50 px of 67,600 — a 15 px blob at the wipe's 560 px render).

     So the gate is CONSPICUITY = (differing px / canvas px) x (mean |Δalpha| /
     255), and the threshold is 0.003. Why 0.003: it is about the geometric
     mean of the two measured classes (0.00074 and 0.00941 → 0.00264), and at
     the wipe's rendered size it is ~940 device px, near a 31x31 patch, which
     is about the smallest area a person can actually judge across a dragged
     seam. The mean-Δalpha term is what catches the OTHER case PLAN.md names,
     the sub-half-opacity fade: a ghost at alpha 100 scores 0.39, so it needs
     to cover more than 2.5x the area of an opaque change to earn the seam.

     PLAN.md's region fraction is kept as an independent floor at its original
     0.02, because it does catch a case conspicuity does not: two renders that
     barely differ even inside the disputed region — a re-quantised edge, a
     one-level erosion change. Both gates must pass for the seam. */
  var SEAM_MIN_REGION_FRACTION = 0.02;
  var SEAM_MIN_CONSPICUITY = 0.003;
  /* Below this, a per-pixel alpha difference is dither and antialiasing noise
     rather than a decision. `measure_preview_fidelity.py` measured a max delta
     of 3 between a preview and a full 8-bit-alpha render. 8 is that with room. */
  var ALPHA_EPS = 8;

  function clampBox(bbox, width, height) {
    if (!bbox || bbox.length !== 4) return [0, 0, width, height];
    var x0 = Math.max(0, Math.min(width, Math.round(bbox[0])));
    var y0 = Math.max(0, Math.min(height, Math.round(bbox[1])));
    var x1 = Math.max(0, Math.min(width, Math.round(bbox[2])));
    var y1 = Math.max(0, Math.min(height, Math.round(bbox[3])));
    if (x1 <= x0 || y1 <= y0) return [0, 0, width, height];
    return [x0, y0, x1, y1];
  }

  /* aData / bData are RGBA Uint8ClampedArrays of the same width x height. */
  function compareAlpha(aData, bData, width, height, bbox) {
    var box = clampBox(bbox, width, height);
    var differing = 0, deltaSum = 0;
    for (var y = box[1]; y < box[3]; y++) {
      var row = y * width;
      for (var x = box[0]; x < box[2]; x++) {
        var i = (row + x) * 4 + 3;
        var d = aData[i] - bData[i];
        if (d < 0) d = -d;
        if (d > ALPHA_EPS) { differing++; deltaSum += d; }
      }
    }
    var bboxArea = (box[2] - box[0]) * (box[3] - box[1]);
    var canvasArea = width * height;
    var meanDelta = differing ? (deltaSum / differing) / 255 : 0;
    var canvasFraction = canvasArea ? differing / canvasArea : 0;
    return {
      bbox: box,
      differing: differing,
      bboxArea: bboxArea,
      canvasArea: canvasArea,
      regionFraction: bboxArea ? differing / bboxArea : 0,
      canvasFraction: canvasFraction,
      meanDelta: meanDelta,
      conspicuity: canvasFraction * meanDelta
    };
  }

  function seamCanHelp(m, opts) {
    var o = opts || {};
    var minRegion = o.minRegionFraction != null ? o.minRegionFraction : SEAM_MIN_REGION_FRACTION;
    var minCons = o.minConspicuity != null ? o.minConspicuity : SEAM_MIN_CONSPICUITY;
    return m.regionFraction >= minRegion && m.conspicuity >= minCons;
  }

  /* ══ PURE: what the two sides are called ════════════════════════════════
     The tags name the two ANSWERS, never "as it came" / "cut". A flag we have
     no phrasing for still gets its own two values rather than a lie. */
  var TAGS = {
    assume_protect: { a: 'keep it', b: 'cut it' },
    assume_remove: { a: 'keep it', b: 'cut it' },
    protection: { a: 'keep it', b: 'cut it' },
    fade: { a: 'keep the fade', b: 'cut the fade' },
    fade_recover: { a: 'keep the fade', b: 'cut the fade' },
    dither: { a: 'dither', b: 'no dither' }
  };

  function tagsFor(flag, valueA, valueB) {
    var t = TAGS[flag];
    if (t) return { a: t.a, b: t.b };
    var fmt = function (v) {
      if (v === true) return 'on';
      if (v === false || v == null) return 'off';
      return String(v);
    };
    var name = String(flag || 'setting').replace(/_/g, ' ');
    return { a: name + ' ' + fmt(valueA), b: name + ' ' + fmt(valueB) };
  }

  /* ══ the CommonJS surface, so the clock can be tested without a browser ══ */
  var PURE = {
    DEFAULT_DELAY_MS: DEFAULT_DELAY_MS,
    SEAM_MIN_REGION_FRACTION: SEAM_MIN_REGION_FRACTION,
    SEAM_MIN_CONSPICUITY: SEAM_MIN_CONSPICUITY,
    ALPHA_EPS: ALPHA_EPS,
    normalizeDelays: normalizeDelays,
    buildTimeline: buildTimeline,
    frameAtTime: frameAtTime,
    timeOfFrame: timeOfFrame,
    clampBox: clampBox,
    compareAlpha: compareAlpha,
    seamCanHelp: seamCanHelp,
    tagsFor: tagsFor
  };
  if (typeof module === 'object' && module && module.exports) module.exports = PURE;
  if (typeof document === 'undefined') return;   // Node: the pure half is all there is.

  /* ══════════════════════════════════════════════════════════════════════
     Everything below needs a document.
     ══════════════════════════════════════════════════════════════════════ */

  var $ = function (s) { return document.querySelector(s); };

  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: function () {} };

  /* ── decoding ──────────────────────────────────────────────────────────
     One job: URL in, {frames, delays, width, height} out, with the file's OWN
     timing. Frames are rasterised to their own canvases so drawing a frame is
     a blit and seeking is free.

     ImageDecoder (WebCodecs) first — it is native to the Chromium that Electron
     ships, it handles GIF, WebP, APNG and AVIF, and it reads the per-frame
     durations out of the container, which is the thing the Pillow-based
     measurement could not do for paper-plane. gifuct-js (vendored to
     web/vendor/gifuct.js, see `npm run vendor:gifuct`) is the GIF-only fallback
     for a runtime without it. A still image is a one-frame animation. */

  var MAX_FRAMES = 400;   // the longest corpus asset is 177; this is a guard,
                          // not a policy, and it is reported when it bites.

  function blankCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function typeOf(url, headerType) {
    if (headerType && headerType.indexOf('image/') === 0) return headerType.split(';')[0].trim();
    var ext = String(url).split('?')[0].split('.').pop().toLowerCase();
    return { gif: 'image/gif', webp: 'image/webp', png: 'image/png', apng: 'image/apng',
             avif: 'image/avif', jpg: 'image/jpeg', jpeg: 'image/jpeg' }[ext] || 'image/gif';
  }

  async function decodeWithImageDecoder(buf, mime) {
    var dec = new window.ImageDecoder({ data: buf, type: mime });
    await dec.tracks.ready;
    var track = dec.tracks.selectedTrack;
    var count = Math.min(track && track.frameCount ? track.frameCount : 1, MAX_FRAMES);
    var frames = [], delays = [], w = 0, h = 0, sawDuration = false;
    for (var i = 0; i < count; i++) {
      var res = await dec.decode({ frameIndex: i, completeFramesOnly: true });
      var vf = res.image;
      if (!w) { w = vf.displayWidth || vf.codedWidth; h = vf.displayHeight || vf.codedHeight; }
      var c = blankCanvas(w, h);
      c.getContext('2d').drawImage(vf, 0, 0, w, h);
      frames.push(c);
      // VideoFrame.duration is microseconds, and is null when the container
      // carries no timing for that frame.
      var d = vf.duration != null ? vf.duration / 1000 : 0;
      if (d > 0) sawDuration = true;
      delays.push(d);
      vf.close();
    }
    dec.close();
    return { frames: frames, delays: delays, width: w, height: h,
             timingSynthesised: !sawDuration, decoder: 'ImageDecoder' };
  }

  /* gifuct hands back PATCHES plus a disposal method, so composition is ours.
     Disposal 2 clears the patch rectangle to transparent before the next frame;
     disposal 3 restores what was there before this frame was drawn. Getting
     this wrong shows up as smearing, which is why it is written out rather
     than assumed. */
  /* index.html's structure is frozen, so the vendored bundle is not in a
     <script> tag there. It is injected on first need instead, which also means
     a runtime with ImageDecoder never pays for it. */
  var gifuctLoading = null;
  function loadGifuct() {
    if (window.gifuct) return Promise.resolve(window.gifuct);
    if (gifuctLoading) return gifuctLoading;
    gifuctLoading = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'vendor/gifuct.js';
      s.onload = function () { res(window.gifuct); };
      s.onerror = function () { rej(new Error('vendor/gifuct.js failed to load')); };
      document.head.append(s);
    });
    return gifuctLoading;
  }

  function decodeWithGifuct(buf) {
    var g = window.gifuct;
    if (!g || !g.parseGIF) throw new Error('gifuct not loaded');
    var gif = g.parseGIF(buf);
    var raw = g.decompressFrames(gif, true);
    var w = gif.lsd.width, h = gif.lsd.height;
    var stage = blankCanvas(w, h), sctx = stage.getContext('2d');
    var patch = blankCanvas(w, h), pctx = patch.getContext('2d');
    var frames = [], delays = [], prev = null;
    for (var i = 0; i < raw.length && i < MAX_FRAMES; i++) {
      var f = raw[i];
      if (f.disposalType === 3) prev = sctx.getImageData(0, 0, w, h);
      patch.width = f.dims.width; patch.height = f.dims.height;
      pctx.putImageData(new ImageData(f.patch, f.dims.width, f.dims.height), 0, 0);
      sctx.drawImage(patch, f.dims.left, f.dims.top);
      var out = blankCanvas(w, h);
      out.getContext('2d').drawImage(stage, 0, 0);
      frames.push(out);
      delays.push(f.delay > 0 ? f.delay : 0);   // gifuct already reports ms
      if (f.disposalType === 2) sctx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
      else if (f.disposalType === 3 && prev) sctx.putImageData(prev, 0, 0);
    }
    return { frames: frames, delays: delays, width: w, height: h,
             timingSynthesised: !delays.some(function (d) { return d > 0; }),
             decoder: 'gifuct-js' };
  }

  async function decodeStill(url) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise(function (res, rej) { img.onload = res; img.onerror = rej; img.src = url; });
    var w = img.naturalWidth, h = img.naturalHeight;
    var c = blankCanvas(w, h);
    c.getContext('2d').drawImage(img, 0, 0);
    return { frames: [c], delays: [DEFAULT_DELAY_MS], width: w, height: h,
             timingSynthesised: true, decoder: 'img' };
  }

  var decodeCache = new Map();

  async function decode(url) {
    if (decodeCache.has(url)) return decodeCache.get(url);
    var p = (async function () {
      var resp = await fetch(url);
      if (!resp.ok) throw new Error('preview fetch failed: ' + resp.status + ' ' + url);
      var buf = await resp.arrayBuffer();
      var mime = typeOf(url, resp.headers.get('content-type'));
      if (typeof window.ImageDecoder === 'function') {
        try { return await decodeWithImageDecoder(buf, mime); } catch (e) { /* fall through */ }
      }
      if (mime === 'image/gif') {
        try { await loadGifuct(); return decodeWithGifuct(buf); } catch (e) { /* fall through */ }
      }
      return await decodeStill(url);
    })();
    decodeCache.set(url, p);
    return p;
  }

  function prepare(decoded) {
    var tl = buildTimeline(decoded.delays, DEFAULT_DELAY_MS);
    return {
      frames: decoded.frames, width: decoded.width, height: decoded.height,
      timeline: tl, timingSynthesised: decoded.timingSynthesised,
      decoder: decoded.decoder, shown: -1
    };
  }

  /* ── the wipe's own state ──────────────────────────────────────────────── */

  var W = {
    a: null, b: null,          // prepared sides
    canvasA: null, canvasB: null,
    raf: 0, t0: 0, held: null, // held = a frozen wall-clock offset, or null
    asset: null, flag: null, valueA: null, valueB: null, regions: null,
    metric: null, ledgerA: null, ledgerB: null, formatIsGif: false
  };

  function mountCanvases() {
    if (W.canvasA) return;
    var wipe = $('#wipe'); if (!wipe) return;
    /* Hand the element over cleanly: web/app.js keeps its own drag listeners
       attached (harmless, since dragging only ever touches the shared --seam
       CSS variable both the old <img> and these canvases read) as a fallback
       for the window before this module loads, but there is no reason to keep
       them once we are actually driving the content. */
    if (window.Devoid && typeof window.Devoid.releaseWipe === 'function') {
      window.Devoid.releaseWipe();
    }
    var before = $('#before'), after = $('#after');
    W.canvasA = document.createElement('canvas');
    W.canvasA.id = 'wipe-a';
    W.canvasB = document.createElement('canvas');
    W.canvasB.id = 'wipe-b';
    W.canvasB.className = 'after';           // reuses .wipe .after's clip-path
    W.canvasA.setAttribute('aria-hidden', 'true');
    W.canvasB.setAttribute('aria-hidden', 'true');
    if (before) { before.hidden = true; before.removeAttribute('src'); }
    if (after) { after.hidden = true; after.removeAttribute('src'); }
    /* ⚠️ Clear `data-single`, or there is no seam. app.js sets that attribute
       when it has only ONE image to show, and CSS then hides `.seam`,
       `.wipetag.r`, `.after` and `.aftbg` (app.css's `.wipe[data-single]`
       block). Once this module owns the element app.js's branch stops running,
       so the attribute it last set stays forever — and the answer pair
       rendered as a single picture with one label, which is exactly what the
       seam existing is supposed to replace. We always have two sides. */
    wipe.removeAttribute('data-single');
    var seam = $('#seam');
    wipe.insertBefore(W.canvasA, seam || null);
    wipe.insertBefore(W.canvasB, seam || null);
  }

  function paint(side, canvas, tMs) {
    if (!side || !canvas) return;
    var i = frameAtTime(side.timeline, tMs);
    if (i === side.shown) return;
    side.shown = i;
    if (canvas.width !== side.width) { canvas.width = side.width; canvas.height = side.height; }
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(side.frames[i], 0, 0);
  }

  /* ONE clock. Both sides are asked the same t, and each answers from its own
     timeline. That is the whole of the desync fix. */
  function tick(now) {
    W.raf = requestAnimationFrame(tick);
    var t = W.held != null ? W.held : (now - W.t0);
    paint(W.a, W.canvasA, t);
    paint(W.b, W.canvasB, t);
  }

  function start() {
    stop();
    W.t0 = performance.now();
    if (reduceMotion.matches) {
      /* prefers-reduced-motion: FREEZE, do not "reduce". A canvas redraw loop is
         invisible to CSS transition-duration, so the only honest answer is to
         stop advancing frames. Opacity and the rubylith wash keep their meaning
         because nothing about them depends on the clock. The held frame is the
         middle of the longer side, which is what measure_ledger.py samples and
         so is the frame the ledger's numbers describe. */
      W.held = representativeTime();
      paint(W.a, W.canvasA, W.held);
      paint(W.b, W.canvasB, W.held);
      return;
    }
    W.held = null;
    W.raf = requestAnimationFrame(tick);
  }

  function representativeTime() {
    var ta = W.a ? W.a.timeline.total : 0, tb = W.b ? W.b.timeline.total : 0;
    return Math.max(ta, tb) / 2;
  }

  function stop() {
    if (W.raf) cancelAnimationFrame(W.raf);
    W.raf = 0;
  }

  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function () { if (W.a && W.b) start(); });
  }

  /* Seek — the hook the film strip needs. `index` is a frame of side A (the
     left half of the seam, which is the side the strip counts). The right side
     lands on whichever of ITS frames covers that instant. */
  function seekToFrame(index) {
    if (!W.a) return;
    W.held = timeOfFrame(W.a.timeline, index);
    W.a.shown = W.b.shown = -1;
    paint(W.a, W.canvasA, W.held);
    paint(W.b, W.canvasB, W.held);
    stop();
  }

  function play() { if (W.a && W.b) start(); }
  function pause() { if (W.raf) { W.held = performance.now() - W.t0; stop(); } }

  /* ── the ledger  (PLAN.md 3.5) ─────────────────────────────────────────
     Both sides' numbers, so the ledger is part of the comparison rather than a
     single readout. ⚠️ A BLANK LEDGER IS THE "not checked" STATE and that rule
     is not negotiable: no ledger data means the amber sentence, never a zero. */

  var fmt = function (n) { return Number(n).toLocaleString(); };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function ledgerHas(l) {
    return l && typeof l === 'object' &&
      typeof l.bg === 'number' && typeof l.total === 'number';
  }

  function renderLedger(ledgerA, ledgerB, tags) {
    var L = $('#ledger'); if (!L) return;
    L.replaceChildren();
    if (!ledgerHas(ledgerA) && !ledgerHas(ledgerB)) {
      L.append(el('span', 'blank', 'not checked — nothing was measured on this one'));
      return;
    }
    var side = function (label, l) {
      if (!ledgerHas(l)) {
        L.append(el('span', 'blank', label + ' · not checked'));
        return;
      }
      var g = el('span', null, '');
      g.append(el('b', null, label + ' '));
      g.append(document.createTextNode('removes ' + fmt(l.bg) + ' background px · '));
      /* ⚠️ `art` is a CEILING. It counts every source pixel that differed from
         the corner colour and ended up transparent, so it includes the
         antialiasing ramp the keyer is meant to remove. Comparable BETWEEN the
         two sides of this very seam, which is exactly what it is used for
         here; never quotable as absolute damage. Hence "at most".
         ⚠️ There is deliberately NO loss/safe threshold on this number. The
         prototype coloured it against an invented 500, and colouring the app's
         honesty widget by a number with no basis is the failure this project
         is built against. The comparison IS the signal: the two sides are side
         by side, so the larger one is legible without a verdict colour. */
      if (typeof l.art === 'number') {
        g.append(el('span', null, 'at most ' + fmt(l.art) + ' artwork px lost · '));
      }
      g.append(document.createTextNode(fmt(l.total) + ' px of artwork survive'));
      L.append(g);
    };
    side(tags && tags.a ? tags.a : 'A', ledgerA);
    side(tags && tags.b ? tags.b : 'B', ledgerB);
    if (W.formatIsGif) {
      L.append(el('span', 'blank',
        'preview is 8-bit alpha · the GIF output will dither these edges differently'));
    }
  }

  /* ── the question card  (PLAN.md 3.0b) ─────────────────────────────────
     Used only when seamCanHelp() says no. It draws the disputed region on a
     still frame, boxed and hatched — the same diagonal hatch DESIGN.md
     specifies for material about to be removed, drawn on the canvas rather
     than as a CSS repeating gradient so it stays hue-independent without
     adding a second decorative-stripe finding to the detector. */

  function drawHatchedRegion(host, side, bbox) {
    host.replaceChildren();
    var w = side.width, h = side.height;
    var c = blankCanvas(w, h);
    c.className = 'qcard-canvas';
    var ctx = c.getContext('2d');
    var i = frameAtTime(side.timeline, representativeTime());
    ctx.drawImage(side.frames[i], 0, 0);

    var css = getComputedStyle(document.documentElement);
    var ruby = (css.getPropertyValue('--ruby') || '#E2402A').trim();
    var x0 = bbox[0], y0 = bbox[1], bw = bbox[2] - bbox[0], bh = bbox[3] - bbox[1];
    /* Pad the box out so a nine-pixel counter is still a thing you can see. */
    var pad = Math.max(6, Math.round(Math.min(w, h) * 0.02));
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
    bw = Math.min(w - x0, bw + pad * 2); bh = Math.min(h - y0, bh + pad * 2);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, bw, bh);
    ctx.clip();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = ruby;
    ctx.lineWidth = 2;
    var step = 7;
    for (var d = -bh; d < bw; d += step) {
      ctx.beginPath();
      ctx.moveTo(x0 + d, y0 + bh);
      ctx.lineTo(x0 + d + bh, y0);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = ruby;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x0 + 1, y0 + 1, bw - 2, bh - 2);
    ctx.restore();

    host.append(c);
  }

  function showCard(on) {
    var wipe = $('#wipe'), card = $('#qcard');
    if (wipe) wipe.hidden = on;
    if (card) card.hidden = !on;
  }

  /* The answer path. One source of truth: if the shell exposes a submitter we
     call it, so state, the label log and the strip all update the way they do
     for every other answer. Only if it does not do we speak to the API
     ourselves — and we still ask the shell to refresh afterwards. */
  async function submitAnswer(assetId, regionId, verdict) {
    var D = root.Devoid || {};
    if (typeof D.submitAnswer === 'function') return D.submitAnswer(assetId, regionId, verdict);
    if (typeof D.answerQuestion === 'function') return D.answerQuestion(assetId, regionId, verdict);
    var body = { ambiguous_protection: {}, fade: null };
    body.ambiguous_protection[String(regionId)] = verdict;
    var resp = await fetch('/api/assets/' + encodeURIComponent(assetId) + '/answers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      var err = await resp.json().catch(function () { return {}; });
      /* ⚠️ Two regions sharing an outline colour cannot be answered
         differently (API-CONTRACT "Per-colour vs per-region"). The server
         rejects it; surfacing the rejection here is the backstop, not the
         plan — the shell groups same-colour regions into one question so this
         is never the first time the person hears about it. */
      throw new Error(err.error === 'conflicting_colour'
        ? 'Two regions share the colour ' + err.outline_color + ' and must be answered together.'
        : 'answer rejected: ' + resp.status);
    }
    if (typeof D.refresh === 'function') D.refresh();
    return resp.json().catch(function () { return {}; });
  }

  var cardTarget = null;   // {assetId, regionId}

  function wireCard() {
    var yes = $('#qcardyes'), no = $('#qcardno');
    var answer = function (verdict) {
      return async function () {
        if (!cardTarget) return;
        yes.disabled = no.disabled = true;
        try { await submitAnswer(cardTarget.assetId, cardTarget.regionId, verdict); }
        catch (e) {
          var t = $('#qcardtext');
          if (t) t.textContent = e.message;
        } finally { yes.disabled = no.disabled = false; }
      };
    };
    if (yes) yes.addEventListener('click', answer('protect'));   // "Artwork"   → keep it
    if (no) no.addEventListener('click', answer('remove'));       // "Background" → cut it
  }

  /* ── the pair, and the generalisation  (PLAN.md 3.1 / 3.4) ─────────────
     ANY flag with a visible consequence becomes a seam. loadPair is the whole
     mechanism; the drawers in web/app.js call it with whatever flag the
     control they are showing owns. */

  var pairCache = new Map();

  function pairKey(assetId, flag, a, b, regions) {
    return [assetId, flag, JSON.stringify(a), JSON.stringify(b), JSON.stringify(regions || null)].join('|');
  }

  async function fetchPair(assetId, flag, valueA, valueB, regions) {
    var key = pairKey(assetId, flag, valueA, valueB, regions);
    if (pairCache.has(key)) return pairCache.get(key);
    var p = (async function () {
      var body = { flag: flag, value_a: valueA, value_b: valueB };
      if (regions) body.regions = regions;
      var resp = await fetch('/api/assets/' + encodeURIComponent(assetId) + '/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!resp.ok) throw new Error('preview failed: ' + resp.status);
      return resp.json();
    })();
    pairCache.set(key, p);
    return p;
  }

  /* The disputed region for this flag, from the asset the shell already holds.
     Falls back to the whole frame, which is the right answer for a flag whose
     consequence is global (dither, feather) rather than local. */
  function disputedRegion(assetId, regions) {
    if (regions && regions.length && regions[0].bbox_xyxy) return regions[0];
    var D = root.Devoid || {};
    var asset = typeof D.getAsset === 'function' ? D.getAsset(assetId) : null;
    var q = asset && asset.questions && asset.questions.ambiguous_protection;
    return q && q.length ? q[0] : null;
  }

  function imageDataOfFirstFrame(side) {
    var c = blankCanvas(side.width, side.height);
    var ctx = c.getContext('2d');
    var i = frameAtTime(side.timeline, representativeTime());
    ctx.drawImage(side.frames[i], 0, 0);
    return ctx.getImageData(0, 0, side.width, side.height).data;
  }

  function questionText(region, flag) {
    if (flag && flag !== 'assume_protect' && flag !== 'assume_remove' && flag !== 'protection') {
      return 'The two settings barely differ here. Which do you want?';
    }
    var px = region && region.frames_enclosed != null && region.frames_checked
      ? ' It is enclosed on ' + region.frames_enclosed + ' of ' + region.frames_checked + ' frames.'
      : '';
    return 'The hatched area is the same colour as the background.' + px +
      ' Is it part of the picture, or is it background showing through?';
  }

  /**
   * Put a candidate pair behind the seam.
   *
   *   loadPair('megaphone', 'assume_protect', true, false, regions)
   *   loadPair('growth', 'erosion', 1, 3)
   *   loadPair('rocket', 'dither', 'floyd', 'none')
   *
   * Fetches both renders from POST /api/assets/{id}/preview, decodes each to
   * frames with its own timing, drives both from one clock, then decides
   * between the seam and the question card by measuring them.
   *
   * Returns the metric object so a caller can log or assert on it.
   */
  async function loadPair(assetId, flag, valueA, valueB, regions) {
    /* ⚠️ Fetch BEFORE mounting. mountCanvases() calls releaseWipe(), which hands
       the element over permanently — so mounting first and then failing the
       fetch left two blank canvases where the artwork had been, with app.js no
       longer allowed to draw. Take the element only once there is something to
       put in it. */
    var pair = await fetchPair(assetId, flag, valueA, valueB, regions);
    mountCanvases();
    var decoded = await Promise.all([decode(pair.a_url), decode(pair.b_url)]);

    W.asset = assetId; W.flag = flag; W.valueA = valueA; W.valueB = valueB;
    W.regions = regions || null;
    W.a = prepare(decoded[0]);
    W.b = prepare(decoded[1]);
    W.ledgerA = pair.ledger_a || null;
    W.ledgerB = pair.ledger_b || null;
    W.formatIsGif = !!pair.format_is_gif;

    var tags = tagsFor(flag, valueA, valueB);
    var lt = document.querySelector('.wipetag.l'), rt = document.querySelector('.wipetag.r');
    if (lt) lt.textContent = tags.a;
    if (rt) rt.textContent = tags.b;
    var wipe = $('#wipe');
    if (wipe) wipe.setAttribute('aria-label', 'Drag to compare "' + tags.a + '" with "' + tags.b + '"');

    renderLedger(W.ledgerA, W.ledgerB, tags);

    /* Measure the two renders against each other before deciding how to ask. */
    var region = disputedRegion(assetId, regions);
    var bbox = region && region.bbox_xyxy ? region.bbox_xyxy : null;
    var metric = null;
    if (W.a.width === W.b.width && W.a.height === W.b.height) {
      metric = compareAlpha(imageDataOfFirstFrame(W.a), imageDataOfFirstFrame(W.b),
                            W.a.width, W.a.height, bbox);
    }
    W.metric = metric;

    /* ⚠️ The card is the fallback, not the default (HANDOFF: "Seam by
       default"). No measurement — mismatched dimensions, a decode that gave us
       one side only — means we show the seam, because a seam that turns out
       unhelpful costs a drag, while a card shown over a difference the person
       could have seen throws away the better question. */
    var useCard = metric != null && !seamCanHelp(metric);
    showCard(useCard);
    if (useCard) {
      cardTarget = { assetId: assetId, regionId: region ? region.region_id : 0 };
      var frameHost = $('#qcardframe');
      if (frameHost && bbox) drawHatchedRegion(frameHost, W.a, clampBox(bbox, W.a.width, W.a.height));
      var t = $('#qcardtext');
      if (t) t.textContent = questionText(region, flag);
      stop();
    } else {
      start();
    }
    return metric;
  }

  wireCard();

  /* ── the export  (extend window.Devoid, never clobber it) ─────────────── */
  var D = root.Devoid = root.Devoid || {};
  D.loadPair = loadPair;
  D.wipe = {
    loadPair: loadPair,
    play: play,
    pause: pause,
    seekToFrame: seekToFrame,
    renderLedger: renderLedger,
    metric: function () { return W.metric; },
    sides: function () { return { a: W.a, b: W.b }; },
    clock: PURE
  };
  D.wipeClock = PURE;

})(typeof globalThis !== 'undefined' ? globalThis : this);
