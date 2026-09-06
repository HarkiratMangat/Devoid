/* Devoid — the plotter. The region canvas.
 *
 * DESIGN.md gives this room its job: the cutting table owns the ground, the light
 * table owns the lighting and the frame axis, and the plotter owns the drawing
 * tools. This file is the plotter and nothing else.
 *
 * It is the app's non-substitutable part. Every other screen here could be a
 * fancier web page; drawing a region ON the artwork could not.
 *
 * Two halves, deliberately separated:
 *
 *   1. The coordinate math — pure, no DOM, exported for Node. The canvas is shown
 *      at whatever size the layout gives it and the engine works in SOURCE pixels,
 *      so a source pixel must survive display space and come back as itself. Not
 *      approximately: the skill's own docs warn that nothing downstream can detect
 *      a mis-measured region, so a half-pixel error is invisible on screen and
 *      permanent in the output. tests/test_canvas_coords.mjs is the falsifier and
 *      it was written and run red before a line of this file existed.
 *
 *   2. Everything that touches the DOM, which runs only in a browser and is behind
 *      a `typeof document` guard so requiring this file in Node stays silent.
 *
 * This file draws regions. It renders no image processing of its own — the skill
 * at /Applications/Claude Code/Gif-Background-Remover stays the engine.
 */

/* ══ 1. the coordinate math ══════════════════════════════════════════════════
 *
 * The artwork is not the container. `.wipe > img` is `object-fit: contain` inside
 * a padded box, so a source whose aspect does not match the box letterboxes (or
 * pillarboxes) inside it — PLAN's edge case: "a 1920x480 banner letterboxes into
 * a square". `artRect` is where the art actually lands; the two conversions are
 * defined against that rect, never against the container.
 */

/** Where the artwork actually sits inside a display box, under object-fit: contain. */
function artRect(displayRect, sourceWidth, sourceHeight) {
  const scale = Math.min(displayRect.width / sourceWidth, displayRect.height / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: displayRect.x + (displayRect.width - width) / 2,
    y: displayRect.y + (displayRect.height - height) / 2,
    width,
    height,
    scale,
  };
}

/** A source pixel -> its position in display space. Fractional, on purpose: this
 *  is what gets drawn, and rounding here would make shapes crawl as the box
 *  resizes. */
function sourceToDisplay(sourcePoint, displayRect, sourceWidth, sourceHeight) {
  const art = artRect(displayRect, sourceWidth, sourceHeight);
  return {
    x: art.x + sourcePoint.x * art.scale,
    y: art.y + sourcePoint.y * art.scale,
  };
}

/** A display position -> the source pixel it names. Rounded, because a region is
 *  an integer box in the engine's coordinates and there is no such thing as half
 *  a source pixel; clamped, because a click on a letterbox bar is outside the
 *  artwork and a negative coordinate is something the engine would accept in
 *  silence. */
