/* What happens to the contact sheet at 8, 20, 60 and 200 assets — measured.
 *
 * ⚠️ WHY THIS EXISTS. Three deferred items all say the same thing in different
 * words, and all three say MEASURE FIRST:
 *
 *   · "The contact sheet has never been seen with a real batch" — PRODUCT.md
 *     claims one, twelve and two hundred are the same layout. Cards grew to
 *     228px against a corpus of eight and may be waste at twenty. That is a
 *     judgement that needs an image, so this writes one per size.
 *   · "200 assets decoding at once, and the loading state does not mean
 *     anything yet" — the sheet renders every asset as a looping <img> at full
 *     source resolution. The layout claim has been read as a performance
 *     claim; it was never about performance and the performance question has
 *     never been asked.
 *   · "The history drawer can sit on Reading the log… while analyses run" —
 *     observed at over two seconds against a route that answers in
 *     milliseconds when idle. NOT DIAGNOSED. This times the route while
 *     analyses are in flight instead of guessing between threadpool
 *     contention, the GIL and the client.
 *
 * It changes nothing. It prints numbers and writes captures.
 *
 *   npx electron scripts/measure_scale.mjs [8,20,60,200]
 *
 * ⚠️ The corpus holds 17 files, so larger sizes are made by COPYING them under
 * distinct names. That is honest for layout, first paint and decoder pressure —
 * the bytes and the dimensions are real — and dishonest for anything that
 * depends on the assets DIFFERING. Do not read a cache-hit rate off this.
 * ⚠️ It runs the server against its own scratch DEVOID_DATA_DIR for the same
 * reason `capture-window.mjs` does: `labels/protection.jsonl` is tracked
 * evidence and no measurement may write to it.
 */
import { app, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'local', 'scale-shots');
const CORPUS = join(ROOT, 'local', 'scale-corpus');
const SCRATCH = join(ROOT, 'local', 'scale-data');
const TRACKED_LABELS = join(ROOT, 'labels', 'protection.jsonl');
const PORT = 8751;                      // not 8732 (dev) and not 8749 (the gate)

/* ⚠️ ONE SIZE PER PROCESS. `registry.register()` mints a fresh uuid per call
   and there is no delete route, so a second size in the same process measures
   the first size plus the second. Run it once per number. */
const SIZES = [parseInt((process.argv[2] || '').replace(/[^0-9]/g, ''), 10) || 8];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const labelsBefore = (() => { try { return readFileSync(TRACKED_LABELS, 'utf8'); } catch { return null; } })();

function portOpen(port) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(400);
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('timeout', () => { s.destroy(); resolve(false); });
    s.once('error', () => resolve(false));
    s.connect(port, '127.0.0.1');
  });
}

/* One pool of real files, copied to distinct names. Built once for the largest
   size asked for, so a 200-run does not re-copy for the 8-run inside it. */
function buildCorpus(n) {
  mkdirSync(CORPUS, { recursive: true });
  const seeds = readdirSync(join(ROOT, 'web', 'assets'))
    .filter((f) => ['.gif', '.webp'].includes(extname(f)) && !f.includes('wordmark'));
  const have = new Set(readdirSync(CORPUS));
  const paths = [];
  for (let i = 0; i < n; i++) {
    const seed = seeds[i % seeds.length];
    const name = `s${String(i).padStart(3, '0')}-${seed}`;
    if (!have.has(name)) copyFileSync(join(ROOT, 'web', 'assets', seed), join(CORPUS, name));
    paths.push(join(CORPUS, name));
  }
  return paths;
}

rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(join(SCRATCH, 'labels'), { recursive: true });
mkdirSync(OUT, { recursive: true });

const server = spawn(join(ROOT, '.venv', 'bin', 'python'),
  ['-m', 'uvicorn', 'server.app:app', '--port', String(PORT)],
  { cwd: ROOT, stdio: 'ignore', env: { ...process.env, DEVOID_DATA_DIR: SCRATCH } });

const api = (path, init) => fetch(`http://127.0.0.1:${PORT}${path}`, init);

