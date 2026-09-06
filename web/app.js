/* Devoid — the shell. PLAN.md Stage 2 ("the surface").

   There is no mode. The strip IS the app: nothing selected and it fills the
   space as a contact sheet; select one and it opens while the rest move to the
   edge. Selection is the only state of the structure, which is why density
   needs no policy — 1, 12 and 200 are the same layout.

   WHAT CHANGED FROM THE PROTOTYPE: the hardcoded `ASSETS` array, `kindOf`,
   `wordOf`'s invented verdicts and the `'cut'` stub are gone. Everything on
   screen now comes from the server, through the routes frozen in
   `docs/API-CONTRACT.md`. Nothing here invents a shape that document does not
   describe, and nothing here reports a result the server did not send.

   ⚠️ THE THREE RULES THIS FILE EXISTS TO KEEP (CLAUDE.md, PRODUCT.md):
   1. NO CONTROL MAPS 1:1 ONTO A FLAG. The drawers are hand-authored, in the
      person's vocabulary, and expose a deliberate subset. `GET /api/flags`
      supplies each row's live default and type — it never generates a row.
      A flag in no drawer is a warning, not a new control.
   2. EVERY CONTROL IS TRI-STATE. A row reads `auto · <default>` until it is
      deliberately taken over, and only taken-over rows go into `overrides`.
      A UI that sends all 63 flags makes `--auto` a no-op and the tool stops
      thinking.
   3. NEVER REPORT A CHECK THAT DID NOT RUN. `not-checked` is a first-class
      state with the weight of done and failed, and a blank ledger says so.

   ⚠️ NO STATE IS COLOUR ALONE. Every one of the eleven carries a grease-pencil
   MARK (a shape) and a WORD as well. Measured reason: 31% of hurricane's
   artwork and 21% of paper-plane's sits inside rubylith's own colour
   neighbourhood, so hue is not a channel this content supports. */

/* ── the API ──────────────────────────────────────────────────────────────
   Relative URLs on purpose: this page IS served by the server at
   127.0.0.1:8732, so same-origin needs no host and no CORS.

   ⚠️ Failures are surfaced, never swallowed into a plausible empty state. A
   dead server reads as `failed` on the banner, not as an empty table. */
async function api(path, opts) {
  try {
    const r = await fetch(path, opts);
    let body = null;
    try { body = await r.json(); } catch (e) { body = null; }
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: null, error: String(e && e.message || e) };
  }
}
const POST = (p, o) => api(p, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(o),
});

const $ = s => document.querySelector(s);
const el = (t, cls, text) => { const n = document.createElement(t);
  if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const base = p => String(p || '').split('/').pop();
const stem = p => base(p).replace(/\.[^.]+$/, '');

/* ⚠️ The renderer cannot load a `file://` image from an http origin, and the
   contract defines no thumbnail route. So the artwork shows when the file is
   one the server already serves out of `web/assets/`, and otherwise the frame
   stands empty with its mark and its name — which is exactly what `loading`
   looks like, and is honest rather than invented. A thumbnail route would fix
   it; adding one is a contract change, so it is reported, not improvised. */
const artUrl = a => a.url || `assets/${base(a.path)}`;
/* ⚠️ Task 5 gave the server an /api/assets/{id}/source route and put its URL on
   `a.url`, so `artUrl` now resolves for a file ANYWHERE on disk. The basename
   fallback survives only for the corpus fixtures the capture script seeds
   directly into web/assets/. The comment above this line used to say a
   thumbnail route was needed and none existed; that is no longer true. */

/* ── state ────────────────────────────────────────────────────────────────── */
const S = {
  assets: [],            // GET /api/assets
  flags: [],             // GET /api/flags  → {name, dest, type, choices, default, help, group}
  byDest: new Map(),
  open: null,            // the OPEN asset id — one at a time
  sel: new Set(),        // the SELECTED ids — separate from open; the drawers act on THIS
  anchor: null,          // shift-click range origin
  jobs: {},              // id → GET /api/jobs/{id} body, plus {job_id}
  blocked: new Set(),    // ids where a save was attempted with questions outstanding
  answers: {},           // id → {byColour:{hex:'protect'|'remove'}, fade:'artwork'|'not-artwork'|null}
  overrides: {},         // dest → explicit value. ONLY these are sent. Absent === auto.
  adviceDismissed: new Set(),   // suggestion keys the person waved away; they do not come back
  goal: { format: null, target_kb: null, min_dim: null },   // ⚠️ target_kb starts EMPTY
  qerror: null,          // the server's validation message, shown where it happened
  frame: 0,
  drawer: null,
  history: null,       // GET /api/history — null means NOT FETCHED, [] means empty
  historyErr: null,
  engineVersion: null, // GET /api/engine/status — to spot a line cut by a DIFFERENT engine
  seam: 50,
  banner: null,          // {state, text, action:{label, run}|null}
  /* the empty table's one orchestrated moment (DESIGN.md) -- id -> stagger
     index, cleared once the arrival plays. Never replayed once used. */
  arriving: new Map(),
  arrivalUsed: false,
  shape: null,            // 'empty' | 'sheet' | 'open' -- drives the transition
};

/* ── the eleven states ────────────────────────────────────────────────────
   `empty` is the table's state; the other ten belong to an item. `ready` is
   the neutral resting state the prototype already had — analysed, answered,
   not yet cut — and is not one of the eleven.

   The MARK is the state's shape, drawn on the frame the way a photographer
   annotates a contact sheet. The WORD is beside it. Colour only reinforces. */
const PENCIL = {
  /* already designed in the prototype — do not redraw them differently */
  done:       ['M22 58 l16 16 l34 -44',                         'var(--ok)'],
  ready:      ['M26 50 h48',                                     'var(--cyan)'],
  'not-checked': ['M28 28 l44 44 M72 28 l-44 44',                'var(--amber)'],
  'needs-you': ['M50 15 a35 35 0 1 1 -.1 0',                     'var(--ruby)'],
  running:    ['M50 15 a35 35 0 0 1 31 19',                      'var(--cyan)'],
  /* the six this stage adds. Each is a different SHAPE, legible in greyscale */
  loading:    ['M22 34 v-12 h12 M78 34 v-12 h-12 M22 66 v12 h12 M78 66 v12 h-12',
               'var(--graphite-3)'],                              // registration marks: the frame before the artwork
  refused:    ['M50 15 a35 35 0 1 1 -.1 0 M25 25 l50 50',        'var(--ruby)'],   // the circle, struck through
  cancelled:  ['M32 32 h36 v36 h-36 z',                          'var(--graphite-2)'], // a stop square
  failed:     ['M50 20 v36 M50 68 v2',                           'var(--ruby)'],   // an exclamation
  conflict:   ['M28 24 h30 v30 h-30 z M42 46 h30 v30 h-30 z',    'var(--amber)'],  // two files, offset
  blocked:    ['M18 50 h64 M18 38 v24 M82 38 v24',               'var(--ruby)'],   // a gate across the way
};
function pencil(kind, cls) {
  const [d, stroke] = PENCIL[kind] || PENCIL.ready;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', cls || 'pencil');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d); p.setAttribute('stroke', stroke); p.setAttribute('opacity', '.92');
  svg.append(p);
  return svg;
}

/* Questions outstanding on an asset, grouped the way the engine can actually
   answer them: BY OUTLINE COLOUR, never by region. Two regions sharing a
   colour cannot be answered differently — `--assume-protect X` and
   `--assume-remove X` at once is incoherent — so they are ONE question here
   and the collision is impossible by construction rather than rejected after
   the fact. (API-CONTRACT "Per-colour vs per-region"; PLAN.md 3.0a.) */
function colourGroups(a) {
  const regions = (a.questions && a.questions.ambiguous_protection) || [];
  const by = new Map();
  for (const r of regions) {
    const hex = String(r.outline_color || '').toLowerCase();
    if (!by.has(hex)) by.set(hex, []);
    by.get(hex).push(r);
  }
  return [...by.entries()].map(([hex, rs]) => ({ hex, regions: rs }));
}
function hasFade(a) {
  return !!(a.questions && a.questions.nameable_fade);
}
function outstanding(a) {
  const ans = S.answers[a.id] || { byColour: {}, fade: null };
  const out = colourGroups(a).filter(g => !ans.byColour[g.hex]).map(g => 'colour:' + g.hex);
  if (hasFade(a) && !ans.fade) out.push('fade');
  return out;
}

/* The one place a state is decided. Everything on screen reads from here, so
   the mark, the word, the banner and the button can never disagree. */
function stateOf(a) {
  const j = S.jobs[a.id];
  if (j) {
    if (j.state === 'loading' || j.state === 'running') return 'running';
    if (j.state === 'cancelled') return 'cancelled';
    if (j.state === 'failed') return 'failed';
    if (j.state === 'conflict') return 'conflict';
    /* ⚠️ done ONLY when the server sent a verification it actually ran.
       Anything else — the string "not-checked", a missing field, a verify
       that skipped its checks — is `not-checked`. A green tick that was not
       earned is worse than no tick. */
    if (j.state === 'done') {
      const v = j.verify;
      const ran = v && v !== 'not-checked' && !(v.checks_skipped && v.checks_skipped.length);
      return ran ? 'done' : 'not-checked';
    }
  }
  if (a.state === 'loading') return 'loading';
  if (a.state === 'refused') return 'refused';
  /* ⚠️ These two used to fall through to `ready`, which is the worst possible
     lie this function can tell: a source file that no longer exists, and an
     analyze that crashed, both read as "ready to cut" with a cyan mark, and
     the primary button offered to cut them.
     ⚠️ `blocked` means two different things and both are real. The server's is
     "the input is not there" (server/assets.py sets it when the path is gone);
     this file's is "you pressed save with questions outstanding". They share a
     word and a mark deliberately — in both cases the app cannot proceed and
     says why — so the server's is checked FIRST and the local one is the
     fallback, rather than one silently shadowing the other. */
  if (a.state === 'blocked') return 'blocked';
  if (a.state === 'failed') return 'failed';
  if (outstanding(a).length) return S.blocked.has(a.id) ? 'blocked' : 'needs-you';
  if (a.state === 'done') return 'done';
  return 'ready';
}

/* The word. Cutting vocabulary throughout — cut, keep, trim, the edge. Never
   process, render, job or output. Sentence case, no terminal punctuation. */
function wordOf(a) {
  const st = stateOf(a), j = S.jobs[a.id];
  switch (st) {
    case 'loading':     return 'reading it';
    case 'needs-you':   return 'needs you';
    case 'refused':     return 'it refused';
    case 'running':     return j && typeof j.progress === 'number'
                               ? `cutting · ${Math.round(j.progress * 100)}%` : 'cutting';
    case 'cancelled':   return 'stopped';
    case 'done':        return j && j.output_path ? `cut · ${base(j.output_path)}` : 'cut';
    case 'not-checked': return 'not checked';
    case 'failed':      return 'it failed';
    case 'conflict':    return j && j.output_path ? `saved as ${base(j.output_path)}` : 'saved beside it';
    case 'blocked':     return 'answer first';
    default:            return 'ready to cut';
  }
}

/* ── the contact sheet ────────────────────────────────────────────────────── */
function tile(a, big) {
  const st = stateOf(a);
  const b = el('button', big ? 'frame' : null);
  b.dataset.state = st;
  b.dataset.id = a.id;
  b.setAttribute('aria-label', `${base(a.path)} — ${wordOf(a)}`);
  if (!big) b.setAttribute('aria-current', String(a.id === S.open));
  if (big) b.setAttribute('aria-pressed', String(S.sel.has(a.id)));

  if (big && S.arriving.has(a.id)) {
    b.classList.add('arrive');
    b.style.setProperty('--i', String(S.arriving.get(a.id)));
  }
  const win = el('div', 'win chk-s');
  /* a different patch of sky per tile, keyed off the id so it is stable across
     re-renders rather than jumping every time the state changes */
  let seed = 0; for (let i = 0; i < a.id.length; i++) seed = (seed * 31 + a.id.charCodeAt(i)) >>> 0;
  win.style.backgroundPosition = `${-(seed % 470)}px ${-((seed >> 9) % 470)}px, 0 0`;
  const img = el('img');
  img.src = artUrl(a); img.alt = '';                // animates by itself; that is the point
  img.addEventListener('error', () => { img.hidden = true; win.classList.add('noart'); });
  win.append(img, pencil(st));
  if (st === 'loading') win.append(el('span', 'devbar'));   // opacity, not movement — survives reduced motion
  b.append(win);

  if (big) {
    /* the selection tick is a SHAPE in the corner, not a coloured border */
    if (S.sel.has(a.id)) b.append(pencil('done', 'seltick'));
    const cap = el('div', 'cap');
    cap.append(el('span', 'nm', base(a.path)), el('span', `st s-${st}`, wordOf(a)));
    b.append(cap);
  }
  b.addEventListener('click', e => onTileClick(e, a.id));
  return b;
}
const renderSheet = () => $('#sheet').replaceChildren(...S.assets.map(a => tile(a, true)));
const renderEdge  = () => $('#edge').replaceChildren(...S.assets.map(a => tile(a, false)));

/* ── selection (PLAN.md 2.3) ──────────────────────────────────────────────
   Selection is NOT "open". Click selects one and opens it; shift-click
   extends a range and stays on the sheet, because extending a range while the
   view jumps to the last item you touched is not a range selection. Meta or
   ctrl toggles. The drawers, the goal and the save button all act on the
   SELECTION — in the prototype they claimed to and could not. */
function onTileClick(e, id) {
  const i = S.assets.findIndex(x => x.id === id);
  if (e.shiftKey && S.anchor != null) {
    const j = S.assets.findIndex(x => x.id === S.anchor);
    if (j >= 0) {
      const [lo, hi] = i < j ? [i, j] : [j, i];
      S.sel = new Set(S.assets.slice(lo, hi + 1).map(x => x.id));
      render();
      return;
    }
  }
  if (e.metaKey || e.ctrlKey) {
    S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id);
    S.anchor = id;
    render();
    return;
  }
  S.sel = new Set([id]);
  S.anchor = id;
  openAsset(id);
}
const selected = () => S.assets.filter(a => S.sel.has(a.id));
/* what a save acts on: the selection, or the open one, or everything */
function targets() {
  const s = selected();
  if (s.length) return s;
  const a = S.assets.find(x => x.id === S.open);
  return a ? [a] : S.assets;
}

