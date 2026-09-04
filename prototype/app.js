/* Devoid — prototype behaviour.

   There is no mode. The strip IS the app: nothing selected and it fills the space
   as a contact sheet; select one and it opens while the rest move to the edge.
   Selection is the only state, which is why density needs no policy — 1, 12 and
   200 assets are the same layout.

   Every asset here is a REAL output from the skill's corpus, and they ANIMATE,
   which is the point. A still frame cannot show dither crawl or rotation-phase
   flicker, and those are the defect classes this project actually records. An
   interface for animated images built out of still images cannot show its own
   subject's bugs. */

const ASSETS = [
  { id:'megaphone', ext:'gif', frames:144, flagged:[14,38,61,95,120],
    ask:{ color:'002864', enclosed:102, checked:144 },
    px:{ bg:41208, art:0, total:151402 } },
  { id:'hurricane', ext:'gif', frames:120, flagged:[9,27,52,88],
    ask:{ color:'f06030', enclosed:44, checked:120 },
    px:{ bg:38911, art:0, total:129440 } },
  { id:'galaxy',      ext:'gif',  frames:129, state:'done', size:'1.9 MB', px:{bg:52104,art:0,total:88300} },
  { id:'rocket',      ext:'gif',  frames:177, state:'done', size:'2.4 MB', px:{bg:61200,art:0,total:101210} },
  { id:'growth',      ext:'gif',  frames:85,  state:'ready', px:{bg:33012,art:0,total:81500} },
  { id:'satellite',   ext:'gif',  frames:120, state:'run', done:88, px:null },
  { id:'paper-plane', ext:'webp', frames:98,  state:'unchecked', px:null },
  { id:'secure',      ext:'gif',  frames:50,  state:'done', size:'640 KB', px:{bg:71000,art:1340,total:207500} },
];

const $ = s => document.querySelector(s);
const el = (t, cls, text) => { const n = document.createElement(t);
  if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const cut = a => `assets/${a.id}.${a.ext}`;
const raw = a => `assets/${a.id}.src.gif`;
const pending = a => a.ask && !S.answers[a.id];

const S = { open:null, frame:0, drawer:null, seam:50, answers:{}, labels:[] };

/* ── the label log ────────────────────────────────────────────────────────
   Every answer is a labelled data point for the question the engine refuses.
   The repo already holds 714 hand-written labels for edge_hardness and ZERO for
   this decision, while the project's stated goal is autonomy. Capturing costs a
   line; retrofitting throws away every answer given before it existed. */
function logLabel(a, verdict) {
  const row = { at:new Date().toISOString(), asset:a.id, verdict,
    outline_color:a.ask.color, frames_enclosed:a.ask.enclosed, frames_checked:a.ask.checked,
    enclosure_ratio:+(a.ask.enclosed / a.ask.checked).toFixed(4), frames_total:a.frames };
  S.labels.push(row);
  console.info('[devoid] label', row);   // the real app appends to labels.jsonl
}

/* ── grease-pencil marks, drawn ON the frame ──────────────────────────────
   Shape carries the state; colour only reinforces it. Measured reason: 31% of
   hurricane's artwork sits inside rubylith's colour neighbourhood, so hue alone
   is not a channel this content supports. Greyscale-legible by construction. */
const PENCIL = {
  done:      ['M22 58 l16 16 l34 -44',                'var(--ok)'],
  ready:     ['M26 50 h48',                            'var(--cyan)'],
  unchecked: ['M28 28 l44 44 M72 28 l-44 44',          'var(--amber)'],
  ask:       ['M50 15 a35 35 0 1 1 -.1 0',             'var(--ruby)'],
  run:       ['M50 15 a35 35 0 0 1 31 19',             'var(--cyan)'],
};
function pencil(kind) {
  const [d, stroke] = PENCIL[kind] || PENCIL.ready;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'pencil');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d); p.setAttribute('stroke', stroke); p.setAttribute('opacity', '.92');
  svg.append(p);
  return svg;
}
const kindOf = a => pending(a) ? 'ask' : (S.answers[a.id] ? 'ready' : (a.state || 'ready'));
const wordOf = a => pending(a) ? 'needs you'
  : S.answers[a.id] ? 'ready'
  : ({ done: a.size || 'done', ready: 'ready', unchecked: 'not checked',
      run: `${a.done} of ${a.frames} frames` })[a.state] || 'ready';

/* ── the contact sheet ────────────────────────────────────────────────────── */
function tile(a, big) {
  const b = el('button', big ? 'frame' : null);
  b.setAttribute('aria-label', `${a.id} — ${wordOf(a)}`);
  if (!big) b.setAttribute('aria-current', String(a.id === S.open));
  const win = el('div', 'win chk-s');
  const img = el('img'); img.src = cut(a); img.alt = '';   // animates by itself
  win.append(img, pencil(kindOf(a)));
  b.append(win);
  if (big) {
    const cap = el('div', 'cap');
    cap.append(el('span', 'nm', a.id), el('span', `st${pending(a) ? ' q' : ''}`, wordOf(a)));
    b.append(cap);
  }
  b.addEventListener('click', () => openAsset(a.id));
  return b;
}
const renderSheet = () => $('#sheet').replaceChildren(...ASSETS.map(a => tile(a, true)));
const renderEdge  = () => $('#edge').replaceChildren(...ASSETS.map(a => tile(a, false)));

/* ── the wipe ─────────────────────────────────────────────────────────────
   The seam is the cut line. Drag it across a playing loop and the background
   dissolves into transparency — the product's thesis as one gesture, and the way
   every visible flag becomes "which is right?" instead of a number to tune. */
