/* Devoid — prototype behaviour.
   Real state, real interactions. This is the front end's starting code, not a
   drawing of it: the lamp switches, questions are answerable, the board and the
   bench are one navigation, the filmstrip scrubs, the matte changes.

   Every asset here is a REAL output from the skill's own corpus, not an icon
   drawn to flatter the layout. That is deliberate — putting real art in was what
   found the rubylith-over-red bug the hatch now fixes. */

const ASSETS = [
  { id:'megaphone',  frames:144, question:'Is the hatched area part of the picture?',
    evidence:'sealed by #002864 on 102 of 144 frames', flagged:[14,38,61,95,120],
    region:{x:34,y:24,w:30,h:44} },
  { id:'hurricane',  frames:120, question:'Is the hatched area part of the picture?',
    evidence:'sealed by #f06030 on 44 of 120 frames', flagged:[9,27,52,88],
    region:{x:37,y:33,w:26,h:30} },
  { id:'galaxy',     frames:129, state:'done',  size:'1.9 MB' },
  { id:'rocket',     frames:177, state:'done',  size:'2.4 MB' },
  { id:'growth',     frames:85,  state:'ready' },
  { id:'satellite',  frames:120, state:'run',   progress:'88/144' },
  { id:'paper-plane',frames:98,  state:'amber' },
  { id:'secure',     frames:50,  state:'done',  size:'640 KB' },
];

const CHIP = {
  done:  ['c-ok',    a => a.size || 'done'],
  ready: ['c-cyan',  () => 'ready'],
  run:   ['c-run',   a => a.progress],
  amber: ['c-amber', () => 'not checked'],
};

const $  = s => document.querySelector(s);
const el = (t, cls, text) => { const n = document.createElement(t);
  if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const src = id => `assets/${id}.png`;

const state = { lane:'board', current:'megaphone', frame:62, answered:{} };

/* ── the lamp ─────────────────────────────────────────────────────────────
   A lighting change, so it gets a real transition — unlike the scrubber, which
   must feel instant. */
$('#lamp').addEventListener('click', () => {
  const light = document.documentElement.classList.toggle('lamp-light');
  try { localStorage.setItem('devoid-lamp', light ? 'light' : 'dark'); } catch (e) {}
});

/* ── the questions ─────────────────────────────────────────────────────────
   Answered in place, in any order. A modal would serialise what should be
   parallel, and a batch routinely raises more than one. */
function renderNeeds() {
  const pending = ASSETS.filter(a => a.question && !state.answered[a.id]);
  $('#needs').replaceChildren(...pending.map(a => {
    const band = el('div', 'ask reg hot');
    const art  = el('div', 'art chk-s');
    const img  = el('img'); img.src = src(a.id); img.alt = `${a.id}, frame with the region in question`;
    const wash = el('div', 'wash');
    const r = a.region;
    wash.style.cssText = `--rx:${r.x}%;--ry:${r.y}%;--rw:${r.w}%;--rh:${r.h}%`;
    art.append(img, wash);
    const q = el('div', 'q');
    q.append(
      el('h2', 'qt', a.question),
      el('p', 'qs', `${a.id}.gif  ·  ${a.evidence}`),
    );
    const row = el('div', 'answers');
    for (const [cls, label, verdict] of [['keep','Keep it','kept'], ['cut','Cut it out','cut']]) {
      const b = el('button', cls, label);
      b.addEventListener('click', () => { state.answered[a.id] = verdict; render(); });
      row.append(b);
    }
    q.append(row);
    band.append(art, q);
    return band;
  }));
  const n = pending.length;
  $('#need-count').textContent = n ? `${n} need you` : 'nothing needs you';
  $('#s-need').textContent = `${n} need you`;
  $('#needs').classList.toggle('hidden', n === 0);
}

/* ── the contact strip ────────────────────────────────────────────────────
   Settled work compresses, because it needs no attention. Clicking a cell is
   how you reach the Bench — the lanes are one navigation, not two peer tabs. */
function renderCells() {
  const settled = ASSETS.filter(a => !a.question || state.answered[a.id]);
  $('#cells').replaceChildren(...settled.map(a => {
    const st = state.answered[a.id] ? 'ready' : (a.state || 'ready');
    const [cls, label] = CHIP[st];
    const cell = el('button', 'cell');
    cell.setAttribute('aria-label', `${a.id} — ${label(a)} — open on the Bench`);
    const im = el('div', 'im chk-s');
    const img = el('img'); img.src = src(a.id); img.alt = '';
    im.append(img);
    const lb = el('div', 'lb');
    lb.append(el('span', 'nm', a.id), el('span', `chip ${cls}`, label(a)));
    cell.append(im, lb);
    cell.addEventListener('click', () => { state.current = a.id; setLane('bench'); });
    return cell;
  }));
  $('#settled-rule').textContent = `${settled.length} settled`;
  $('#s-done').textContent = `${settled.filter(a => (a.state || '') === 'done').length} done`;
}

/* ── the bench ────────────────────────────────────────────────────────────── */
function renderRail() {
  $('#rail').replaceChildren(...ASSETS.map(a => {
    const b = el('button');
    b.setAttribute('aria-current', String(a.id === state.current));
    b.setAttribute('aria-label', a.id);
    const im = el('div', 'im chk-s');
    const img = el('img'); img.src = src(a.id); img.alt = '';
    im.append(img); b.append(im);
    b.addEventListener('click', () => { state.current = a.id; render(); });
    return b;
  }));
}

function renderFilm() {
  const a = ASSETS.find(x => x.id === state.current);
  const flagged = new Set(a.flagged || []);
  const N = 34, step = Math.max(1, Math.round(a.frames / N));
  const cur = Math.round(state.frame / step);
  $('#frames').replaceChildren(...Array.from({ length: N }, (_, i) => {
    const f = i * step;
    const b = el('button');
    b.setAttribute('aria-label', `frame ${f}`);
    if (i === cur) b.setAttribute('aria-current', 'true');
    if (Math.abs(i - cur) === 1) b.classList.add('ghost');   // onion skin
    if ([...flagged].some(x => Math.abs(x - f) < step)) b.classList.add('flag');
    b.addEventListener('click', () => { state.frame = f; renderFilm(); });
    return b;
  }));
  $('#film-count').textContent =
    `${state.frame} / ${a.frames} · ${(a.flagged || []).length} flagged`;
  $('#plate-img').src = src(a.id);
  $('#plate-img').alt = `${a.id}, frame ${state.frame}`;
}

/* the matte toggle is a verification requirement, not a preference — the docs
   record that checkerboard camouflages dithering noise and soft bleed, and that
   a solid ground must also be checked. Each catches what the other hides. */
document.querySelectorAll('.mattes button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.mattes button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    const plate = $('#plate'), m = b.dataset.matte;
    plate.classList.toggle('chk', m === 'chk');
    plate.style.background = m === 'chk' ? '' : m;
  });
});