/* ── putting things on the table (PLAN.md 2.5) ────────────────────────────
   `FileSource` is the seam. Two functions, not a class — it costs nothing now
   and it is what a future web build would swap. Both return ABSOLUTE PATHS;
   the renderer never opens a file, and the server is the only thing that does. */
const FileSource = {
  available: () => typeof window.devoid !== 'undefined' && !!window.devoid.pickFiles,

  async pick() {
    if (!FileSource.available()) {
      console.warn('[devoid] window.devoid.pickFiles is absent — is web/preload.js wired ' +
                   'into main.js\'s webPreferences, and is ipcMain.handle("pick-files") registered?');
      setBanner('failed', 'The file picker is not wired up — start the app with npm start rather than a plain browser', null);
      return [];
    }
    try {
      return (await window.devoid.pickFiles()) || [];
    } catch (e) {
      setBanner('failed', `The file picker failed — ${e && e.message || e}`, null);
      return [];
    }
  },

  /* A dropped File carries no path through plain web APIs. `webUtils`
     recovers it, and it is reachable only from the preload. */
  fromDrop(dt) {
    const out = [];
    for (const f of Array.from((dt && dt.files) || [])) {
      let p = null;
      try { p = window.devoid && window.devoid.pathForFile ? window.devoid.pathForFile(f) : null; }
      catch (e) { p = null; }
      if (!p) p = f.path || null;                   // older Electron
      if (p) out.push(p);
    }
    if (!out.length && dt && dt.files && dt.files.length) {
      console.warn('[devoid] dropped ' + dt.files.length + ' file(s) but recovered no path — ' +
                   'window.devoid.pathForFile is missing (preload not loaded).');
      setBanner('failed', 'Dropped files carried no path — the app needs its preload bridge to read them', null);
    }
    return out;
  },
};

async function addPaths(paths) {
  if (!paths || !paths.length) return;
  /* DESIGN.md: "One orchestrated moment, and it belongs to the empty table
     ... rare moments earn animation; repeated ones must not have it." Gate
     it on a truly empty table, and never replay it once used this session. */
  const wasEmpty = S.assets.length === 0 && !S.arrivalUsed;
  const r = await POST('/api/assets', { paths });
  if (!r.ok) {
    setBanner('failed', `Could not put ${paths.length === 1 ? 'that' : 'those'} on the table — ${errText(r)}`, null);
    return;
  }
  const added = r.body || [];
  if (wasEmpty && added.length) {
    S.arrivalUsed = true;
    added.forEach((a, i) => S.arriving.set(a.id, i));
  }
  await refresh();
  if (S.arriving.size) {
    const total = 700 + (added.length - 1) * 90 + 150;
    setTimeout(() => { S.arriving.clear(); render(); }, total);
  }
  /* analysis is ~18s each, so the frame exists long before the artwork does */
  for (const a of added) analyze(a.id);
}

async function analyze(id) {
  patch(id, { state: 'loading' });
  render();
  const r = await api(`/api/assets/${encodeURIComponent(id)}/analyze`, { method: 'POST' });
  if (!r.ok) {
    patch(id, { state: 'ready' });
    setBanner('failed', `Could not read ${id} — ${errText(r)}`, null);
    render();
    return;
  }
  const b = r.body || {};
  patch(id, { state: b.state || 'ready', questions: b.questions || null, engine_version: b.engine_version });
  /* the format the engine recommends PRE-SELECTS the goal; it never forces it */
  const rec = b.questions && b.questions.recommended_format;
  if (rec && !S.goal.format) S.goal.format = { 'gif-ok': 'gif', 'webp-or-apng': 'webp', 'webp-or-avif': 'webp' }[rec] || null;
  if ((b.state || '') === 'refused') {
    const q = b.questions || {};
    setBanner('refused', q.not_applicable_reason || 'It will not cut this one, and no answer changes that',
      q.alternative_command ? { label: 'Copy what to run instead', run: () => copy(q.alternative_command) } : null);
  }
  render();
}

function patch(id, fields) {
  const a = S.assets.find(x => x.id === id);
  if (a) Object.assign(a, fields);
}
const errText = r => (r.body && (r.body.error || r.body.detail)) || r.error ||
  (r.status ? `the server said ${r.status}` : 'the server did not answer');
function copy(text) {
  try { navigator.clipboard.writeText(text); } catch (e) { console.info('[devoid]', text); }
}

/* ── the banner: refused, failed, conflict, blocked, cancelled, loading ────
   ⚠️ Never colour alone. It carries the state's own grease-pencil MARK and
   the state's WORD, and the sentence after them. */
function setBanner(state, text, action) { S.banner = state ? { state, text, action } : null; renderBanner(); }
function renderBanner() {
  const n = $('#banner');
  if (!S.banner) { n.hidden = true; return; }
  n.hidden = false;
  n.dataset.state = S.banner.state;
  $('#bannermark').replaceChildren(pencil(S.banner.state, 'bpencil'));
  $('#bannerword').textContent = S.banner.state.replace('-', ' ');
  $('#bannertext').textContent = S.banner.text;
  const b = $('#bannerbtn');
  b.hidden = !S.banner.action;
  if (S.banner.action) {
    b.textContent = S.banner.action.label;
    b.onclick = S.banner.action.run;
  }
}

/* ── the questions the engine refused to answer ───────────────────────────
   One question PER OUTLINE COLOUR. Real controls, a real submit, and the
   server's own validation surfaced where it happened rather than as a crash.
   The wipe that illustrates the answer is Stage 3's (`web/wipe.js`). */
/* PRODUCT.md's whole thesis: the coin-flip question is a VISUAL one, and
   delivering it as a hex string plus a bbox array is the failure the app
   exists to abolish. Light the disputed region on the artwork itself, using
   the same letterbox maths the plotter uses, so the mark lands on the pixels
   it is talking about at any window size. */
