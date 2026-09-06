/* Screenshot the REAL Electron window.
 *
 * ⚠️ WHY THIS EXISTS. A browser pane is not the app. The one used to develop
 * this design reports `document.visibilityState === 'hidden'` permanently and
 * fires ZERO requestAnimationFrame callbacks, which silently breaks anything
 * built on a rAF loop — it made the region canvas measure 0x0 and look broken
 * when it was fine, and it reported mid-transition colours as contrast
 * failures. Every visual claim about this app has to be checked in a window
 * that actually composites.
 *
 *   npx electron scripts/capture-window.mjs [outdir]
 *
 * Writes one PNG per state AND ASSERTS what the real window can prove, exiting
 * non-zero on any failure. It is the only automated check that touches `web/`
 * at all: the 93 pytest are Python and the two frontend suites are pure maths
 * with no DOM, so before this every visual and behavioural claim about the
 * surface rested on someone looking at it.
 *
 * ⚠️ The assertions are deliberately the ones that CANNOT be flaky -- geometry
 * that must be non-zero, a console that must be clean, a drawer that must have
 * rendered rows. No pixel baselines: a screenshot diff on an animated starfield
 * fails for reasons that are not defects, and a gate that cries wolf gets
 * ignored, which is worse than no gate.
 */
import { app, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] && !process.argv[2].startsWith('-')
  ? process.argv[2] : join(ROOT, 'local', 'window-shots');
const PORT = 8749;                      // not 8732: never fight a dev server

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

const server = spawn(join(ROOT, '.venv', 'bin', 'python'),
  ['-m', 'uvicorn', 'server.app:app', '--port', String(PORT)],
  { cwd: ROOT, stdio: 'ignore' });

async function seed() {
  const paths = ['secure.src.gif', 'megaphone.src.gif', 'rocket.gif', 'galaxy.gif',
                 'hurricane.gif', 'satellite.gif'].map((n) => join(ROOT, 'web', 'assets', n));
  const res = await fetch(`http://127.0.0.1:${PORT}/api/assets`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paths }),
  });
  const assets = await res.json();
  // megaphone carries the corpus's only real ambiguous-protection question
  const mega = assets.find((a) => a.path.includes('megaphone'));
  await fetch(`http://127.0.0.1:${PORT}/api/assets/${mega.id}/analyze`, { method: 'POST' });
  return { assets, megaId: mega.id };
}

// ⚠️ DO NOT disableHardwareAcceleration() HERE. It was set for "deterministic
// pixels", and it made the compositor stop producing frames: capturePage() then
// returned the LAST COMMITTED frame, so state 02 onwards all wrote the SAME
// image. Measured 2026-09-05: 8 captures, 3 distinct images, while the DOM was
// changing correctly at every step. Deterministic and wrong is worse than
// variable and true -- and the states are asserted from the DOM anyway.