app.whenReady().then(async () => {
  for (let i = 0; i < 60 && !(await portOpen(PORT)); i++) await wait(250);

  const win = new BrowserWindow({
    width: 1280, height: 860, show: false,
    webPreferences: { preload: join(ROOT, 'web', 'preload.js'), contextIsolation: true },
  });
  const probe = async (expr) => JSON.parse(await win.webContents.executeJavaScript(
    `Promise.resolve((() => { ${expr} })()).then((v) => JSON.stringify(v))`));

  const rows = [];
  for (const n of SIZES) {
    const paths = buildCorpus(n);

    /* ⚠️ REGISTER FIRST, THEN LOAD (2026-09-07 01:46 EDT). The first version loaded
       the page and then POSTed, and measured a sheet one iteration behind: 0
       tiles at n=8 and 8 tiles at n=20, because the app fetches the asset list
       when the page loads and does not poll for assets that appear later. That
       is worth knowing on its own — a drop into an already-open window is a
       different path — but it is not what this measures. Registration is also
       cumulative in an in-memory registry with no delete route, which is why
       this script takes ONE size per process. */
    const t0 = Date.now();
    await api('/api/assets', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paths }),
    });
    await win.loadURL(`http://127.0.0.1:${PORT}/`);
    /* the sheet polls, so wait for the tile count to settle rather than for a
       fixed delay -- a fixed delay measures the delay */
    let tiles = 0, settled = 0, firstPaint = null;
    for (let i = 0; i < 120; i++) {
      await wait(250);
      const seen = await probe(`return { n: document.querySelectorAll('.frame').length }`);
      if (seen.n > 0 && firstPaint === null) firstPaint = Date.now() - t0;
      if (seen.n === tiles && tiles >= n) { settled++; if (settled >= 3) break; } else settled = 0;
      tiles = seen.n;
    }
    const settleMs = Date.now() - t0;

    const mem = await probe(`
      const m = performance.memory || {};
      const imgs = [...document.querySelectorAll('.frame img')];
      let px = 0;
      for (const im of imgs) px += (im.naturalWidth || 0) * (im.naturalHeight || 0);
      return {
        heapMB: m.usedJSHeapSize ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null,
        imgs: imgs.length,
        decodedMPx: +(px / 1e6).toFixed(1),
        tileW: imgs.length ? Math.round(imgs[0].getBoundingClientRect().width) : null,
        lazy: imgs.filter((i) => i.loading === 'lazy').length,
      }`);

    const metrics = app.getAppMetrics().reduce((acc, m) => acc + (m.memory?.workingSetSize || 0), 0);
    win.webContents.invalidate();
    await wait(200);
    const img = await win.webContents.capturePage();
    if (!img.isEmpty()) writeFileSync(join(OUT, `sheet-${String(n).padStart(3, '0')}.png`), img.toPNG());

    rows.push({ n, tiles, firstPaint, settleMs, ...mem, rssMB: +(metrics / 1024).toFixed(0) });

    /* reset for the next size */
    await probe(`S.assets = []; S.sel = new Set(); render(); return { ok: 1 }`);
  }

  /* ── the history route, timed against real analysis load ─────────────────
     The filing says the drawer sat on its loading text for over two seconds.
     This times the ROUTE, idle and then with analyses in flight, so the next
     session argues from a number instead of from a plausible cause. */
  const timeHistory = async (label, samples = 5) => {
    const ms = [];
    for (let i = 0; i < samples; i++) {
      const t = Date.now();
      await api('/api/history?limit=50').then((r) => r.json()).catch(() => null);
      ms.push(Date.now() - t);
    }
    ms.sort((a, b) => a - b);
    return { label, min: ms[0], median: ms[Math.floor(ms.length / 2)], max: ms[ms.length - 1] };
  };

  const idle = await timeHistory('idle');
  const assets = await api('/api/assets').then((r) => r.json()).catch(() => []);
  const six = assets.slice(0, 6);
  /* ⚠️ ASSERT THE LOAD WAS REAL. "6 analyses in flight" is worth nothing if the
     six returned instantly -- a latency measured against no load is a number
     with a caption, which is the failure mode this whole file exists to avoid.
     Each analyze is timed and its status kept, and the summary prints them. */
  const aT0 = Date.now();
  const inFlight = six.map((a) => {
    const t = Date.now();
    return api(`/api/assets/${a.id}/analyze`, { method: 'POST' })
      .then((r) => ({ status: r.status, ms: Date.now() - t }))
      .catch((e) => ({ status: 'threw', ms: Date.now() - t, err: String(e).slice(0, 60) }));
  });
  await wait(600);                       // let them actually be running
  const loaded = await timeHistory('6 analyses in flight');
  const analyses = (await Promise.allSettled(inFlight)).map((r) => r.value || r.reason);
  const wallMs = Date.now() - aT0;
  const after = await timeHistory('after they finish');

  console.log('\n  CONTACT SHEET AT SCALE — real window, real files, copies for distinct names');
  console.log('  n     tiles  firstPaint  settle   tileW  imgs  decodedMPx  jsHeapMB  rssMB  lazy');
  for (const r of rows) {
    console.log(`  ${String(r.n).padEnd(6)}${String(r.tiles).padEnd(7)}`
      + `${String(r.firstPaint ?? '-').padEnd(12)}${String(r.settleMs).padEnd(9)}`
      + `${String(r.tileW ?? '-').padEnd(7)}${String(r.imgs).padEnd(6)}`
      + `${String(r.decodedMPx).padEnd(12)}${String(r.heapMB ?? '-').padEnd(10)}`
      + `${String(r.rssMB).padEnd(7)}${r.lazy}`);
  }
  const slowest = Math.max(...analyses.map((a) => a.ms || 0));
  console.log(`\n  analyses actually run: ${analyses.length}, statuses ${[...new Set(analyses.map((a) => a.status))].join('/')}`
    + `, slowest ${slowest}ms, wall ${wallMs}ms`);
  console.log('  ⚠️ if the slowest is small, the "in flight" row below measured NO LOAD.');
  console.log('\n  /api/history LATENCY — the drawer sat on "Reading the log…" for >2s');
  for (const t of [idle, loaded, after]) {
    console.log(`  ${t.label.padEnd(24)} min ${String(t.min).padStart(5)}ms   median ${String(t.median).padStart(5)}ms   max ${String(t.max).padStart(5)}ms`);
  }

  const labelsAfter = (() => { try { return readFileSync(TRACKED_LABELS, 'utf8'); } catch { return null; } })();
  console.log(`\n  tracked label corpus: ${labelsAfter === labelsBefore ? 'UNCHANGED' : 'CHANGED — THIS MEASUREMENT WROTE TO TRACKED EVIDENCE'}`);
  console.log(`  captures in ${OUT}`);

  server.kill();
  app.exit(labelsAfter === labelsBefore ? 0 : 1);
});