function renderQuestionRegions(a) {
  const wipe = $('#wipe');
  if (!wipe) return;
  for (const n of wipe.querySelectorAll('.qregion')) n.remove();
  if (!a) return;
  const groups = colourGroups(a);
  if (!groups.length) return;
  /* ⚠️ Where the source dimensions come from decides whether this function can
     run AT ALL. It used to read #before.naturalWidth -- and wipe.js's
     mountCanvases() does `before.hidden = true; before.removeAttribute('src')`,
     which takes naturalWidth to 0. So the hatch and its "is this yours?" tag
     were mutually exclusive with the seam BY CONSTRUCTION, and the seam is on
     screen exactly when a question is live: the region has never once been
     drawn in the state it exists for. Prefer the decoded canvas; fall back to
     the <img> only on the pre-seam path, where #before still has a src. */
  const sides = window.Devoid && window.Devoid.wipe && window.Devoid.wipe.sides
    ? window.Devoid.wipe.sides() : null;
  const art = $('#before');
  const sw = (sides && sides.a && sides.a.width) || art.naturalWidth;
  const sh = (sides && sides.a && sides.a.height) || art.naturalHeight;
  const P = window.Devoid && window.Devoid.plotter;
  if (!sw || !sh || !P) return;                 // nothing to register against yet
  /* ⚠️ ...and the padding has to come from whichever element is actually
     laid out. `.wipe>canvas` and `.wipe>img` carry different padding rules, so
     reading the hidden <img> once the canvases own the box puts every mark out
     by the difference. */
  const laidOut = $('#wipe-a') || art;
  const cs = getComputedStyle(laidOut);
  const pad = k => parseFloat(cs[k]) || 0;
  const box = wipe.getBoundingClientRect();
  const disp = { x: pad('paddingLeft'), y: pad('paddingTop'),
                 width: box.width - pad('paddingLeft') - pad('paddingRight'),
                 height: box.height - pad('paddingTop') - pad('paddingBottom') };
  if (disp.width <= 0 || disp.height <= 0) return;
  const ans = S.answers[a.id] || { byColour: {} };
  for (const g of groups) {
    for (const r of g.regions) {
      const bb = r.bbox_xyxy; if (!bb || bb.length !== 4) continue;
      const tl = P.sourceToDisplay({ x: bb[0], y: bb[1] }, disp, sw, sh);
      const br = P.sourceToDisplay({ x: bb[2], y: bb[3] }, disp, sw, sh);
      const m = el('div', 'qregion');
      const verdict = ans.byColour[g.hex];
      if (verdict) m.dataset.verdict = verdict;
      m.style.left = tl.x + 'px'; m.style.top = tl.y + 'px';
      m.style.width = Math.max(2, br.x - tl.x) + 'px';
      m.style.height = Math.max(2, br.y - tl.y) + 'px';
      m.append(el('b', null, verdict === 'protect' ? 'keeping this'
                          : verdict === 'remove' ? 'cutting this' : 'is this yours?'));
      wipe.append(m);
    }
  }
}
/* ⚠️ The mark has to stay registered to the artwork, and positioning it once
   leaves it stale: opening a drawer or gaining a toolbar row changes #wipe's
   box and the mark drifts off the pixels it is pointing at (measured: 3.7px
   after the plotter's toolbar laid out). A ResizeObserver catches every one
   of those, and unlike a requestAnimationFrame poll it still fires when the
   page is not being painted -- which is exactly the trap that made the
   plotter look broken. */
const requeryRegions = () => {
  const a = S.assets.find(x => x.id === S.open);
  if (a) renderQuestionRegions(a);
};
window.addEventListener('resize', requeryRegions);
if (typeof ResizeObserver !== 'undefined') {
  const wipeEl = $('#wipe');          // ⚠️ not the `wipe` const -- it is declared
  if (wipeEl) new ResizeObserver(requeryRegions).observe(wipeEl);   // far below
}

/* ── advice  (PLAN.md 5.3, D1 answered 2026-09-06) ──────────────────────────
   `web/advice.js` is 172 lines, complete, loaded by index.html since it was
   written, and had ZERO callers — instance seven of this project's signature
   failure. It is the MECHANISM: a caller supplies text, an apply that returns
   the prior value, and an undo that is handed exactly that value back. There is
   nowhere else for the undo to get its idea of "before" from, which is what
   makes `CLAUDE.md`'s rule enforceable rather than aspirational.

   ⚠️ TWO CALL SITES, AND NOT A THIRD. An unearned suggestion is a measured
   failure mode in this project's history; the rule exists because of it.

   ⚠️ AND THE FIRST ONE IS NOT WHAT THE PLAN SPECIFIED. The plan said: where
   `--recommend` names a flag the drawers expose, offer it, apply setting
   `S.overrides[dest]`. That is backwards. `suggested_command` IS what `--auto`
   already applies; writing it into `overrides` changes no output and turns
   `--auto` off for that flag (`server/cli.py:38` — everything absent is left to
   `--auto`). It would have been a suggestion whose only effect was to disable
   the thing this app is built around. The earned suggestion is the DISAGREEMENT:
   a row you took over, whose value the engine would not have chosen. Apply hands
   it back to auto and returns what you had; undo puts your value back. */
const adviceChips = new Map();          // key -> the handle advice.js returned
/* ⚠️ RE-ENTRANCY, and the gate caught it. Both apply and undo call render() so
   the rest of the UI follows the change — and render() calls renderAdvice(),
   which reconciles. advice.js sets `applied = true` only AFTER applyFn()
   returns, so during that inner render the chip reports applied === false while
   its own condition has already gone false, and the reconcile below retired the
   chip mid-apply. The undo then had nothing to click and the value never came
   back: "before=devoid-gate-disagrees setAfterApply=false after=undefined".
   Reconciliation is suspended for the duration of a suggestion's own callback. */
let adviceBusy = false;
const duringAdvice = fn => (...args) => {
  adviceBusy = true;
  try { return fn(...args); } finally { adviceBusy = false; }
};

function recommendedByName(a) {
  /* ⚠️ `suggested_flag_tokens`, not `suggested_command`. The command string is
     NOT on the client — `questions()` never sent it — and re-splitting a shell
     line here would be the fourth instance of the shape-assumption bug
     `server/validate.py`'s header lists. The server already split it with
     `shlex`; this pairs the flat token list. A bare switch carries no value. */
  const toks = (a.questions && a.questions.suggested_flag_tokens) || [];
  const out = new Map();
  for (let i = 0; i < toks.length; i++) {
    if (!/^--/.test(toks[i])) continue;
    const next = toks[i + 1];
    if (next !== undefined && !/^--/.test(next)) { out.set(toks[i], next); i++; }
    else out.set(toks[i], true);
  }
  return out;
}

function renderAdvice(a) {
  const host = $('#advice-host');
  if (!host || typeof (window.Devoid && window.Devoid.suggest) !== 'function') return;
  if (adviceBusy) return;               // a chip's own apply/undo is mid-flight

  const want = new Map();               // key -> { text, apply, undo }

  /* 1. A taken-over row the engine would not have chosen. */
  if (a && S.byDest) {
    const rec = recommendedByName(a);
    for (const [name, value] of rec) {
      const f = S.flags && S.flags.find(x => x.name === name);
      if (!f) continue;                                   // not a row the drawers expose
      if (!Object.prototype.hasOwnProperty.call(S.overrides, f.dest)) continue;   // still on auto
      const mine = String(S.overrides[f.dest]);
      if (mine === String(value)) continue;               // you and it agree
      const dest = f.dest;
      want.set('flag:' + dest, {
        text: `The engine would use ${value} for ${name}; you have set ${mine}`,
        applyText: 'hand it back to auto',
        apply: duringAdvice(() => { const was = S.overrides[dest]; delete S.overrides[dest]; render(); return was; }),
        undo: duringAdvice(was => { S.overrides[dest] = was; render(); }),
      });
    }
  }

  /* 2. The fade answer that collides with a stated GIF goal. PRODUCT.md: the
        app RESOLVES that collision, it does not discover it. Until now this was
        a sentence with no action attached (`renderQuestions`, the .qwarn row). */
  const ans = a ? S.answers[a.id] : null;
  if (ans && ans.fade === 'artwork' && S.goal.format === 'gif') {
    want.set('fade-format', {
      text: 'Keeping the fade needs 8-bit alpha; the goal says gif',
      applyText: 'switch the goal to webp',
      apply: duringAdvice(() => { const was = S.goal.format; S.goal.format = 'webp'; render(); return was; }),
      undo: duringAdvice(was => { S.goal.format = was; render(); }),
    });
  }

  /* Reconcile rather than rebuild: render() runs on every poll tick, and
     rebuilding would destroy an applied chip's undo. ⚠️ An APPLIED chip is never
     retired automatically — applying it is exactly what makes its own condition
     false, so retiring it would delete the undo the moment it became useful. */
  for (const [key, handle] of [...adviceChips]) {
    if (!handle.element.isConnected) { adviceChips.delete(key); continue; }
    if (want.has(key) || handle.applied()) continue;
    handle.dismiss();
    adviceChips.delete(key);
  }
  for (const [key, spec] of want) {
    if (adviceChips.has(key) || S.adviceDismissed.has(key)) continue;
    const handle = window.Devoid.suggest(spec.text, spec.apply, spec.undo, {
      host,
      applyText: spec.applyText,
      onDismiss: reason => {
        adviceChips.delete(key);
        if (reason === 'dismissed' || reason === 'kept') S.adviceDismissed.add(key);
      },
    });
    adviceChips.set(key, handle);
  }
}