function displayToSource(displayPoint, displayRect, sourceWidth, sourceHeight) {
  const art = artRect(displayRect, sourceWidth, sourceHeight);
  return {
    x: clamp(Math.round((displayPoint.x - art.x) / art.scale), 0, sourceWidth),
    y: clamp(Math.round((displayPoint.y - art.y) / art.scale), 0, sourceHeight),
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/* ══ 2. what a region is ═════════════════════════════════════════════════════
 *
 * Six kinds, from PLAN 4.3. They are drawn rather than typed, which is the whole
 * point of the stage — but the labels are the person's words, not the engine's
 * argparse groups (DESIGN.md's copy rule), and they line up with the vocabulary
 * app.js already uses in its drawers: "Kept region", "Cut region", "Follow it".
 *
 * `tracked` is a separate axis from `type`, matching the render body's shape.
 * The `remove-track` kind is the one that arrives pre-tracked; turning "Follow it"
 * off on such a region relaxes it to a plain `remove`, because a remove-track that
 * does not track is just a remove and two fields disagreeing is a bug waiting.
 */
const REGION_KINDS = [
  { type: 'protect',      label: 'Keep',           hint: 'this part stays, even where it matches the background', keeps: true },
  { type: 'remove',       label: 'Cut',            hint: 'take this out',                                          keeps: false },
  { type: 'remove-track', label: 'Cut and follow', hint: 'take this out, and follow it as it moves',               keeps: false, tracked: true },
  { type: 'unprotect',    label: 'Cut it after all', hint: 'let this go even though it looks worth keeping',       keeps: false },
  { type: 'translucent',  label: 'Make it see-through', hint: 'this part is meant to be see-through',              keeps: true },
  { type: 'fade-protect', label: 'Keep the fade',  hint: 'a glow or sparkle here — keep it fading, not flattened', keeps: true },
];

const KIND_BY_TYPE = Object.fromEntries(REGION_KINDS.map((k) => [k.type, k]));

/** The wire shape handed to the render call: {type, bbox_xyxy | points, tracked}.
 *  A rectangle is fully described by its box. A circle is not, so it carries a
 *  polygon AND its exact centre and radius — the polygon is what a consumer that
 *  only understands points can use, the circle is what a consumer that understands
 *  circles should prefer, and neither is a lossy guess at the other. */
function toWire(region) {
  const base = { id: region.id, type: region.type, tracked: !!region.tracked, frame: region.frame };
  if (region.shape === 'circle') {
    const { cx, cy, r } = region;
    return {
      ...base,
      shape: 'circle',
      bbox_xyxy: [Math.round(cx - r), Math.round(cy - r), Math.round(cx + r), Math.round(cy + r)],
      circle: { cx: Math.round(cx), cy: Math.round(cy), r: Math.round(r) },
      points: circlePoints(cx, cy, r, 32),
    };
  }
  const x0 = Math.min(region.x0, region.x1);
  const y0 = Math.min(region.y0, region.y1);
  const x1 = Math.max(region.x0, region.x1);
  const y1 = Math.max(region.y0, region.y1);
  return { ...base, shape: 'rect', bbox_xyxy: [x0, y0, x1, y1] };
}

function circlePoints(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)]);
  }
  return pts;
}

/* ══ 3. the browser half ═════════════════════════════════════════════════════ */

const PLOTTER = { artRect, sourceToDisplay, displayToSource, toWire, REGION_KINDS };

if (typeof module !== 'undefined' && module.exports) module.exports = PLOTTER;
if (typeof window !== 'undefined') {
  window.Devoid = window.Devoid || {};
  window.Devoid.plotter = PLOTTER;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}