const wipe = $('#wipe');
function setSeam(pct) {
  S.seam = Math.max(0, Math.min(100, pct));
  wipe.style.setProperty('--seam', S.seam + '%');
  wipe.setAttribute('aria-valuenow', Math.round(S.seam));
}
function seamFrom(e) {
  const r = wipe.getBoundingClientRect();
  setSeam(((e.clientX - r.left) / r.width) * 100);
}
wipe.tabIndex = 0;
wipe.setAttribute('role', 'slider');
wipe.setAttribute('aria-valuemin', '0');
wipe.setAttribute('aria-valuemax', '100');
wipe.setAttribute('aria-label', 'Drag to compare the source with the cut');
wipe.addEventListener('pointerdown', e => { wipe.setPointerCapture(e.pointerId); seamFrom(e); });
wipe.addEventListener('pointermove', e => { if (e.buttons) seamFrom(e); });
wipe.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  { setSeam(S.seam - 4); e.preventDefault(); }
  if (e.key === 'ArrowRight') { setSeam(S.seam + 4); e.preventDefault(); }
});

/* ── the ledger ───────────────────────────────────────────────────────────
   What this setting is about to destroy, from numbers the engine already
   computes and currently prints to stderr and discards. An app about
   destruction that never says what it destroyed is hiding its own subject.
   ⚠️ No numbers means NOT CHECKED, and a blank ledger says so — which is more
   alarming than a chip, and that is the correct relationship. */
function renderLedger(a) {
  const L = $('#ledger');
  L.replaceChildren();
  if (!a.px) {
    L.append(el('span', 'blank', 'not checked — nothing was measured on this one'));
    return;
  }
  L.append(el('span', null, `removes ${a.px.bg.toLocaleString()} background px`));
  L.append(el('span', a.px.art ? 'loss' : 'safe',
    a.px.art ? `loses ${a.px.art.toLocaleString()} artwork px`
             : 'keeps 100% of the artwork'));
  L.append(el('span', null, `${(a.px.total - a.px.art).toLocaleString()} px of artwork survive`));
}

/* ── frames ───────────────────────────────────────────────────────────────── */
function renderFilm(a) {
  const N = 34, step = Math.max(1, Math.round(a.frames / N));
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
  $('#fcount').textContent =
    `${S.frame} of ${a.frames} frames · ${(a.flagged || []).length} flagged`;
}

/* ── drawers ──────────────────────────────────────────────────────────────
   Summoned, and they open beside what they affect. Not a permanent column paid
   for on every screen for options used a few times a session.
   ⚠️ The names are the PERSON's words, not the argparse group names — building
   the taxonomy out of the flag groups is the system's structure leaking into
   the language. */
const DRAWERS = {
  'what to keep':  [['Kept region','val','rect ×1'], ['Cut region','auto','auto · none'], ['Follow it','val','on']],
  'the edge':      [['Trim','val','1 px'], ['Soften','auto','auto · 0'], ['Dither','auto','auto · bayer']],
  'how small':     [['Cap','val','250 KB'], ['Never below','val','192 px'], ['Kind of file','val','avif']],
  'what it found': [['Background','val','#ffffff'], ['Edges','auto','auto · antialiased'], ['Fade','auto','auto · none']],
  'it refused':    [['Nothing refused','auto','—']],
};
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
  for (const [lab, kind, val] of DRAWERS[S.drawer]) {
    const row = el('div', 'ctl');
    row.append(el('span', 'lab', lab), el('span', kind, val));
    d.append(row);
  }
}

/* ── navigation is selection, and nothing else ────────────────────────────── */
function openAsset(id) { S.open = id; S.frame = 0; setSeam(50); render(); }
function closeAsset()  { S.open = null; render(); }

function render() {
  const a = ASSETS.find(x => x.id === S.open);
  const empty = ASSETS.length === 0;
  $('#empty').hidden = !empty;
  $('#sheet').hidden = !!a || empty;
  $('#open').hidden  = !a || empty;
  $('#edge').hidden  = !a;

  const crumb = $('#crumb');
  crumb.replaceChildren();
  if (a) {
    const back = el('button', 'crumb', '← everything');
    back.addEventListener('click', closeAsset);
    crumb.append(back, el('span', null, '  /  '), el('b', null, `${a.id}.${a.ext}`));
  } else {
    const q = ASSETS.filter(pending).length;
    crumb.append(el('span', null,
      q ? `${ASSETS.length} on the table · ${q} need you` : `${ASSETS.length} on the table`));
  }

  $('#primary').textContent = a
    ? (pending(a) ? 'Cut it out' : 'Cut it')
    : `Save ${ASSETS.filter(x => !pending(x)).length}`;

  if (a) {
    $('#before').src = raw(a); $('#before').alt = `${a.id} as it came in`;
    $('#after').src  = cut(a); $('#after').alt  = `${a.id} with the background cut out`;
    $('#openname').textContent = a.id;
    $('#openstate').textContent = `${a.ext} · ${a.frames} frames · ${wordOf(a)}`;
    renderEdge(); renderLedger(a); renderFilm(a);
  } else {
    renderSheet();
  }
  renderTabs();
}

$('#lamp').addEventListener('click', () => {
  const light = document.documentElement.classList.toggle('lamp-light');
  try { localStorage.setItem('devoid-lamp', light ? 'light' : 'dark'); } catch (e) {}
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.open) closeAsset(); });

/* answering happens on the open asset: the wipe shows both, you pick one */
$('#primary').addEventListener('click', () => {
  const a = ASSETS.find(x => x.id === S.open);
  if (a && pending(a)) { S.answers[a.id] = 'cut'; logLabel(a, 'cut'); }
  render();
});

render();