function renderQuestions(a) {
  const box = $('#questions');
  const groups = colourGroups(a), fade = hasFade(a);
  if (!groups.length && !fade) { box.hidden = true; box.replaceChildren(); return; }
  box.hidden = false;
  const ans = S.answers[a.id] || (S.answers[a.id] = { byColour: {}, fade: null });
  box.replaceChildren();

  for (const g of groups) {
    const q = el('div', 'q');
    const n = g.regions.length;
    /* ⚠️ F3. This used to read "The place outlined in 002864" over a raw
       `[94, 56, 164, 145]`. PRODUCT.md line 31 names that exact shape as the
       thing the app exists to abolish: "Nobody can answer 'is the region at
       bbox [230,135,406,359] outlined in 002864 design or background?' by
       reading it. They have to see it." The spec assumed F2 closed this for
       free -- draw the region and the string stops mattering -- and the 09-seam
       capture falsified that: the hatch and the hex string were on screen
       together. The mark on the artwork is the identity now; the swatch carries
       the colour; the hex and the bbox are machine coordinates and are gone.
       The frame count STAYS -- it is a real measurement the engine earned, and
       it is the one thing here you cannot see by looking. */
    q.append(el('h3', null, n > 1
      ? `${n} places are marked on the artwork — one answer covers all of them`
      : 'The marked place on the artwork'));
    const swatch = el('span', 'swatch');
    swatch.style.setProperty('--hex', '#' + g.hex);
    const where = el('p', 'qwhere');
    where.append(swatch, el('span', null, g.regions.map(r =>
      `held on ${r.frames_enclosed} of ${r.frames_checked} frames`
    ).join('  ·  ')));
    q.append(where);
    q.append(answerPair(a, [
      ['Keep it', 'protect', ans.byColour[g.hex] === 'protect'],
      ['Cut it',  'remove',  ans.byColour[g.hex] === 'remove'],
    ], v => { ans.byColour[g.hex] = v; S.blocked.delete(a.id); S.qerror = null; render(); }));
    box.append(q);
  }

  if (fade) {
    const f = a.questions.nameable_fade;
    const q = el('div', 'q');
    q.append(el('h3', null, `The fade in ${f.color}`));
    q.append(el('p', 'qwhere', `${f.faint_px} faint px on frame ${f.frame_index}`));
    q.append(answerPair(a, [
      ['It is artwork',  'artwork',     ans.fade === 'artwork'],
      ['It is not',      'not-artwork', ans.fade === 'not-artwork'],
    ], v => { ans.fade = v; S.blocked.delete(a.id); S.qerror = null; render(); }));
    /* ⚠️ Answering "it is artwork" forces an 8-bit-alpha container. Say so
       BEFORE the person picks a format, rather than discovering it later. */
    if (ans.fade === 'artwork' && S.goal.format === 'gif') {
      q.append(el('p', 'qwarn', 'Keeping the fade needs webp, avif or apng — the goal says gif, so change one of them'));
    }
    box.append(q);
  }

  if (S.qerror) box.append(el('p', 'qwarn', S.qerror));

  const submit = el('button', 'btn go', 'Answer');
  submit.disabled = !!outstanding(a).length;
  submit.addEventListener('click', () => submitAnswers(a));
  const foot = el('div', 'qfoot');
  foot.append(submit, el('span', 'qhint', outstanding(a).length
    ? `${outstanding(a).length} still to answer`
    : (colourGroups(a).length + (hasFade(a) ? 1 : 0)) > 1 ? 'every answer is in' : 'answered'));
  box.append(foot);
}

function answerPair(a, opts, pick) {
  const row = el('div', 'qpair');
  for (const [label, value, on] of opts) {
    const b = el('button', 'btn' + (on ? ' on' : ''), label);
    b.setAttribute('aria-pressed', String(on));
    b.addEventListener('click', () => pick(value));
    row.append(b);
  }
  return row;
}

async function submitAnswers(a) {
  const ans = S.answers[a.id] || { byColour: {}, fade: null };
  /* expand one colour answer back onto every region that shares that colour —
     which is exactly why the collision the server rejects cannot occur here */
  const ambiguous = {};
  for (const g of colourGroups(a)) {
    const v = ans.byColour[g.hex];
    if (!v) continue;
    for (const r of g.regions) ambiguous[String(r.region_id)] = v;
  }
  const r = await POST(`/api/assets/${encodeURIComponent(a.id)}/answers`,
    { ambiguous_protection: ambiguous, fade: ans.fade || null });
  if (!r.ok) {
    /* the contract's own 400. It should be unreachable from this UI — the
       grouping prevents it — so if it fires, the grouping has a bug. */
    if (r.body && r.body.error === 'conflicting_colour') {
      S.qerror = `Two places outlined in ${r.body.outline_color} were sent different answers — ` +
                 'they share a colour, so the tool can only be told one thing about them';
    } else {
      S.qerror = `The answer did not go through — ${errText(r)}`;
    }
    render();
    return;
  }
  S.qerror = null;
  S.blocked.delete(a.id);
  patch(a.id, { state: (r.body && r.body.state) || 'ready', questions: null });
  render();
}

/* ── the wipe ─────────────────────────────────────────────────────────────
   The seam belongs to `web/wipe.js` (Stage 3), which replaces this pair with
   the two ANSWERS rather than source-vs-output. Until it loads, the shell
   keeps the drag alive so the app is never inert. wipe.js calls
   `window.Devoid.releaseWipe()` to take the element over cleanly. */
const wipe = $('#wipe');
const wipeCtl = new AbortController();
let wipeOwned = false;
/* the pair currently behind the seam, so render() does not re-fetch on every tick */
let seamKey = null;
function setSeam(pct) {
  S.seam = Math.max(0, Math.min(100, pct));
  wipe.style.setProperty('--seam', S.seam + '%');
  wipe.setAttribute('aria-valuenow', String(Math.round(S.seam)));
  /* ⚠️ A bare number tells a screen reader nothing. Both canvases are
     aria-hidden, so `52` was the entire description of the app's central
     widget — the listener had no way to know which side was which. */
  wipe.setAttribute('aria-valuetext',
    `${Math.round(S.seam)}% — keep it on the left, cut it on the right`);
}
function seamFrom(e) {
  const r = wipe.getBoundingClientRect();
  setSeam(((e.clientX - r.left) / r.width) * 100);
}
wipe.tabIndex = 0;
wipe.setAttribute('role', 'slider');
wipe.setAttribute('aria-valuemin', '0');
wipe.setAttribute('aria-valuemax', '100');
wipe.setAttribute('aria-label', 'Drag the cut line to compare');
const sig = { signal: wipeCtl.signal };
wipe.addEventListener('pointerdown', e => { wipe.setPointerCapture(e.pointerId); seamFrom(e); }, sig);
wipe.addEventListener('pointermove', e => { if (e.buttons) seamFrom(e); }, sig);
wipe.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  { setSeam(S.seam - 4); e.preventDefault(); }
  if (e.key === 'ArrowRight') { setSeam(S.seam + 4); e.preventDefault(); }
  /* the two ends of the comparison, one key each -- a slider without them
     makes "show me only the cut side" a twenty-five-press job */
  if (e.key === 'Home')       { setSeam(0);   e.preventDefault(); }
  if (e.key === 'End')        { setSeam(100); e.preventDefault(); }
}, sig);

/* ── the ledger ───────────────────────────────────────────────────────────
   What this setting is about to destroy, from numbers the engine already
   computes. ⚠️ NO NUMBERS MEANS NOT CHECKED, and the blank says so — louder
   than a chip, which is the correct relationship. */
function renderLedger(a) {
  const L = $('#ledger');
  L.replaceChildren();
  const j = S.jobs[a.id];
  const px = (j && j.ledger) || a.ledger || null;
  if (!px) {
    L.append(pencil('not-checked', 'lmark'));
    L.append(el('span', 'blank', 'not checked — nothing was measured on this one'));
    return;
  }
  const bg = Number(px.bg), total = Number(px.total), whole = bg + total || 1;
  const bar = el('div', 'ledger-bar');
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label',
    `${bg.toLocaleString()} background px removed, ${total.toLocaleString()} artwork px survive`);
  const segBg = el('span', 'lseg lseg-bg'); segBg.style.flexGrow = String(bg / whole);
  const segArt = el('span', 'lseg lseg-total'); segArt.style.flexGrow = String(total / whole);
  bar.append(segBg, segArt);
  L.append(bar);
  L.append(el('span', null, `removes ${bg.toLocaleString()} background px`));
  /* ⚠️ `art` is a CEILING — it counts every source pixel that differed from
     the corner colour and ended up transparent, including the antialiasing
     ramp the keyer is meant to remove. Comparable BETWEEN settings on one
     asset, never quotable as absolute damage. Hence "at most".
     ⚠️ There is deliberately NO threshold here. The prototype coloured this
     against an invented 500, and an invented number colouring the app's
     central honesty widget is the exact failure these docs exist to prevent.
     PLAN.md 3.5 gives it a real basis; until then it is stated, not judged. */
  /* ⚠️ `art` is DELIBERATELY null on the preview path — server/preview.py's
     _ledger refuses to derive it from a re-encoded single frame, because that
     would be measuring against a different image. `Number(null)` is 0, so this
     line used to print "at most 0 artwork px lost": the strongest possible
     claim, about a quantity nobody measured. wipe.js guards this; this copy
     did not. Say it was not measured. */
  if (typeof px.art === 'number') {
    L.append(el('span', 'atmost', `at most ${px.art.toLocaleString()} artwork px lost`));
  } else {
    L.append(el('span', 'atmost', 'artwork lost — not measured on this one'));
  }
  L.append(el('span', null, `${Number(px.total).toLocaleString()} px of artwork survive`));
}