function start() {
  const canvas = document.getElementById('regioncanvas');
  const tools = document.getElementById('regiontools');
  const wipe = document.getElementById('wipe');
  const stage = document.getElementById('stage');
  const art = document.getElementById('before');
  if (!canvas || !tools || !wipe || !stage || !art) return;

  /* ⚠️ Both ship `hidden` in the markup so a failed load of THIS file leaves no
     empty toolbar box behind -- `start()` returns above if anything is missing.
     Reaching here means the plotter is real, so show it. It lives inside #open,
     so it is still only visible when an asset is open, and the canvas is inert
     until a tool is picked up (see arm()), so the seam still drags normally. */
  canvas.hidden = false;
  tools.hidden = false;

  const ctx = canvas.getContext('2d');
  const HANDLE = 4;      // half-size of a handle square, in CSS px
  const GRAB = 8;        // how near a handle counts as grabbing it

  /* ── state ─────────────────────────────────────────────────────────────── */
  const S = {
    tool: null,          // null = the canvas is inert and the seam drags normally
    shape: 'rect',
    regions: [],
    selected: null,
    drag: null,
    hover: null,
    sampled: null,
    seq: 0,
  };

  /* ── where the artwork is, in canvas-local coordinates ─────────────────── */
  // The canvas covers the whole .wipe box so handles can sit just outside the
  // art. The art itself is that box inset by the <img>'s own padding — read from
  // the computed style, not hardcoded, so it tracks var(--s3) if that ever moves.
  function displayRect() {
    const cs = getComputedStyle(art);
    const l = parseFloat(cs.paddingLeft) || 0;
    const r = parseFloat(cs.paddingRight) || 0;
    const t = parseFloat(cs.paddingTop) || 0;
    const b = parseFloat(cs.paddingBottom) || 0;
    return { x: l, y: t, width: canvas.clientWidth - l - r, height: canvas.clientHeight - t - b };
  }

  function sourceSize() {
    // naturalWidth is 0 until the image decodes; 260 is the corpus, measured with
    // PIL over all eight assets, and only ever a stand-in for one frame.
    return { w: art.naturalWidth || 260, h: art.naturalHeight || 260 };
  }

  const toDisplay = (p) => { const { w, h } = sourceSize(); return sourceToDisplay(p, displayRect(), w, h); };
  const toSource = (p) => { const { w, h } = sourceSize(); return displayToSource(p, displayRect(), w, h); };

  /* ── sizing: the canvas tracks .wipe exactly, in device pixels ──────────── */
  //
  // ⚠️ This is a watch, not a set of listeners, and that is the second design.
  // The first observed #wipe with a ResizeObserver, and measured in a real
  // browser it laid out exactly once — while #open was still `hidden`, so the
  // canvas stayed 0x0 at the wrong offset for the rest of the session. Two
  // separate holes: a ResizeObserver on a display:none element does not usefully
  // report the moment it gains a box, and a pure POSITION change — a drawer
  // opening and pushing the stage sideways — never changes .wipe's size, so no
  // size observer of any kind can see it. Both produce a canvas that looks right
  // and is registered to the wrong pixels, which is the one failure this whole
  // stage exists to prevent.
  //
  // Comparing five numbers once a frame has neither hole and is cheaper than the
  // GIFs already decoding beside it.
  let applied = '';
  let backingScale = 1;   // the dpr the backing store is currently built at
  function layout(force) {
    const w = wipe.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const key = `${w.left - s.left}|${w.top - s.top}|${w.width}|${w.height}|${dpr}`;
    if (key === applied && !force) return false;
    applied = key;
    backingScale = dpr;
    canvas.style.left = `${w.left - s.left}px`;
    canvas.style.top = `${w.top - s.top}px`;
    canvas.style.width = `${w.width}px`;
    canvas.style.height = `${w.height}px`;
    canvas.width = Math.round(w.width * dpr);
    canvas.height = Math.round(w.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
    return true;
  }

  // The watch keeps what is DRAWN registered to the artwork. It is a poll, so it
  // stops while the page is hidden — measured: with document.visibilityState
  // 'hidden' the callback never fires at all, while the page still accepts real
  // clicks. So the watch is not allowed to be the only thing keeping the canvas
  // honest: every press re-measures first (see pointerdown), which makes what is
  // CLICKED correct even if nothing has been drawn since the layout moved.
  (function watch() { layout(); requestAnimationFrame(watch); })();
  document.addEventListener('visibilitychange', () => layout());

  /* ── drawing ───────────────────────────────────────────────────────────── */
  function css(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  // Rubylith means this goes; cyan means this stays. There is no third accent.
  // A third of one corpus asset's artwork sits inside rubylith's own neighbourhood
  // (measure_overlay_collision.py), so removal also carries a diagonal hatch —
  // hatching is hue-independent and is how removed material is marked on a
  // technical drawing. A tint alone would be invisible over red art.
  function paintFor(region) {
    const kind = KIND_BY_TYPE[region.type];
    const goes = kind && kind.keeps === false;
    return {
      stroke: goes ? css('--ruby', '#E2402A') : css('--cyan', '#22D3EE'),
      hatch: goes,
      dashed: region.type === 'translucent' || region.type === 'fade-protect',
    };
  }

  function shapePath(region) {
    ctx.beginPath();
    if (region.shape === 'circle') {
      const c = toDisplay({ x: region.cx, y: region.cy });
      const edge = toDisplay({ x: region.cx + region.r, y: region.cy });
      ctx.arc(c.x, c.y, Math.max(0, edge.x - c.x), 0, Math.PI * 2);
    } else {
      const a = toDisplay({ x: Math.min(region.x0, region.x1), y: Math.min(region.y0, region.y1) });
      const b = toDisplay({ x: Math.max(region.x0, region.x1), y: Math.max(region.y0, region.y1) });
      ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
  }

  function hatch(box) {
    const step = 7;
    ctx.save();
    ctx.clip();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    for (let i = -box.h; i < box.w; i += step) {
      ctx.beginPath();
      ctx.moveTo(box.x + i, box.y);
      ctx.lineTo(box.x + i + box.h, box.y + box.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  function boundsOf(region) {
    const w = toWire(region).bbox_xyxy;
    const a = toDisplay({ x: w[0], y: w[1] });
    const b = toDisplay({ x: w[2], y: w[3] });
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  }

  function draw() {
    if (!canvas.width) return;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    for (const region of S.regions) {
      const paint = paintFor(region);
      const box = boundsOf(region);
      ctx.strokeStyle = paint.stroke;
      ctx.fillStyle = paint.stroke;

      shapePath(region);
      ctx.globalAlpha = 0.14;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (paint.hatch) { shapePath(region); hatch(box); }

      shapePath(region);
      ctx.lineWidth = region === S.selected ? 2 : 1.25;
      ctx.setLineDash(paint.dashed ? [5, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      // A tracked region wears a second, offset outline: it is the same region on
      // every frame, so it is drawn as if it had already moved.
      if (region.tracked) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([2, 5]);
        ctx.translate(4, 4);
        shapePath(region);
        ctx.stroke();
        ctx.restore();
        ctx.setLineDash([]);
      }

      if (region === S.selected) drawHandles(region, paint.stroke);
    }
  }

  function drawHandles(region, colour) {
    ctx.fillStyle = css('--bench', '#1B2423');
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.25;
    for (const h of handlesOf(region)) {
      ctx.beginPath();
      ctx.rect(h.x - HANDLE, h.y - HANDLE, HANDLE * 2, HANDLE * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  /** Handle positions in display space. A rectangle gets eight — four corners and
   *  four edge midpoints. A circle gets one, on its radius, because a circle has
   *  exactly one degree of freedom besides its centre and eight handles would
   *  imply it could be squashed. */
  function handlesOf(region) {
    if (region.shape === 'circle') {
      const e = toDisplay({ x: region.cx + region.r, y: region.cy });
      return [{ id: 'r', x: e.x, y: e.y }];
    }
    const x0 = Math.min(region.x0, region.x1), x1 = Math.max(region.x0, region.x1);
    const y0 = Math.min(region.y0, region.y1), y1 = Math.max(region.y0, region.y1);
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return [
      ['nw', x0, y0], ['n', mx, y0], ['ne', x1, y0],
      ['w', x0, my], ['e', x1, my],
      ['sw', x0, y1], ['s', mx, y1], ['se', x1, y1],
    ].map(([id, sx, sy]) => ({ id, ...toDisplay({ x: sx, y: sy }) }));
  }

  /* ── hit testing ───────────────────────────────────────────────────────── */
  // Order matters and is the whole of 4.2's interaction rule: a handle on the
  // selected region wins first, then any region's body topmost-first, then
  // nothing — which starts a new shape if a drawing tool is armed.
  function hitHandle(region, p) {
    if (!region) return null;
    for (const h of handlesOf(region)) {
      if (Math.abs(p.x - h.x) <= GRAB && Math.abs(p.y - h.y) <= GRAB) return h.id;
    }
    return null;
  }

  // ⚠️ isPointInPath takes BACKING-STORE coordinates. Unlike every drawing call,
  // it does NOT run its argument through the current transform — so the setTransform
  // that makes the canvas crisp on a retina display also makes a naive
  // isPointInPath(p.x, p.y) test a point at half the intended position. Measured in
  // a real browser at devicePixelRatio 2: clicking the middle of a region selected
  // nothing, while clicking its bottom-right corner grabbed a region that was not
  // there. It is a factor-of-dpr error, so it is invisible on a dpr-1 display and
  // wrong on every Mac.
  function hitBody(p) {
    for (let i = S.regions.length - 1; i >= 0; i--) {
      const region = S.regions[i];
      shapePath(region);
      if (ctx.isPointInPath(p.x * backingScale, p.y * backingScale)) return region;
    }
    return null;
  }

  function localPoint(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  /* ── the eyedropper ────────────────────────────────────────────────────── */
  // A normal <img> cannot be read pixel-by-pixel, so the displayed frame is drawn
  // into an offscreen canvas once and sampled from there. These are same-origin
  // files served by the app's own server, so the canvas does not taint — a
  // cross-origin one would throw SecurityError here, which is why the read is
  // guarded rather than assumed.
  let sampler = null, samplerSrc = null;
  function sampleAt(sourcePoint) {
    const { w, h } = sourceSize();
    if (!sampler || samplerSrc !== art.currentSrc) {
      sampler = document.createElement('canvas');
      sampler.width = w; sampler.height = h;
      try { sampler.getContext('2d').drawImage(art, 0, 0, w, h); } catch (e) { return null; }
      samplerSrc = art.currentSrc;
    }
    const x = clamp(sourcePoint.x, 0, w - 1);
    const y = clamp(sourcePoint.y, 0, h - 1);
    let d;
    try { d = sampler.getContext('2d').getImageData(x, y, 1, 1).data; } catch (e) { return null; }
    const hex = '#' + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join('');
    return { hex, rgb: [d[0], d[1], d[2]], alpha: d[3], point: { x, y } };
  }

  /* ── pointer ───────────────────────────────────────────────────────────── */
  canvas.addEventListener('pointerdown', (ev) => {
    if (!S.tool) return;
    layout();   // never hit-test against a rect the watch has not caught up to
    const p = localPoint(ev);
    canvas.setPointerCapture(ev.pointerId);
    ev.preventDefault();

    if (S.tool === 'colour') {
      const hit = sampleAt(toSource(p));
      S.sampled = hit;
      if (hit) emitColour(hit);
      renderTools();
      return;
    }

    const grabbed = hitHandle(S.selected, p);
    if (grabbed) { S.drag = { mode: 'resize', handle: grabbed, region: S.selected }; return; }

    const body = hitBody(p);
    if (body) {
      S.selected = body;
      S.drag = { mode: 'move', region: body, from: toSource(p), start: snapshot(body) };
      renderTools(); draw();
      return;
    }

    if (S.tool === 'move') { S.selected = null; renderTools(); draw(); return; }

    const at = toSource(p);
    const region = S.shape === 'circle'
      ? { shape: 'circle', cx: at.x, cy: at.y, r: 0 }
      : { shape: 'rect', x0: at.x, y0: at.y, x1: at.x, y1: at.y };
    region.id = `r${++S.seq}`;
    region.type = S.tool;
    region.tracked = !!(KIND_BY_TYPE[S.tool] && KIND_BY_TYPE[S.tool].tracked);
    region.frame = currentFrame();
    S.regions.push(region);
    S.selected = region;
    S.drag = { mode: 'resize', handle: S.shape === 'circle' ? 'r' : 'se', region, fresh: true };
    renderTools(); draw();
  });

  canvas.addEventListener('pointermove', (ev) => {
    const p = localPoint(ev);
    if (!S.drag) {
      if (S.tool) {
        const over = hitHandle(S.selected, p) ? 'grab' : hitBody(p) ? 'move'
          : S.tool === 'colour' ? 'crosshair' : S.tool === 'move' ? 'default' : 'crosshair';
        canvas.style.cursor = over;
      }
      return;
    }
    const at = toSource(p);
    const region = S.drag.region;

    if (S.drag.mode === 'move') {
      const dx = at.x - S.drag.from.x;
      const dy = at.y - S.drag.from.y;
      const s = S.drag.start;
      const { w, h } = sourceSize();
      if (region.shape === 'circle') {
        region.cx = clamp(s.cx + dx, 0, w);
        region.cy = clamp(s.cy + dy, 0, h);
      } else {
        // Move as a rigid body: clamp the offset, not each corner, or a rectangle
        // dragged off the edge silently collapses instead of stopping.
        const lo = Math.min(s.x0, s.x1), hi = Math.max(s.x0, s.x1);
        const top = Math.min(s.y0, s.y1), bot = Math.max(s.y0, s.y1);
        const ox = clamp(dx, -lo, w - hi);
        const oy = clamp(dy, -top, h - bot);
        region.x0 = s.x0 + ox; region.x1 = s.x1 + ox;
        region.y0 = s.y0 + oy; region.y1 = s.y1 + oy;
      }
    } else if (region.shape === 'circle') {
      region.r = Math.round(Math.hypot(at.x - region.cx, at.y - region.cy));
    } else {
      const h = S.drag.handle;
      if (h.includes('n')) region.y0 = at.y;
      if (h.includes('s')) region.y1 = at.y;
      if (h.includes('w')) region.x0 = at.x;
      if (h.includes('e')) region.x1 = at.x;
    }
    draw();
  });

  canvas.addEventListener('pointerup', (ev) => {
    if (!S.drag) return;
    canvas.releasePointerCapture(ev.pointerId);
    const { region, fresh } = S.drag;
    S.drag = null;
    // A click with a drawing tool armed leaves a zero-area shape behind. Drop it:
    // an invisible region that still reaches the engine is the worst outcome here.
    const box = toWire(region).bbox_xyxy;
    if (fresh && (box[2] - box[0] < 2 || box[3] - box[1] < 2)) {
      S.regions = S.regions.filter((r) => r !== region);
      S.selected = null;
    } else if (region.shape === 'rect') {
      const x0 = Math.min(region.x0, region.x1), x1 = Math.max(region.x0, region.x1);
      const y0 = Math.min(region.y0, region.y1), y1 = Math.max(region.y0, region.y1);
      Object.assign(region, { x0, y0, x1, y1 });
    }
    renderTools(); draw(); emit();
  });

  function snapshot(region) {
    return region.shape === 'circle'
      ? { cx: region.cx, cy: region.cy, r: region.r }
      : { x0: region.x0, y0: region.y0, x1: region.x1, y1: region.y1 };
  }

  document.addEventListener('keydown', (ev) => {
    if (!S.selected) return;
    const t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (ev.key === 'Escape') { S.selected = null; renderTools(); draw(); }
    if (ev.key === 'Backspace' || ev.key === 'Delete') {
      ev.preventDefault();
      forget(S.selected);
    }
  });

  function forget(region) {
    S.regions = S.regions.filter((r) => r !== region);
    if (S.selected === region) S.selected = null;
    renderTools(); draw(); emit();
  }

  /* ── the toolbar ───────────────────────────────────────────────────────── */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function toolButton(id, label, hint, keeps) {
    const b = el('button', 'btn rt-tool', label);
    b.type = 'button';
    // the verdict, as a 2px edge -- eight fully-coloured buttons would be a
    // carnival, but eight UNMARKED ones make you read every label to find the
    // one that cuts. Move and Take a colour carry no verdict, so no mark.
    if (keeps === true) b.dataset.keeps = 'true';
    if (keeps === false) b.dataset.keeps = 'false';
    /* role="toolbar" promises ONE tab stop with arrow keys inside it; ten
       default tabindexes made it ten stops, which is the opposite. */
    b.tabIndex = (S.tool ? S.tool === id : id === 'move') ? 0 : -1;
    b.title = hint || label;
    b.setAttribute('aria-pressed', String(S.tool === id));
    b.addEventListener('click', () => {
      S.tool = S.tool === id ? null : id;   // a second press puts the tool down
      arm();
      renderTools();
    });
    return b;
  }

  /* Arrow keys move within ONE row, not across the whole toolbar: the verdict
     tools, the shape picker and the per-region actions are separate groups
     and arrowing from "Take a colour" into "Box" would be nonsense. */
  tools.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const row = document.activeElement && document.activeElement.closest('.rt-row');
    if (!row || !tools.contains(row)) return;
    const items = [...row.querySelectorAll('button')];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
            : e.key === 'ArrowRight' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    for (const b of items) b.tabIndex = -1;
    items[n].tabIndex = 0; items[n].focus();
  });

  function arm() {
    // The canvas sits above the wipe inside the same #stage. It must be inert
    // while no tool is up, or it would eat every seam drag — the seam is the
    // product's thesis as a gesture and this overlay must not cost it.
    canvas.style.pointerEvents = S.tool ? 'auto' : 'none';
    canvas.style.cursor = S.tool === 'colour' ? 'crosshair' : S.tool === 'move' ? 'default' : 'crosshair';
    if (!S.tool) { S.selected = null; draw(); }
  }

  function renderTools() {
    /* replaceChildren() destroys the focused node, and focus silently falls to
       <body> -- so a keyboard user loses their place every time a tool is
       armed or a region is selected. Remember where they were. */
    const wasFocused = document.activeElement && tools.contains(document.activeElement)
      ? document.activeElement.textContent.trim() : null;
    tools.replaceChildren();
    tools.setAttribute('role', 'toolbar');
    tools.setAttribute('aria-label', 'Drawing on the artwork');

    const row = el('div', 'rt-row');
    row.append(toolButton('move', 'Move', 'pick a region up and move or resize it'));
    for (const k of REGION_KINDS) row.append(toolButton(k.type, k.label, k.hint, k.keeps));
    row.append(toolButton('colour', 'Take a colour', 'read the colour under the crosshair'));
    tools.append(row);

    const shapes = el('div', 'rt-row rt-sub');
    shapes.append(el('span', 'rt-lab', 'drawn as'));
    for (const [id, label] of [['rect', 'Box'], ['circle', 'Circle']]) {
      const b = el('button', 'btn rt-shape', label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(S.shape === id));
      b.addEventListener('click', () => { S.shape = id; renderTools(); });
      shapes.append(b);
    }
    tools.append(shapes);

    if (S.selected) {
      const sel = el('div', 'rt-row rt-sub');
      const kind = KIND_BY_TYPE[S.selected.type];
      const wire = toWire(S.selected);
      sel.append(el('span', 'rt-lab', `${kind ? kind.label : S.selected.type} · ${wire.bbox_xyxy.join(' ')}`));

      const follow = el('button', 'btn rt-shape', 'Follow it');
      follow.type = 'button';
      follow.title = 'let the engine track this region as it moves between frames';
      follow.setAttribute('aria-pressed', String(!!S.selected.tracked));
      follow.addEventListener('click', () => {
        S.selected.tracked = !S.selected.tracked;
        // remove-track IS remove-that-tracks. Untracking it makes it a remove, so
        // the two fields can never contradict one another on the wire.
        if (!S.selected.tracked && S.selected.type === 'remove-track') S.selected.type = 'remove';
        if (S.selected.tracked && S.selected.type === 'remove') S.selected.type = 'remove-track';
        renderTools(); draw(); emit();
      });

      const drop = el('button', 'btn rt-shape', 'Forget it');
      drop.type = 'button';
      drop.addEventListener('click', () => forget(S.selected));
      sel.append(follow, drop);
      tools.append(sel);
    }

    if (S.sampled) {
      const c = el('div', 'rt-row rt-sub');
      const chip = el('span', 'rt-chip');
      chip.style.background = S.sampled.hex;
      c.append(el('span', 'rt-lab', 'colour'), chip, el('code', 'rt-hex', S.sampled.hex));
      tools.append(c);
    }

    if (wasFocused) {
      const again = [...tools.querySelectorAll('button')]
        .find((b) => b.textContent.trim() === wasFocused);
      if (again) { again.tabIndex = 0; again.focus(); }
    }

    // The toolbar gains and loses rows as regions are selected, which changes its
    // height, which moves the stage, which moves .wipe under the canvas. Re-measure
    // now rather than leaving the marks a frame behind the artwork they annotate.
    layout();
  }

  /* ── hand-off ──────────────────────────────────────────────────────────── */
  // Belt and suspenders, because which mechanism the shell picked is not knowable
  // from here: the array is set on window.Devoid AND an event is dispatched. The
  // event is primary — it is the one that says *when* something changed.
  function currentFrame() {
    const D = window.Devoid || {};
    return typeof D.frame === 'number' ? D.frame : 0;
  }

  function assetId() {
    const D = window.Devoid || {};
    if (typeof D.open === 'string') return D.open;
    if (D.state && typeof D.state.open === 'string') return D.state.open;
    return null;
  }

  function emit() {
    const regions = S.regions.map(toWire);
    window.Devoid = window.Devoid || {};
    window.Devoid.regions = regions;
    window.dispatchEvent(new CustomEvent('devoid:regions-changed', {
      detail: { asset: assetId(), regions },
    }));
  }

  function emitColour(hit) {
    window.Devoid = window.Devoid || {};
    window.Devoid.sampledColor = hit.hex;
    window.dispatchEvent(new CustomEvent('devoid:color-sampled', {
      detail: { asset: assetId(), hex: hit.hex, rgb: hit.rgb, alpha: hit.alpha, point: hit.point },
    }));
  }

  /* Regions belong to one asset. Opening another must not leave the last one's
   * marks floating over unrelated artwork. */
  window.addEventListener('devoid:asset-opened', () => {
    S.regions = []; S.selected = null; S.sampled = null; sampler = null;
    renderTools(); draw(); emit();
  });

  window.Devoid.plotter.clear = () => {
    S.regions = []; S.selected = null;
    renderTools(); draw(); emit();
  };
  window.Devoid.plotter.setRegions = (list) => {
    S.regions = (list || []).map((r) => ({ ...r, id: r.id || `r${++S.seq}` }));
    S.selected = null;
    renderTools(); draw(); emit();
  };

  renderTools();
  arm();
  layout();
}