/* ── the inspector ────────────────────────────────────────────────────────
   Every control reads `auto · value` until taken over. Forced by the engine:
   --auto applies its recommendation ONLY where an option was left at its
   default, so a UI that sends all 63 flags makes --auto a no-op. */
const PANELS = {
  board: [
    ['Selection', '6 files', [['Output', 'val', 'avif'], ['Size cap', 'auto', 'auto · none']]],
    ['Edges', 'shared', [['Erosion', 'auto', 'auto · 1'], ['Feather band', 'auto', 'auto · 3.3']]],
    ['Regions', 'on the Bench', []],
    ['Detection', 'auto', []],
    ['Overrides', 'none', []],
  ],
  bench: [
    ['Regions', 'drawn', [['Protect', 'val', 'rect ×1'], ['Remove', 'auto', 'auto · none'], ['Follow it', 'val', 'on']]],
    ['Edges', 'erosion 1', [['Erosion', 'val', '1'], ['Softening', 'auto', 'auto · 0'], ['Dither', 'auto', 'auto · bayer']]],
    ['Size & quality', '250 KB · 192 px', [['Target', 'val', '250 KB'], ['Min width', 'val', '192 px']]],
    ['Detection', 'auto', []],
    ['Overrides', 'none', []],
  ],
};

function renderInsp() {
  $('#insp').replaceChildren(...PANELS[state.lane].map(([name, meta, ctls], i) => {
    const d = el('details', 'grp');
    if (i === 0 && ctls.length) d.open = true;
    const sum = el('summary', 'h');
    sum.append(el('span', null, name), el('em', null, meta));
    d.append(sum);
    if (ctls.length) {
      const box = el('div', 'in');
      for (const [lab, kind, val] of ctls) {
        const row = el('div', 'ctl');
        row.append(el('span', 'lab', lab), el('span', kind, val));
        box.append(row);
      }
      d.append(box);
    }
    return d;
  }));
}

function setLane(lane) { state.lane = lane; render(); }
$('#lane-board').addEventListener('click', () => setLane('board'));
$('#lane-bench').addEventListener('click', () => setLane('bench'));

function render() {
  const bench = state.lane === 'bench';
  $('#lane-board').setAttribute('aria-pressed', String(!bench));
  $('#lane-bench').setAttribute('aria-pressed', String(bench));
  $('#board').classList.toggle('hidden', bench);
  $('#runbar').classList.toggle('hidden', bench);
  for (const id of ['#rail', '#canvas']) $(id).classList.toggle('hidden', !bench);
  for (const id of ['#preview-label', '#preview-modes']) $(id).hidden = !bench;
  $('#export').textContent = bench ? 'Render' : `Export ${ASSETS.filter(a => !a.question || state.answered[a.id]).length}`;
  if (bench) { renderRail(); renderFilm(); } else { renderNeeds(); renderCells(); }
  renderInsp();
}

/* the two groups that are plain local toggles; the lane switch has its own handler */
for (const sel of ['#preview-modes', '.runbar .seg']) {
  const g = document.querySelector(sel);
  if (!g) continue;
  g.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    for (const o of g.children) o.setAttribute('aria-pressed', String(o === b));
  });
}

render();