app.whenReady().then(async () => {
  for (let i = 0; i < 60 && !(await portOpen(PORT)); i++) await wait(250);
  const { megaId } = await seed();

  // ⚠️ NEVER STEAL FOCUS. This runs while someone is using their Mac, and a
  // window that pops to the front on every run makes the gate something people
  // avoid running. `show: false` keeps it off-screen entirely; the captures
  // stay correct because backgroundThrottling is off and every shot calls
  // invalidate() to force a fresh frame -- which is what actually fixed the
  // stale-frame bug, not being frontmost.
  const win = new BrowserWindow({
    width: 1280, height: 860, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false,
                      backgroundThrottling: false,   // see the note above capturePage
                      preload: join(ROOT, 'web', 'preload.js') },
  });
  // ⚠️ Attach BEFORE the load, or the errors thrown during module init -- the
  // temporal-dead-zone class that killed app.js once already -- are missed.
  const consoleErrors = [];
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    // 3 === error. Warnings are excluded on purpose: Electron emits its own
    // dev-mode CSP warning on every unpackaged run, and a gate that fails on a
    // message the app cannot emit or fix is a gate nobody will keep.
    if (level < 3) return;
    consoleErrors.push(`${source}:${line} ${message}`);
  });
  win.webContents.on('render-process-gone', (_e, d) => consoleErrors.push(`renderer gone: ${d.reason}`));

  await win.loadURL(`http://127.0.0.1:${PORT}`);
  // ⚠️ ELECTRON CACHES web/ HARD, and a cached bundle makes this whole script
  // certify code that is no longer on disk. Measured 2026-09-05: an app.js edit
  // was invisible across three consecutive runs of a fresh Electron process,
  // and the gate passed on the OLD file. Same shape as verifying against a
  // stale dev server. Always reload ignoring the cache before asserting.
  win.webContents.reloadIgnoringCache();
  await wait(1200);
  await wait(2500);                     // fonts, first paint, the starfield

  mkdirSync(OUT, { recursive: true });
  const failures = [];
  const shots = [];        // {name, digest} -- two states must never match

  /** Read the live DOM. ⚠️ Call this IN the state being asserted about.
   *  The first version of this gate took every diagnostic at the END, after
   *  the last state had emptied the table -- so it read the region canvas as
   *  0x0 and the history drawer as zero rows and called both defects. They
   *  were correct readings of the wrong moment, which is precisely the mistake
   *  DEVLOG.md records a browser pane making. A measurement needs its state. */
  const probe = async (expr) => JSON.parse(await win.webContents.executeJavaScript(
    `Promise.resolve((() => { ${expr} })()).then((v) => JSON.stringify(v))`));

  /** A REAL pointer drag across the wipe, in window coordinates.
   *
   * ⚠️ NOT `.click()` and NOT executeJavaScript. The whole point is that input
   * arrives the way a hand delivers it, through the listener chain. Nine green
   * captures were taken of a seam that could not be dragged, because every
   * assertion in this file tested PRESENCE -- geometry, ids, computed styles --
   * and presence is exactly what a disconnected control has. `sendInputEvent`
   * is the only thing here that can prove a listener is attached.
   */
  const drag = async (fromPct, toPct) => {
    const box = await probe(`
      const r = document.getElementById('wipe').getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };`);
    const at = (p) => ({ x: Math.round(box.x + box.w * p), y: Math.round(box.y + box.h / 2) });
    const a = at(fromPct), b = at(toPct);
    win.webContents.sendInputEvent({ type: 'mouseDown', x: a.x, y: a.y, button: 'left', clickCount: 1 });
    for (let i = 1; i <= 6; i++) {
      const x = Math.round(a.x + (b.x - a.x) * (i / 6));
      win.webContents.sendInputEvent({ type: 'mouseMove', x, y: a.y, button: 'left', buttons: 1 });
      await wait(30);
    }
    win.webContents.sendInputEvent({ type: 'mouseUp', x: b.x, y: b.y, button: 'left', clickCount: 1 });
    await wait(250);
  };

  const shot = async (name, js, settle = 1400) => {
    if (js) { try { await win.webContents.executeJavaScript(js); } catch (e) { failures.push(`${name}: ${e.message}`); } }
    await wait(settle);                 // ⚠️ transitions are 300-420ms; never shoot mid-flight
    win.webContents.invalidate();       // force a fresh frame, never the last committed one
    await wait(250);
    const img = await win.webContents.capturePage();
    if (img.isEmpty()) { failures.push(`${name}: empty capture`); return; }
    const png = img.toPNG();
    writeFileSync(join(OUT, `${name}.png`), png);
    const digest = createHash('md5').update(png).digest('hex');
    // ⚠️ THE CHECK THAT WOULD HAVE CAUGHT THE STALE FRAME ON DAY ONE. Two
    // different states cannot produce byte-identical pixels; if they do, the
    // camera is lying and every visual claim built on these files is void.
    const twin = shots.find((s) => s.digest === digest);
    if (twin) failures.push(`${name} is byte-identical to ${twin.name} — the capture is STALE`);
    shots.push({ name, digest });
    console.log(`  wrote ${name}.png  ${digest.slice(0, 8)}`);
  };

  await shot('01-contact-sheet');
  await shot('02-open-question', `openAsset(${JSON.stringify(megaId)})`);
  await shot('03-emitting', `document.getElementById('lamp').click()`);
  await shot('04-empty-emitting', 'S.assets=[];S.sel=new Set();render()');
  await shot('05-empty-void', `document.getElementById('lamp').click()`);
  // The history drawer -- PLAN.md 5.2's "load a line". It reads the REAL
  // jobs.jsonl, so on a machine that has never cut anything it renders its
  // honest empty state, which is a row count of zero and still a pass.
  // ⚠️ BEFORE the arrival shot on purpose: that one fires six ~18s analyses,
  // and the first capture taken after it caught this drawer still reading
  // "Reading the log…" 2s in. Ordering is not cosmetic in this file.
  await shot('06-history', `S.drawer='what you did';S.history=null;render()`, 1800);

  // ⚠️ closeAsset() and S.drawer=null are load-bearing. Without them this shot
  // inherited the open asset from step 02 and the drawer from step 06, so the
  // file called 07-arrival showed an open asset under the history drawer --
  // the app's one orchestrated moment has never actually been photographed.
  // The byte-distinctness check below catches two IDENTICAL frames; it cannot
  // catch a correct capture of the wrong state.
  await shot('07-arrival', `closeAsset();S.drawer=null;S.arrivalUsed=false;S.arriving.clear();
    addPaths(${JSON.stringify(['galaxy.gif','rocket.gif','hurricane.gif','megaphone.gif','secure.gif','satellite.gif']
      .map((n) => join(ROOT, 'web', 'assets', n)))})`, 420);

  // ⚠️ prefers-reduced-motion. Five @media blocks in app.css were written for
  // it and NOTHING had ever exercised them -- neither a browser pane nor a
  // plain window can express the preference. The DevTools protocol can.
  try {
    win.webContents.debugger.attach('1.3');
    await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await shot('08-reduced-motion', `S.drawer=null;S.assets=[];S.sel=new Set();render()`);
  } catch (e) {
    failures.push(`reduced-motion: ${e.message}`);
  }

  const failed = (name, saw) => failures.push(`${name} (saw ${saw})`);
  const check = (name, ok, saw) => { if (!ok) failed(name, saw); };

  // ⚠️ rAF, not visibilityState. The property that actually matters is whether
  // the surface COMPOSITES -- a pane that reports hidden fires zero callbacks
  // and every rAF-driven thing in this app silently stops. Asserting the flag
  // instead would fail on a merely occluded real window, which composites fine.
  const raf = await probe(`
    return new Promise((resolve) => {
      let n = 0; const stop = performance.now() + 500;
      (function tick() { n++; if (performance.now() < stop) requestAnimationFrame(tick); else resolve({ frames: n }); })();
    });
  `);
  // ⚠️ ZERO is the failure, not "few". The discriminator this exists for is a
  // surface that fires NO callbacks at all -- the browser pane, permanently
  // `visibilityState: hidden`. A real window that is merely occluded is
  // throttled by Chromium to roughly 4fps: still compositing, still truthful
  // about geometry and colour, but NOT trustworthy for anything timed. Failing
  // on the throttle would make this gate fail on every unattended run, so it
  // fails on zero and says so loudly otherwise.
  check('the window composites (rAF fires at all)', raf.frames > 0, `${raf.frames} frames in 500ms`);
  if (raf.frames > 0 && raf.frames < 20) {
    console.warn(`  ⚠️  rAF is THROTTLED (${raf.frames} frames/500ms) — this window is not frontmost.`);
    console.warn('     Geometry and colour in these captures are real; anything TIMED is not.');
  }

  // The plotter, IN a state that MOUNTS it. Two things this has to get right,
  // and the first draft got both wrong: the table was emptied by state 04/08,
  // so it must be re-read from the server first; and the megaphone is the one
  // corpus asset in `needs-you`, where the toolbar is hidden BY DESIGN -- so
  // asserting on it would have reported the intended behaviour as a defect.
  await win.webContents.executeJavaScript('refresh()');
  await wait(600);
  const opened = await probe(`
    const hides = ['loading', 'needs-you', 'blocked', 'refused'];
    const a = S.assets.find((x) => !hides.includes(stateOf(x)));
    if (a) openAsset(a.id);
    return { id: a ? a.id : null, state: a ? stateOf(a) : null, total: S.assets.length };
  `);
  check('an asset in a plotter-bearing state exists', !!opened.id,
        `${opened.total} asset(s), none outside loading/needs-you/blocked/refused`);
  await wait(1200);
  const plot = await probe(`
    const c = document.getElementById('regioncanvas');
    const s = document.getElementById('starfield');
    return { w: c.width, h: c.height, hidden: c.hidden, sw: s.width, sh: s.height };
  `);
  if (opened.id) {
    check('the region canvas has real geometry', plot.w > 0 && plot.h > 0, `${plot.w}x${plot.h}`);
    check('the plotter is reachable', plot.hidden === false, `hidden=${plot.hidden}`);
  }
  check('the starfield was drawn to fit', plot.sw > 0 && plot.sh > 0, `${plot.sw}x${plot.sh}`);

  // The history drawer, IN its own state. Zero rows is a PASS: an empty log is
  // a real state and the drawer says so in words. Rendering NOTHING is not.
  await win.webContents.executeJavaScript(`S.drawer='what you did';S.history=null;render()`);
  await wait(1800);
  const hist = await probe(`
    const d = document.getElementById('drawer');
    return { rows: d.querySelectorAll('.hist').length,
             said: !!d.querySelector('.hist, .refusal'),
             loaders: d.querySelectorAll('.hist .undo').length };
  `);
  // ⚠️ "it rendered something" is a check that cannot fail, which is worse than
  // no check -- it passed for three runs while the drawer was printing "Nothing
  // refused" over a log holding a real row. Compare the DRAWER against the LOG.
  const logged = await probe(`
    return fetch('/api/history?limit=50').then((r) => r.json()).then((j) => ({ n: j.length }));
  `);
  check('the history drawer reported something', hist.said, `${hist.rows} rows`);
  check('the drawer shows every line the log holds', hist.rows === logged.n,
        `${hist.rows} rows for ${logged.n} logged`);
  check('every history row can be loaded back', hist.loaders === hist.rows,
        `${hist.loaders} buttons for ${hist.rows} rows`);

  // ⚠️ THE SEAM. This is the product's thesis and it was unreachable: loadPair
  // had no caller, and once it had one the two sides still rendered IDENTICALLY
  // because --assume-protect/--assume-remove were sent without --auto, which is
  // the flag they answer. Both failures were silent — the card fallback simply
  // showed instead, which looks like the design working. Assert the seam
  // MOUNTS and that the two answers actually DIFFER, or this regresses to
  // "looks fine" again.
  await win.webContents.executeJavaScript(`S.drawer=null;openAsset(${JSON.stringify(megaId)})`);
  let seam = { canvases: false, differing: 0 };
  for (let i = 0; i < 40; i++) {            // two engine renders; be patient, not fixed
    await wait(1500);
    seam = await probe(`
      const m = (window.Devoid.wipe && window.Devoid.wipe.metric && window.Devoid.wipe.metric()) || null;
      return { canvases: !!document.getElementById('wipe-a') && !!document.getElementById('wipe-b'),
               card: !document.getElementById('qcard').hidden,
               differing: m ? m.differing : 0,
               tagL: (document.querySelector('.wipetag.l') || {}).textContent };
    `);
    if (seam.canvases && seam.differing > 0) break;
  }
  check('the answer-pair seam mounted', seam.canvases, `canvases=${seam.canvases}`);
  check('the two answers actually differ', seam.differing > 0,
        `${seam.differing} differing alpha px — 0 means the flags did nothing`);
  check('the seam is labelled with the question, not the flag', seam.tagL === 'keep it', seam.tagL);

  // ⚠️ THE CHECK THIS FILE EXISTED WITHOUT. Everything above proves the seam is
  // THERE. This proves it WORKS. app.js registers the only pointerdown /
  // pointermove / keydown on #wipe with {signal: wipeCtl.signal}, and
  // releaseWipe() aborts that controller the moment the answer pair mounts --
  // so the app's signature gesture has been dead since the seam was wired,
  // while the element kept advertising cursor:ew-resize, a rendered handle and
  // role="slider".
  const seamBefore = await probe(`return { v: S.seam }`);
  await drag(0.5, 0.82);
  const seamAfter = await probe(`return { v: S.seam }`);
  check('the seam responds to a real drag', seamAfter.v !== seamBefore.v,
        `${seamBefore.v} -> ${seamAfter.v} after dragging 50% -> 82%`);
  await shot('09-seam', null, 600);

  const rm = await probe(`return { reduce: matchMedia('(prefers-reduced-motion: reduce)').matches }`);
  check('prefers-reduced-motion was actually emulated', rm.reduce === true, rm.reduce);

  check('the console is clean', consoleErrors.length === 0,
        consoleErrors.slice(0, 3).join(' | ') || 'none');

  console.log(`  rAF ${raf.frames}f/500ms · plotter ${plot.w}x${plot.h} on ${opened.state || 'nothing'}`
    + ` · history ${hist.rows} row(s) · reduced-motion ${rm.reduce}`);

  server.kill();
  if (failures.length) {
    console.error(`FAILED (${failures.length}):\n  ` + failures.join('\n  '));
    app.exit(1);
    return;                             // app.exit() is not a `return` -- without
  }                                     // this the PASS line printed anyway
  console.log('PASS — all states captured, every assertion held');
  app.exit(0);
});
