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
  goal: { format: null, target_kb: null, min_dim: null },   // ⚠️ target_kb starts EMPTY
  qerror: null,          // the server's validation message, shown where it happened
  frame: 0,
  drawer: null,
  seam: 50,
  banner: null,          // {state, text, action:{label, run}|null}
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

  const win = el('div', 'win chk-s');
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
  const r = await POST('/api/assets', { paths });
  if (!r.ok) {
    setBanner('failed', `Could not put ${paths.length === 1 ? 'that' : 'those'} on the table — ${errText(r)}`, null);
    return;
  }
  await refresh();
  /* analysis is ~18s each, so the frame exists long before the artwork does */
  for (const a of (r.body || [])) analyze(a.id);
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
    q.append(el('h3', null, n > 1
      ? `${n} places outlined in ${g.hex} — one answer covers all of them`
      : `The place outlined in ${g.hex}`));
    const swatch = el('span', 'swatch');
    swatch.style.setProperty('--hex', '#' + g.hex);
    const where = el('p', 'qwhere');
    where.append(swatch, el('span', null, g.regions.map(r =>
      `[${(r.bbox_xyxy || []).join(', ')}] · encloses on ${r.frames_enclosed} of ${r.frames_checked} frames`
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
    ? `${outstanding(a).length} still to answer` : 'both answers are in'));
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
function setSeam(pct) {
  S.seam = Math.max(0, Math.min(100, pct));
  wipe.style.setProperty('--seam', S.seam + '%');
  wipe.setAttribute('aria-valuenow', String(Math.round(S.seam)));
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
  L.append(el('span', null, `removes ${Number(px.bg).toLocaleString()} background px`));
  /* ⚠️ `art` is a CEILING — it counts every source pixel that differed from
     the corner colour and ended up transparent, including the antialiasing
     ramp the keyer is meant to remove. Comparable BETWEEN settings on one
     asset, never quotable as absolute damage. Hence "at most".
     ⚠️ There is deliberately NO threshold here. The prototype coloured this
     against an invented 500, and an invented number colouring the app's
     central honesty widget is the exact failure these docs exist to prevent.
     PLAN.md 3.5 gives it a real basis; until then it is stated, not judged. */
  L.append(el('span', 'atmost', `at most ${Number(px.art).toLocaleString()} artwork px lost`));
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
    b.addEventListener('click', () => { S.frame = f; renderFilm(a); });
    return b;
  }));
  $('#fcount').textContent = `${S.frame} of ${frames} frames · ${(a.flagged || []).length} flagged`;
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

  /* the drawers act on the SELECTION, and they say so */
  const n = targets().length;
  d.append(el('p', 'scope', n === 1
    ? `on ${base(targets()[0].path)}`
    : `on ${n} selected`));

  for (const spec of DRAWERS[S.drawer]) {
    const [label, ref] = spec;
    if (!ref) { d.append(...refusalRows()); continue; }
    const [kind, key] = ref.split(':');
    if (kind === 'report') { d.append(...refusalRows()); continue; }
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

async function cut() {
  const list = targets().filter(a => stateOf(a) !== 'running');
  if (!list.length) return;

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
   `devoid:regions-changed` on `document` with `{detail: {regions: [...]}}`.
   This file mirrors the latest array onto `window.Devoid.regions` so anything
   can READ it synchronously, but the event is what carries a change — a
   mirror nobody writes to cannot go stale, and a property nobody watches
   cannot notify. Each entry is the contract's render shape:
   `{type: "protect|remove|remove-track|unprotect|translucent|fade-protect",
     bbox_xyxy | points, tracked: bool}`. */
function currentRegions() {
  return Array.isArray(window.Devoid.regions) ? window.Devoid.regions : [];
}
document.addEventListener('devoid:regions-changed', e => {
  const r = e.detail && e.detail.regions;
  window.Devoid.regions = Array.isArray(r) ? r : [];
  render();
});

/* ── navigation is selection, and nothing else ────────────────────────────── */
function openAsset(id) { S.open = id; S.frame = 0; setSeam(50); render(); }
function closeAsset()  { S.open = null; render(); }

function render() {
  const a = S.assets.find(x => x.id === S.open);
  const empty = S.assets.length === 0;
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
      $('#before').src = artUrl(a); $('#before').alt = `${base(a.path)} as it came in`;
      const j = S.jobs[a.id];
      $('#after').src = artUrl(a);  $('#after').alt  = `${base(a.path)} with the background cut out`;
      if (j && j.output_path) $('#after').alt = `${base(j.output_path)}`;
    }
    $('#openname').textContent = stem(a.path);
    $('#openstate').replaceChildren(
      el('span', null, `${a.ext || ''} · ${a.frames ? a.frames + ' frames · ' : ''}`),
      el('b', `s-${stateOf(a)}`, wordOf(a)));
    renderEdge(); renderQuestions(a); renderLedger(a); renderFilm(a);
  } else {
    renderSheet();
  }
  renderTabs();
  renderBanner();
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

/* ── the chrome ───────────────────────────────────────────────────────────── */
$('#add').addEventListener('click', async () => addPaths(await FileSource.pick()));
$('#selectall').addEventListener('click', () => {
  S.sel = S.sel.size === S.assets.length ? new Set() : new Set(S.assets.map(a => a.id));
  S.anchor = S.assets.length ? S.assets[0].id : null;
  render();
});
$('#lamp').addEventListener('click', () => {
  const light = document.documentElement.classList.toggle('lamp-light');
  try { localStorage.setItem('devoid-lamp', light ? 'light' : 'dark'); } catch (e) {}
});
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

/* ── what the other two frontend modules read ─────────────────────────────── */
window.Devoid = {
  openAsset,
  getAsset: id => S.assets.find(a => a.id === id) || null,
  stateOf: id => { const a = S.assets.find(x => x.id === id); return a ? stateOf(a) : null; },
  refresh,
  render,
  regions: [],
  /* wipe.js calls this before attaching its own seam, so two owners of one
     element never both listen */
  releaseWipe() { wipeCtl.abort(); wipeOwned = true; },
};

refresh();