/* ── frames ───────────────────────────────────────────────────────────────── */
function renderFilm(a) {
  const frames = a.frames || 0;
  if (!frames) { $('#frames').replaceChildren(); $('#fcount').textContent = 'frames not read yet'; return; }
  const N = Math.min(34, frames), step = Math.max(1, Math.round(frames / N));
  const cur = Math.round(S.frame / step);
  $('#frames').replaceChildren(...Array.from({ length: N }, (_, i) => {
    const f = i * step, b = el('button');
    b.setAttribute('aria-label', `frame ${f}`);
    if (i === cur) b.setAttribute('aria-current', 'true');
    if (Math.abs(i - cur) === 1) b.classList.add('ghost');
    if ((a.flagged || []).some(x => Math.abs(x - f) < step)) b.classList.add('flag');
    b.addEventListener('click', () => {
      S.frame = f;
      /* ⚠️ F6. wipe.js:491's seekToFrame is exported at :804 and its own comment
         calls it "the hook the film strip needs" — and it had ZERO callers, so
         clicking a frame moved the counter and nothing else. The strip counted
         frames it could not reach. */
      const W = window.Devoid && window.Devoid.wipe;
      if (W && typeof W.seekToFrame === 'function') W.seekToFrame(f);
      renderFilm(a);
    });
    return b;
  }));
  /* ⚠️ F14. This used to append `· 0 flagged`, permanently: `flagged` appears
     nowhere in server/, so nothing can ever set it. A counter that is
     structurally always zero is a claim about a feature that does not exist.
     The `.flag` notch above stays — it reads the same field and degrades to
     nothing, so it costs no claim. */
  /* ⚠️ AND F6 GOES DEEPER THAN "seekToFrame HAS NO CALLER". Giving it one was
     necessary and not sufficient: measured 2026-09-06, clicking the last of 144
     buttons moved S.frame to 132 and left the pixels byte-identical, because
     `Devoid.wipe.sides().a` holds ONE frame. server/preview.py extracts a single
     frame per side deliberately — its header carries the fidelity measurement —
     so while the seam is up the stage CANNOT be scrubbed, by construction. With
     the seam down there are no canvases at all and seekToFrame returns on its
     first line. So the strip could never move any artwork in any state, and it
     said nothing about that. It says it now. Making it actually scrub is Task 27. */
  const WF = window.Devoid && window.Devoid.wipe;
  const sideA = WF && typeof WF.sides === 'function' ? WF.sides().a : null;
  const scrubbable = !!(sideA && sideA.timeline && sideA.timeline.count > 1);
  const why = sideA ? 'the comparison shows one frame' : 'not scrubbable yet';
  for (const b of $('#frames').children) b.disabled = !scrubbable;
  $('#frames').toggleAttribute('data-inert', !scrubbable);
  $('#fcount').textContent = scrubbable
    ? `${S.frame} of ${frames} frames`
    : `${frames} frames · ${why}`;
}

/* ── the drawers ──────────────────────────────────────────────────────────
   ⚠️ HAND-AUTHORED, AND THAT IS THE POINT. `GET /api/flags` gives each row its
   live type, choices, default and help — so a control can never drift from the
   flag it drives, and a flag in no drawer surfaces as a warning. It does NOT
   generate rows: a control per flag is the 63-control passthrough form that
   CLAUDE.md forbids and PRODUCT.md calls a failure of the whole design.

   The five group names are the PERSON's words, unchanged from the prototype.
   The third column is the dest on the skill's own parser, verified against
   `scripts/remove_gif_background.py`'s add_argument calls.
   `goal:` rows are the GOAL (PLAN.md 2.7), not overrides — they travel in
   `goal`, not in `overrides`, because they are what you want rather than how
   to get it. `report:` rows are read-only findings, not controls. */
const DRAWERS = {
  'what to keep': [
    ['Kept region',   'flag:protect_region'],
    ['Cut region',    'flag:remove_region'],
    ['Follow it',     'flag:remove_region_track'],
  ],
  'the edge': [
    ['Trim',          'flag:edge_cleanup_erosion'],
    ['Soften',        'flag:edge_softening'],
    ['Dither',        'flag:dither_mode'],
  ],
  'how small': [
    ['Cap',           'goal:target_kb'],
    ['Never below',   'goal:min_dim'],
    ['Kind of file',  'goal:format'],
  ],
  'what it found': [
    ['Background',    'flag:bg_color'],
    ['Edges',         'flag:pixel_art'],
    ['Fade',          'flag:recover_fade_alpha'],
  ],
  'it refused': [
    ['report:refusal'],
  ],
  /* PLAN.md 5.2, "re-run with a tweak by loading a line". The route existed
     from Stage 5 and nothing on the surface ever called it -- the same
     reachability gap that left the plotter hidden. This is the caller. */
  'what you did': [
    ['report:history'],
  ],
};

/* ── the tri-state control (PLAN.md 2.6) ──────────────────────────────────
   A row reads `auto · <default>` until it is deliberately taken over. Only
   taken-over rows enter `overrides`, so `--auto` keeps applying its
   recommendation everywhere else — which is what makes the drawer a live
   readout of the tool's own reasoning rather than a form.

   Taking a row over always ships its undo: "back to auto", which reverts
   exactly what it changed. A suggestion without one does not ship, and
   neither does a takeover. */
function flagRow(label, dest) {
  const f = S.byDest.get(dest);
  const row = el('div', 'ctl');
  row.append(el('span', 'lab', label));
  if (!f) {
    /* a control whose flag the server does not report is a WARNING, not a
       silent blank — it means the parser moved and the drawer did not */
    row.append(el('span', 'missing', `no flag named ${dest}`));
    row.title = `Devoid expects a --${dest.replace(/_/g, '-')} option and GET /api/flags did not report one`;
    return row;
  }
  row.title = f.help || '';
  const taken = Object.prototype.hasOwnProperty.call(S.overrides, dest);
  if (!taken) {
    const b = el('button', 'auto', `auto · ${show(f.default)}`);
    b.setAttribute('aria-label', `${label} — left to the tool, currently ${show(f.default)}. Take it over`);
    b.addEventListener('click', () => { S.overrides[dest] = f.default === null ? defaultFor(f) : f.default; render(); });
    row.append(b);
    return row;
  }
  row.append(editor(f, S.overrides[dest], v => { S.overrides[dest] = v; render(); }));
  const undo = el('button', 'undo', 'back to auto');
  undo.setAttribute('aria-label', `${label} — hand it back to the tool`);
  undo.addEventListener('click', () => { delete S.overrides[dest]; render(); });
  row.append(undo);
  return row;
}

function goalRow(label, key) {
  const row = el('div', 'ctl');
  row.append(el('span', 'lab', label));
  const v = S.goal[key];
  if (key === 'format') {
    const sel = el('select', 'val');
    /* ⚠️ pre-selected from the engine's `recommended_format`, never forced */
    for (const o of ['auto', 'gif', 'webp', 'avif', 'apng']) {
      const opt = el('option', null, o); opt.value = o;
      if ((v || 'auto') === o) opt.selected = true;
      sel.append(opt);
    }
    sel.setAttribute('aria-label', label);
    sel.addEventListener('change', () => { S.goal.format = sel.value === 'auto' ? null : sel.value; render(); });
    row.append(sel);
    if (!v) row.append(el('span', 'auto', 'auto'));
    return row;
  }
  /* ⚠️ NEVER INFER A SIZE TARGET. It starts empty and stays empty until
     somebody types one. A guessed cap produces a real file at a real size and
     nothing downstream says the number was invented. */
  const inp = el('input', 'val');
  inp.type = 'number'; inp.min = '1';
  inp.placeholder = key === 'target_kb' ? 'not set' : 'not set';
  inp.value = v == null ? '' : String(v);
  inp.setAttribute('aria-label', label + (key === 'target_kb' ? ' in KB' : ' in px'));
  inp.addEventListener('change', () => {
    const n = inp.value.trim() === '' ? null : Number(inp.value);
    S.goal[key] = Number.isFinite(n) ? n : null;
    render();
  });
  row.append(inp);
  row.append(el('span', 'unit', key === 'target_kb' ? 'KB' : 'px'));
  return row;
}

/* the refusal drawer is a REPORT — the engine's own words, not a control */
function refusalRows() {
  const a = S.assets.find(x => x.id === S.open) || selected()[0];
  const q = (a && a.questions) || {};
  const rows = [];
  if (a && q.not_applicable_reason) {
    rows.push(el('p', 'refusal', q.not_applicable_reason));
    if (q.alternative_command) {
      const c = el('code', 'cmd', q.alternative_command);
      const b = el('button', 'undo', 'copy it');
      b.addEventListener('click', () => copy(q.alternative_command));
      rows.push(c, b);
    }
  } else if (a && outstanding(a).length) {
    rows.push(el('p', 'refusal', `${outstanding(a).length} question${outstanding(a).length > 1 ? 's' : ''} waiting on you, below the picture`));
  } else {
    rows.push(el('p', 'refusal', 'Nothing refused'));
  }
  return rows;
}

/* ── the history drawer (PLAN.md 5.2) ─────────────────────────────────────
   A REPORT of the job log, and the one place a past run can be loaded back.

   ⚠️ This is what a "reachability" bug looks like once it is fixed. Both routes
   -- `GET /api/history` and `POST /api/history/{line_id}/rerun` -- shipped with
   Stage 5, are covered by pytest, and were called by NOTHING on the surface. A
   passing test proves a route answers; it says nothing about whether anyone
   can get to it. Check the call site, not the test.

   ⚠️ It says what it did NOT restore. A run carries overrides, a goal, regions
   and answers; loading a line restores the first three and cannot restore the
   answers, because those belong to an analysis this asset has not run yet. A
   silent partial restore is the "verification the run did not earn" failure
   (PRODUCT.md) wearing different clothes. */

