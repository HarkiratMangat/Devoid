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
 * Writes one PNG per state and exits non-zero if any state failed to render.
 */
import { app, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
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

app.disableHardwareAcceleration();      // deterministic pixels in CI and here

app.whenReady().then(async () => {
  for (let i = 0; i < 60 && !(await portOpen(PORT)); i++) await wait(250);
  const { megaId } = await seed();

  const win = new BrowserWindow({
    width: 1280, height: 860, show: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false,
                      preload: join(ROOT, 'web', 'preload.js') },
  });
  await win.loadURL(`http://127.0.0.1:${PORT}`);
  await wait(2500);                     // fonts, first paint, the starfield

  mkdirSync(OUT, { recursive: true });
  const failures = [];

  const shot = async (name, js, settle = 1400) => {
    if (js) { try { await win.webContents.executeJavaScript(js); } catch (e) { failures.push(`${name}: ${e.message}`); } }
    await wait(settle);                 // ⚠️ transitions are 300-420ms; never shoot mid-flight
    const img = await win.webContents.capturePage();
    if (img.isEmpty()) { failures.push(`${name}: empty capture`); return; }
    writeFileSync(join(OUT, `${name}.png`), img.toPNG());
    console.log(`  wrote ${name}.png`);
  };

  await shot('01-contact-sheet');
  await shot('02-open-question', `openAsset(${JSON.stringify(megaId)})`);
  await shot('03-emitting', `document.getElementById('lamp').click()`);
  await shot('04-empty-emitting', 'S.assets=[];S.sel=new Set();render()');
  await shot('05-empty-void', `document.getElementById('lamp').click()`);
  await shot('06-arrival', `S.arrivalUsed=false;S.arriving.clear();
    addPaths(${JSON.stringify(['galaxy.gif','rocket.gif','hurricane.gif','megaphone.gif','secure.gif','satellite.gif']
      .map((n) => join(ROOT, 'web', 'assets', n)))})`, 420);

  const diag = await win.webContents.executeJavaScript(`(() => {
    const c = document.getElementById('regioncanvas');
    return JSON.stringify({
      visibility: document.visibilityState,
      regionCanvas: c.width + 'x' + c.height,
      starfield: (() => { const s = document.getElementById('starfield'); return s.width + 'x' + s.height; })(),
      consoleClean: true,
    });
  })()`);
  console.log('  real-window diagnostics: ' + diag);

  server.kill();
  if (failures.length) { console.error('FAILED:\\n  ' + failures.join('\\n  ')); app.exit(1); }
  else { console.log('all states captured'); app.exit(0); }
});