function relTime(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso || '';
  const secs = Math.max(0, (Date.now() - t) / 1000);
  if (secs < 90) return 'just now';
  const mins = secs / 60;
  if (mins < 90) return `${Math.round(mins)} min ago`;
  const hours = mins / 60;
  if (hours < 36) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

async function fetchHistory() {
  /* ⚠️ Two fetches, NOT awaited together. `/api/engine/status` imports the
     whole engine module on its first call and can take seconds; a Promise.all
     made the drawer sit on "Reading the log…" for all of it while the log
     itself had answered in milliseconds. The log paints as soon as it lands.
     Caught by looking at the screenshot, which is the only thing that could
     have caught it -- every assertion about this drawer still passed. */
  const h = await api('/api/history?limit=50');
  S.history = h.ok && Array.isArray(h.body) ? h.body : [];
  S.historyErr = h.ok ? null : (errText(h) || 'the log could not be read');
  render();

  /* the live engine identity arrives second and only ADDS a note -- a line cut
     by a different build would not necessarily repeat, and replaying it as
     though nothing had changed underneath is the claim worth not making */
  if (S.engineVersion === null) {
    const e = await api('/api/engine/status');
    const v = (e.ok && e.body && e.body.engine_version) || null;
    if (v && v !== S.engineVersion) { S.engineVersion = v; render(); }
  }
}

function historyRows() {
  if (S.history === null) { fetchHistory(); return [el('p', 'refusal', 'Reading the log…')]; }
  if (S.historyErr) return [el('p', 'refusal', `The log could not be read — ${S.historyErr}`)];
  if (!S.history.length) {
    return [el('p', 'refusal', 'Nothing cut yet. Every finished job lands here, oldest at the bottom')];
  }

  const rows = [];
  for (const line of S.history) {
    const row = el('div', 'hist');
    const head = el('div', 'hist-head');
    head.append(el('span', 'hist-name', base(line.input_path || '')));
    head.append(el('span', `hist-verdict v-${line.verdict || 'done'}`, line.verdict || 'done'));
    row.append(head);

    const meta = el('div', 'hist-meta');
    meta.append(el('span', null, relTime(line.ts)));
    const stale = S.engineVersion && line.engine_version && line.engine_version !== S.engineVersion;
    if (stale) meta.append(el('span', 'hist-stale', 'different engine'));
    row.append(meta);

    const load = el('button', 'undo', 'load these settings');
    load.addEventListener('click', () => loadHistoryLine(line));
    row.append(load);
    rows.push(row);
  }
  return rows;
}

async function loadHistoryLine(line) {
  const r = await POST(`/api/history/${line.line_id}/rerun`, {});
  if (!r.ok) {
    /* the contract's own 404: absent settings and an absent FILE are not the
       same failure, and the person needs to be told which one happened */
    const missing = r.body && r.body.error === 'input_missing';
    setBanner('failed', missing
      ? `That file is not where it was — ${line.input_path}`
      : `Could not load that line — ${errText(r)}`, null);
    return;
  }
  const asset = r.body.asset || null;
  const settings = r.body.settings || {};

  await refresh();
  S.overrides = { ...(settings.overrides || {}) };
  S.goal = { format: null, target_kb: null, min_dim: null, ...(settings.goal || {}) };
  if (asset) openAsset(asset.id);
  /* AFTER openAsset: `devoid:asset-opened` clears the plotter, so setting the
     regions first would hand them straight back to an empty canvas. */
  const regions = settings.regions || [];
  if (regions.length && window.Devoid && window.Devoid.plotter && window.Devoid.plotter.setRegions) {
    window.Devoid.plotter.setRegions(regions);
  }

  const restored = ['settings'];
  if (regions.length) restored.push(`${regions.length} region${regions.length > 1 ? 's' : ''}`);
  const answers = Object.keys((settings.answers || {})).length;
  setBanner('not-checked',
    `Loaded ${restored.join(' and ')} from that run` +
    (answers ? '. Its answers were not restored — this copy has not been analysed yet' : '') +
    '. Nothing is cut until you press save',
    null);
}

const show = v => v === null || v === undefined ? 'off' : (v === true ? 'on' : (v === false ? 'off' : String(v)));
const defaultFor = f => f.type === 'bool' ? true : (f.choices && f.choices.length ? f.choices[0] : '');

function editor(f, value, set) {
  if (f.choices && f.choices.length) {
    const sel = el('select', 'val');
    for (const o of f.choices) {
      const opt = el('option', null, String(o)); opt.value = String(o);
      if (String(value) === String(o)) opt.selected = true;
      sel.append(opt);
    }
    sel.setAttribute('aria-label', f.name);
    sel.addEventListener('change', () => set(sel.value));
    return sel;
  }
  if (f.type === 'bool') {
    const b = el('button', 'val', value ? 'on' : 'off');
    b.setAttribute('aria-pressed', String(!!value));
    b.setAttribute('aria-label', f.name);
    b.addEventListener('click', () => set(!value));
    return b;
  }
  const inp = el('input', 'val');
  inp.type = (f.type === 'int' || f.type === 'float') ? 'number' : 'text';
  if (f.type === 'float') inp.step = 'any';
  inp.value = value == null ? '' : String(value);
  inp.setAttribute('aria-label', f.name);
  inp.addEventListener('change', () => {
    const raw = inp.value.trim();
    set(f.type === 'int' || f.type === 'float' ? (raw === '' ? null : Number(raw)) : raw);
  });
  return inp;
}

function renderTabs() {
  $('#tabs').replaceChildren(...Object.keys(DRAWERS).map(name => {
    const b = el('button', null, name);
    b.setAttribute('aria-expanded', String(S.drawer === name));
    b.addEventListener('click', () => { S.drawer = S.drawer === name ? null : name; render(); });
    return b;
  }));
  const d = $('#drawer');
  d.hidden = !S.drawer;
  if (!S.drawer) return;
  d.replaceChildren(el('h2', null, S.drawer));

  /* the drawers act on the SELECTION, and they say so -- except the history,
     which is the whole log and would be lying if it claimed a scope. */
  if (S.drawer !== 'what you did') {
    const n = targets().length;
    d.append(el('p', 'scope', n === 1
      ? `on ${base(targets()[0].path)}`
      : `on ${n} selected`));
  }

  for (const spec of DRAWERS[S.drawer]) {
    /* ⚠️ Two shapes, and reading them as one is a bug this file already had.
       A control row is ['Label', 'kind:key']; a report row is ['kind:key']
       alone. Destructuring both as [label, ref] left `ref` undefined for a
       report, so EVERY report fell into one branch and the `kind === 'report'`
       dispatch below it was unreachable -- which is why the history drawer
       first rendered "Nothing refused". Normalise the shape, then dispatch. */
    const ref = spec.length === 1 ? spec[0] : spec[1];
    const label = spec.length === 1 ? null : spec[0];
    const [kind, key] = String(ref).split(':');
    if (kind === 'report') {
      d.append(...(key === 'history' ? historyRows() : refusalRows()));
      continue;
    }
    d.append(kind === 'goal' ? goalRow(label, key) : flagRow(label, key));
  }

  if (S.drawer === 'how small') {
    d.append(el('p', 'scope',
      'Nothing here is guessed. A cap only exists because you typed one'));
  }
}

/* ── saving: the cut itself ───────────────────────────────────────────────
   ⚠️ PANEL-OPTIONAL IS A HARD GATE (DESIGN.md's checks, PLAN.md gate 5). Drop
   files, answer the questions, press this — no drawer is ever required. Every
   drawer control has a working `auto`, so an untouched app sends an empty
   `overrides` and lets `--auto` do its job, which is the whole design. */
function goalPayload() {
  const g = {};
  if (S.goal.format) g.format = S.goal.format;
  if (S.goal.target_kb != null) g.target_kb = S.goal.target_kb;
  if (S.goal.min_dim != null) g.min_dim = S.goal.min_dim;
  return g;
}

async function cut(confirmed) {
  const list = targets().filter(a => stateOf(a) !== 'running');
  if (!list.length) return;

  /* ⚠️ One click used to start every job on the table against an IMPLICIT
     selection -- `targets()` falls back to everything when nothing is
     selected, so "Cut 6" with zero selected wrote six files with no warning.
     An explicit selection is taken at its word; an implicit one is confirmed,
     naming the count and where the files land. */
  if (!confirmed && !S.sel.size && list.length > 1) {
    setBanner('conflict',
      `Cut all ${list.length}? Each one is written beside its own file`,
      { label: `Cut ${list.length}`, run: () => { S.banner = null; cut(true); } });
    return;
  }

  /* blocked: a save with questions outstanding. A first-class state, not a
     disabled button — a disabled button never says why.
     ⚠️ Only the ones with a question are blocked. Stopping a whole batch
     because one item asked something would make the commonest case — a
     drop of twenty where two refuse — worse than the CLI, which cuts the
     eighteen. The blocked two keep their mark, their word and their banner. */
  const waiting = list.filter(a => outstanding(a).length);
  const going = list.filter(a => !outstanding(a).length);
  for (const a of waiting) S.blocked.add(a.id);
  if (waiting.length) {
    setBanner('blocked',
      (waiting.length === 1
        ? `${base(waiting[0].path)} has a question waiting`
        : `${waiting.length} have a question waiting`) +
      (going.length ? ` — the other ${going.length} ${going.length === 1 ? 'is' : 'are'} going now` : ' — answer it and it will go'),
      { label: 'Take me to it', run: () => { openAsset(waiting[0].id); $('#questions').scrollIntoView({ block: 'nearest' });
                                             const b = $('#questions button'); if (b) b.focus(); } });
  } else {
    setBanner(null);
  }

  for (const a of going) startCut(a);
  render();
}

async function startCut(a) {
  const body = { overrides: { ...S.overrides }, regions: currentRegions(), goal: goalPayload() };
  S.jobs[a.id] = { state: 'running', progress: null };
  render();
  const r = await POST(`/api/assets/${encodeURIComponent(a.id)}/render`, body);
  if (!r.ok || !r.body || !r.body.job_id) {
    S.jobs[a.id] = { state: 'failed', error: errText(r) };
    setBanner('failed', `${base(a.path)} — ${errText(r)}`,
      { label: 'Try again', run: () => { setBanner(null); startCut(a); } });
    render();
    return;
  }
  S.jobs[a.id].job_id = r.body.job_id;
  poll(a, r.body.job_id);
}

const POLL_MS = 700;
function poll(a, jobId) {
  const tick = async () => {
    const r = await api(`/api/jobs/${encodeURIComponent(jobId)}`);
    if (!r.ok) {
      S.jobs[a.id] = { job_id: jobId, state: 'failed', error: errText(r) };
      settle(a);
      return;
    }
    S.jobs[a.id] = { job_id: jobId, ...(r.body || {}) };
    render();
    const st = (r.body && r.body.state) || '';
    if (st === 'running' || st === 'loading') { setTimeout(tick, POLL_MS); return; }
    settle(a);
  };
  setTimeout(tick, POLL_MS);
}

/* ── the seam's caller (PLAN.md 3.1) ──────────────────────────────────────
   ⚠️ THIS FUNCTION IS THE WHOLE REASON THE SEAM EXISTS, AND IT DID NOT EXIST.
   `wipe.js` had `loadPair` — the answer-pair fetch, the two synced canvases,
   the conspicuity gate and the question-card fallback — fully built, tested,
   exported, and called by NOTHING. So the shipped wipe was the source-vs-output
   `<img>` pair that `server/preview.py`'s own header says cannot discriminate,
   which is the exact mistake PLAN.md 3.3 records the prototype making.

   ⚠️ It was ALSO mis-diagnosed in devoid-deferred-list.md, which blamed a
   missing thumbnail route. That route matters for showing a rendered output
   from outside web/; it has nothing to do with this. The answer-pair route
   existed and worked the whole time.

   One pair at a time: the first colour group still unanswered. Answer it and
   the next one loads, because the key changes. */
function maybeLoadSeamPair(a) {
  /* ⚠️ F4. showCard() is called ONLY from inside loadPair, and this function
     returns early whenever there is no unanswered colour group — so a card
     raised on asset A stayed up over asset B, with B's artwork hidden behind
     it, showing A's question. Measured: card on megaphone, openAsset(rocket),
     `{ open: "rocket", wipeHidden: true, qcardHidden: false }`. The card is the
     designed fallback for the small-region case the corpus actually contains,
     so this is the normal path, not an edge. Clear it on the way in,
     unconditionally, before any early return can skip it. */
  const qcard = $('#qcard');
  if (qcard && !qcard.hidden) {
    qcard.hidden = true;
    const w = $('#wipe'); if (w) w.hidden = false;
  }

  const D = window.Devoid || {};
  const load = D.wipe && D.wipe.loadPair;
  if (typeof load !== 'function') return;      // wipe.js is deferred; it will not always be here

  const ans = S.answers[a.id] || { byColour: {} };
  const open = colourGroups(a).find(g => !ans.byColour[g.hex]) || null;
  const key = open ? `${a.id}|protection|${open.hex}` : null;
  if (key === seamKey) return;                 // already showing exactly this pair
  seamKey = key;
  if (!key) return;                            // nothing disputed — the img pair stands

  /* `protection` is the pseudo-flag whose two sides are --assume-protect and
     --assume-remove on the SAME colour (server/preview.py:_answer_argv). */
  load(a.id, 'protection', open.hex, open.hex).catch(err => {
    seamKey = null;                            // let it be retried
    setBanner('failed',
      `Could not build the comparison for ${open.hex} — ${err && err.message ? err.message : err}`,
      null);
  });
}

/* what a settled cut says, and the one place the conflict policy lives */
function settle(a) {
  const j = S.jobs[a.id] || {};
  const st = stateOf(a);
  if (st === 'failed') {
    setBanner('failed', `${base(a.path)} — ${j.error || 'it stopped without saying why'}`,
      { label: 'Try again', run: () => { setBanner(null); startCut(a); } });
  } else if (st === 'conflict') {
    /* ── THE CONFLICT POLICY, decided here (PLAN.md 2.6b) ────────────────
       ESCALATE THEN REPORT. A file was already there; the server wrote the
       next free `_v2`/`_v3` name and this says which one, in full. It does
       NOT ask first.
       Why: the promise is "never overwrite", and escalation already keeps it
       without a dialog. A confirmation before every write would fire on a
       re-cut — the commonest thing anyone does here — turning the safe path
       into a prompt you learn to dismiss, which is how a guard stops
       guarding. Nothing is lost either way, so the cheaper of two safe
       products wins, and the person is told exactly where the file went. */
    setBanner('conflict',
      `Something was already called ${stem(a.path)}_transparent — this one went to ${j.output_path || 'the next free name beside it'}`, null);
  } else if (st === 'cancelled') {
    setBanner('cancelled', `${base(a.path)} — stopped, and nothing was written`,
      { label: 'Try again', run: () => { setBanner(null); startCut(a); } });
  } else if (st === 'not-checked') {
    setBanner('not-checked',
      `${base(a.path)} is cut, but nothing checked it — ${j.output_path ? base(j.output_path) : 'the file'} is unverified`, null);
  } else {
    setBanner(null);
  }
  render();
}

async function stopCut(a) {
  const j = S.jobs[a.id];
  if (!j || !j.job_id) return;
  await api(`/api/jobs/${encodeURIComponent(j.job_id)}`, { method: 'DELETE' });
  S.jobs[a.id] = { ...j, state: 'cancelled' };
  settle(a);
}

/* ── regions, handed over by web/canvas.js (Stage 4) ──────────────────────
   ⚠️ ONE MECHANISM, AND IT IS THE EVENT. canvas.js dispatches
   `devoid:regions-changed` ON `window` with `{detail: {regions: [...]}}`.
   ⚠️ This file listened on `document` and this comment said `document` too, so
   the two agreed with each other and disagreed with the dispatcher. An event
   dispatched on `window` never reaches `document` — window is the top of the
   propagation path, not a child of it — so the handler had never once run and
   `render()` never fired on a region change.
   This file mirrors the latest array onto `window.Devoid.regions` so anything
   can READ it synchronously, but the event is what carries a change — a
   mirror nobody writes to cannot go stale, and a property nobody watches
   cannot notify. Each entry is the contract's render shape:
   `{type: "protect|remove|remove-track|unprotect|translucent|fade-protect",
     bbox_xyxy | points, tracked: bool}`. */
function currentRegions() {
  return Array.isArray(window.Devoid.regions) ? window.Devoid.regions : [];
}
window.addEventListener('devoid:regions-changed', e => {
  const r = e.detail && e.detail.regions;
  window.Devoid.regions = Array.isArray(r) ? r : [];
  render();
});

/* ── navigation is selection, and nothing else ────────────────────────────── */
function openAsset(id) {
  S.open = id;
  S.frame = 0;
  setSeam(50);
  /* ⚠️ canvas.js LISTENS for this and nothing was dispatching it, so regions
     drawn on one asset stayed armed over the next one and were sent as
     --protect-region / --remove-region against unrelated artwork. Regions are
     coordinates in ONE asset's source pixels; carrying them across is not a
     stale view, it is a wrong render. Dispatched before render() so the canvas
     is already clear by the time anything draws. */
  window.dispatchEvent(new CustomEvent('devoid:asset-opened', { detail: { asset: id } }));
  render();
}
function closeAsset()  { S.open = null; seamKey = null; render(); }

function render() {
  const a = S.assets.find(x => x.id === S.open);
  const empty = S.assets.length === 0;
  /* the structural transition fires on a CHANGE of shape, not on every
     render -- a state patch arriving mid-analysis must not replay it. */
  const shape = empty ? 'empty' : (a ? 'open' : 'sheet');
  if (shape !== S.shape) {
    S.shape = shape;
    for (const el of [$('#edge'), $('#open'), $('#sheet')]) {
      el.removeAttribute('data-anim'); void el.offsetWidth; el.setAttribute('data-anim', '1');
    }
  }
  $('#empty').hidden = !empty;
  $('#sheet').hidden = !!a || empty;
  $('#open').hidden  = !a || empty;
  $('#edge').hidden  = !a;

  const crumb = $('#crumb');
  crumb.replaceChildren();
  if (a) {
    const back = el('button', 'crumb', '← everything');
    back.addEventListener('click', closeAsset);
    crumb.append(back, el('span', null, '  /  '), el('b', null, base(a.path)));
  } else if (!empty) {
    const q = S.assets.filter(x => outstanding(x).length).length;
    const s = S.sel.size;
    const bits = [`${S.assets.length} on the table`];
    if (s) bits.push(`${s} selected`);
    if (q) bits.push(`${q} need you`);
    crumb.append(el('span', null, bits.join(' · ')));
  }

  $('#selectall').hidden = empty || !!a;
  $('#selectall').textContent = S.sel.size === S.assets.length && S.assets.length ? 'Select none' : 'Select all';

  const busy = targets().filter(x => stateOf(x) === 'running');
  const P = $('#primary');
  P.hidden = empty;
  P.textContent = busy.length ? (busy.length === 1 ? 'Stop' : `Stop ${busy.length}`)
    : a ? 'Cut it out'
    : `Cut ${targets().length}`;
  P.classList.toggle('stop', busy.length > 0);

  if (a) {
    if (!wipeOwned) {
      /* ⚠️ This used to put the SAME file on both sides and label the right
         half "cut" -- an uncut source presented as a cut result, in the app's
         central widget, which is exactly the unearned claim PRODUCT.md
         forbids. A seam compares two things; until a second thing exists
         there is nothing to compare, so the wipe collapses to one honest
         image and says so. */
      const j = S.jobs[a.id];
      /* ⚠️ The server serves ONLY web/, and the engine writes beside the
         source. So an output is showable exactly when its source was already
         inside web/assets/ -- true for the corpus, false for a real drop from
         anywhere else on disk. Showing an unreachable URL would put a broken
         image under a "cut" label, which is a worse claim than the one this
         branch exists to prevent. There is no thumbnail route to fix this
         properly (API-CONTRACT has none); until there is, say so. */
      const servable = j && j.output_path
        && j.output_path.includes('/web/assets/') && stateOf(a) !== 'running';
      const cutUrl = servable ? artUrl({ path: j.output_path }) : null;
      const cutElsewhere = j && j.output_path && !servable && stateOf(a) !== 'running';
      /* ⚠️ The sheet tile has had an error handler since it was written
         (`img.addEventListener('error', ...)` above); the stage's #before never
         did. An unreachable source therefore rendered as a blank stage, which
         is indistinguishable from `loading` — the app's own honesty rule says
         a state it cannot show must SAY so. Mirror the tile's behaviour. */
      const beforeImg = $('#before');
      if (beforeImg._devoidOnError) beforeImg.removeEventListener('error', beforeImg._devoidOnError);
      beforeImg._devoidOnError = () => {
        beforeImg.hidden = true;
        wipe.classList.add('noart');
        $('.wipetag.l').textContent = 'the file could not be read';
      };
      beforeImg.addEventListener('error', beforeImg._devoidOnError);
      beforeImg.hidden = false;
      wipe.classList.remove('noart');
      $('#before').src = artUrl(a); $('#before').alt = `${base(a.path)} as it came in`;
      wipe.toggleAttribute('data-single', !cutUrl);
      if (cutUrl) {
        $('#after').src = cutUrl;
        $('#after').alt = `${base(j.output_path)} — the background cut out`;
        $('.wipetag.l').textContent = 'as it came';
      } else {
        $('#after').removeAttribute('src');
        $('.wipetag.l').textContent = cutElsewhere
          ? `cut — saved as ${base(j.output_path)}`
          : 'not cut yet';
      }
    }
    $('#openname').textContent = stem(a.path);
    $('#openstate').replaceChildren(
      el('span', null, `${a.ext || ''} · ${a.frames ? a.frames + ' frames · ' : ''}`),
      el('b', `s-${stateOf(a)}`, wordOf(a)));
    /* ⚠️ The plotter is summoned, not permanent. Ten enabled tools sat over
       every asset including ones still being read, with nothing selected to
       apply them to -- and they cost the artwork ~110px of height, on the one
       screen whose whole job is showing you the artwork. It appears once the
       engine has finished reading the asset and the questions are answered,
       which is when drawing on it is a coherent act. */
    const st = stateOf(a);
    const plotterWelcome = st !== 'loading' && st !== 'needs-you' && st !== 'blocked' && st !== 'refused';
    $('#regiontools').hidden = !plotterWelcome;
    $('#regioncanvas').hidden = !plotterWelcome;
    maybeLoadSeamPair(a);
    renderEdge(); renderQuestions(a); renderAdvice(a); renderLedger(a); renderFilm(a);
    renderQuestionRegions(a);
    /* ⚠️ `{once: true}` only removes the listener AFTER it fires, and with an
       unchanged src no load event ever fires — so one accumulated per render,
       roughly 85 across a one-minute poll loop, all of which then ran on the
       next real image load. Keep exactly one, and replace it each time. */
    const before = $('#before');
    if (before._devoidOnLoad) before.removeEventListener('load', before._devoidOnLoad);
    before._devoidOnLoad = () => renderQuestionRegions(a);
    before.addEventListener('load', before._devoidOnLoad);
  } else {
    renderSheet();
  }
  renderTabs();
  renderBanner();
  repaintField();
}

/* ── refresh: the table, and the flags behind every control ───────────────── */
async function refresh() {
  const [assets, flags] = await Promise.all([api('/api/assets'), api('/api/flags')]);
  if (assets.ok && Array.isArray(assets.body)) {
    /* keep anything the server does not own — the questions we already read */
    const prev = new Map(S.assets.map(a => [a.id, a]));
    S.assets = assets.body.map(a => Object.assign({}, prev.get(a.id) || {}, a,
      a.questions ? {} : { questions: (prev.get(a.id) || {}).questions || null }));
    /* the engine's recommended format PRE-SELECTS the goal wherever it
       arrives — the analyze response or a restored table — and never forces it */
    if (!S.goal.format) {
      const rec = (S.assets.find(a => a.questions && a.questions.recommended_format) || {})
        .questions;
      if (rec) S.goal.format = { 'gif-ok': 'gif', 'webp-or-apng': 'webp', 'webp-or-avif': 'webp' }[rec.recommended_format] || null;
    }
    for (const id of [...S.sel]) if (!S.assets.some(a => a.id === id)) S.sel.delete(id);
    if (S.open && !S.assets.some(a => a.id === S.open)) S.open = null;
  } else if (!assets.ok) {
    setBanner('failed', `The table could not be read — ${errText(assets)}`,
      { label: 'Try again', run: () => { setBanner(null); refresh(); } });
  }
  if (flags.ok && flags.body && Array.isArray(flags.body.flags)) {
    S.flags = flags.body.flags;
    S.byDest = new Map(S.flags.map(f => [f.dest, f]));
    const missing = [...new Set(Object.values(DRAWERS).flat()
      .map(r => r[1]).filter(r => r && r.startsWith('flag:')).map(r => r.slice(5)))]
      .filter(d => !S.byDest.has(d));
    if (missing.length) console.warn('[devoid] a drawer names flags the parser does not report:', missing);
  }
  render();
}

/* ── the field ─────────────────────────────────────────────────────────────
   Drawn once to fit, never tiled. A tiled sky repeats its constellations on a
   fixed pitch and the eye finds them immediately -- it is the one thing a real
   field never does.

   The distribution matters as much as the randomness: a uniform scatter of
   identical dots reads as noise, not as sky. Real fields are dominated by
   faint stars with a few bright ones, so radius and alpha come off a steep
   power curve, and colour runs cold-white to faintly blue with the occasional
   warm one. Density is per unit AREA, so a tall window is not sparser than a
   wide one. */
function paintField() {
  const cv = $('#starfield');
  if (!cv) return;
  const host = cv.parentElement;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const emitting = document.documentElement.classList.contains('emitting');
  const n = Math.round((w * h) / 3300);
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h;
    /* steep curve: mostly faint, a few that carry the field */
    const m = Math.pow(Math.random(), 2.4);
    const r = 0.42 + m * 1.18;
    const alpha = (emitting ? 0.34 : 0.92) * (0.30 + m * 0.7);
    const warm = Math.random();
    const col = emitting
      ? (warm > 0.86 ? '58,54,84' : '18,17,26')
      : (warm > 0.93 ? '255,228,196' : warm > 0.62 ? '207,220,255' : '255,255,255');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 6.2832);
    ctx.fillStyle = `rgba(${col},${alpha.toFixed(3)})`;
    ctx.fill();
  }
}
let fieldTimer = null;
const repaintField = () => { clearTimeout(fieldTimer); fieldTimer = setTimeout(paintField, 120); };
window.addEventListener('resize', repaintField);

/* ── the chrome ───────────────────────────────────────────────────────────── */
$('#add').addEventListener('click', async () => addPaths(await FileSource.pick()));
$('#selectall').addEventListener('click', () => {
  S.sel = S.sel.size === S.assets.length ? new Set() : new Set(S.assets.map(a => a.id));
  S.anchor = S.assets.length ? S.assets[0].id : null;
  render();
});
$('#lamp').addEventListener('click', () => {
  const emitting = document.documentElement.classList.toggle('emitting');
  paintField();   // the field's own colour temperature inverts with the room
  /* naming the STATE while also carrying aria-pressed produced "Emitting
     light, not pressed", which contradicts itself. The label names the
     ACTION and moves with it; there is no pressed state left to disagree. */
  $('#lamp').setAttribute('aria-label',
    emitting ? 'Switch to collapsed dark' : 'Switch to emitting light');
  try { localStorage.setItem('devoid-lamp', emitting ? 'light' : 'dark'); } catch (e) {}
});
try {
  if (localStorage.getItem('devoid-lamp') === 'light') $('#lamp').setAttribute('aria-label', 'Switch to collapsed dark');
} catch (e) {}
$('#matte').addEventListener('click', e => {
  const btn = e.target.closest('button[data-matte]');
  if (!btn) return;
  const val = btn.dataset.matte;
  if (val === 'checker') delete document.documentElement.dataset.matte;
  else document.documentElement.dataset.matte = val;
  for (const b of $('#matte').querySelectorAll('button')) {
    const on = b === btn;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;      // one tab stop for the group, per the radio pattern
  }
  try { localStorage.setItem('devoid-matte', val); } catch (e) {}
});
(function initMatte() {
  let saved = 'checker';
  try { saved = localStorage.getItem('devoid-matte') || 'checker'; } catch (e) {}
  for (const b of $('#matte').querySelectorAll('button')) {
    const on = b.dataset.matte === saved;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  }
})();
$('#primary').addEventListener('click', () => {
  const busy = targets().filter(x => stateOf(x) === 'running');
  if (busy.length) { busy.forEach(stopCut); return; }
  cut();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.open) closeAsset();
  if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !S.open &&
      !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) {
    e.preventDefault(); $('#selectall').click();
  }
});

/* ── drag and drop onto the table ─────────────────────────────────────────── */
for (const zone of [$('#sheet'), $('#empty')]) {
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('over');
    addPaths(FileSource.fromDrop(e.dataTransfer));
  });
}
/* a drop anywhere else must not navigate the window away from the app */
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());

/* Stage 6's File > Open… (Cmd+O) delivers real paths as a window CustomEvent
   rather than through the pick-files IPC round trip FileSource.pick() uses —
   two producers, one seam. Both end at addPaths(). */
window.addEventListener('devoid:open-files', e => {
  addPaths((e.detail && e.detail.paths) || []);
});

/* ── what the other two frontend modules read ─────────────────────────────── */
window.Devoid = {
  openAsset,
  /* wipe.js calls this when the answer pair finishes decoding -- app.js owns
     the region overlay and cannot otherwise know the canvases have dimensions. */
  requeryRegions: () => requeryRegions(),
  getAsset: id => S.assets.find(a => a.id === id) || null,
  stateOf: id => { const a = S.assets.find(x => x.id === id); return a ? stateOf(a) : null; },
  refresh,
  render,
  regions: [],
  /* ⚠️ THIS USED TO CALL `wipeCtl.abort()`, AND THAT KILLED THE PRODUCT'S ONE
     GESTURE. The only pointerdown, pointermove and keydown listeners on #wipe
     are registered above with `{signal: wipeCtl.signal}`, and wipe.js attaches
     no replacement — so from the moment the answer pair mounted the seam could
     not be dragged with a mouse or moved with an arrow key, while the element
     went on advertising `cursor:ew-resize`, a rendered handle, `role="slider"`
     and "Drag to compare…". `wipeCtl` is one-shot, so it was permanent.

     Both files reasoned at length about why the handover was safe and neither
     noticed that nobody picked the element up. wipe.js's own comment has the
     answer: these handlers only ever write the shared `--seam` variable, which
     the <img> pair and the canvases both read. Ownership of the CONTENT moves.
     Ownership of the GESTURE never needed to. */
  releaseWipe() { wipeOwned = true; },

  /* ⚠️ wipe.js's question card has been calling `Devoid.submitAnswer` since it
     was written, and it did not exist — so the card always fell through to its
     raw-fetch backstop, which posts the verdict and never tells THIS file. The
     server recorded the answer, `S.answers` did not, the asset stayed
     `needs-you`, and cut() refused it with no explanation.

     Routing through the colour group rather than the bare region id is not
     tidiness: an answer applies to every region sharing that outline colour
     (API-CONTRACT "Per-colour vs per-region"), and answering one region alone
     is what the server's `conflicting_colour` rejection exists to catch. */
  async submitAnswer(assetId, regionId, verdict) {
    const a = S.assets.find(x => x.id === assetId);
    if (!a) throw new Error('that asset is not on the table any more');
    const group = colourGroups(a).find(g =>
      g.regions.some(r => String(r.region_id) === String(regionId)));
    if (!group) throw new Error(`region ${regionId} is not one this asset asked about`);
    const ans = S.answers[a.id] || (S.answers[a.id] = { byColour: {}, fade: null });
    ans.byColour[group.hex] = verdict;
    S.blocked.delete(a.id);
    S.qerror = null;
    await submitAnswers(a);
    if (S.qerror) throw new Error(S.qerror);
    return { state: a.state };
  },
};

refresh();
