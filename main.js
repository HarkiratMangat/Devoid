const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const http = require('http');
const net = require('net');
const https = require('https');
const { compareVersions } = require('./lib/versions');
const fs = require('fs');

const BASE_PORT = 8732;
const LAST_PORT = 8740;
/* ── Where Python is, where the server lives, and where the logs go ────────
 * ⚠️ A packaged .app is not a checkout. `__dirname` is inside app.asar, which
 * Python cannot read, and there is no `.venv` beside it -- which is exactly
 * why the first build "ran" only from this repo. Each of the three is resolved
 * once, here, and a failure is a DIALOG rather than a window that never opens.
 */
const PACKAGED = app.isPackaged;
/* server/ ships as extraResources, NOT inside the asar, so uvicorn can import
 * it and Python can read it as ordinary files on disk. */
const SERVER_CWD = PACKAGED ? process.resourcesPath : __dirname;

/** The interpreter, in order of preference, with the reason it was chosen. */
function resolvePython() {
  const candidates = [
    [process.env.DEVOID_PYTHON, 'DEVOID_PYTHON'],
    [PACKAGED ? path.join(process.resourcesPath, 'pyvenv', 'bin', 'python3') : null, 'bundled'],
    [path.join(__dirname, '.venv', 'bin', 'python'), 'repo .venv'],
  ];
  for (const [candidate, why] of candidates) {
    if (candidate && fs.existsSync(candidate)) return { python: candidate, why };
  }
  return null;
}

/* ── can this Python actually run the engine, and can we fix it if not? ─────
   ⚠️ WHY THIS EXISTS. The bundled `pyvenv` is a VIRTUALENV — shortcuts into
   /Library/Frameworks/Python.framework/Versions/3.11, a system-wide install
   that is not part of the bundle. Copy Devoid.app to another Mac and it starts,
   finds its interpreter shortcut, and dies inside an import, which reads as
   "the app is broken" rather than "this Mac is missing Python".

   🔴 THE FIRST VERSION OF THIS WAS BROKEN IN THREE WAYS, ALL FOUND BY ASKING
   WHETHER ITS REMEDY COULD RUN (2026-09-07 12:01 EDT) — never by running it:
     1. It offered `pip install --user`. Inside a virtualenv that is a HARD
        ERROR: "Can not perform a '--user' install. User site-packages are not
        visible in this virtualenv." A venv installs into itself.
     2. `electron-builder.yml` excludes `lib/**/pip/**` from the bundle — the
        prune was written the same day — so `python -m pip` in a packaged app
        is `No module named pip`. The dialog named a command that could not
        exist on the machine it was for.
     3. It could not tell a MISSING MODULE from a DEAD INTERPRETER. Both
        surface as a non-zero exit, so the case this whole feature exists for —
        no Python 3.11 on the machine — reported "five packages are missing"
        and offered to install them into a corpse.
   The lesson, and it is this repo's founding one: a check is not finished when
   it detects; it is finished when its REMEDY has been shown to run. */
const RUNTIME_IMPORTS = ['starlette', 'uvicorn', 'numpy', 'scipy', 'PIL'];
const PIP_NAMES = { starlette: 'starlette', uvicorn: 'uvicorn', numpy: 'numpy',
                    scipy: 'scipy', PIL: 'Pillow' };

/* One spawn, not five: it reports which imports failed AND whether pip is
   reachable AND whether the interpreter is a venv, in a single start-up cost.
   Five sequential 20s probes could stall a first launch for a minute and a half
   behind a window that had not appeared yet. */
const PROBE = `
import json, sys
out = {"ok": True, "missing": [], "pip": False, "venv": sys.prefix != sys.base_prefix,
       "version": list(sys.version_info[:2])}
for m in ${JSON.stringify(RUNTIME_IMPORTS)}:
    try:
        __import__(m)
    except Exception:
        out["missing"].append(m)
try:
    import pip  # noqa: F401
    out["pip"] = True
except Exception:
    pass
print(json.dumps(out))
`;

function probePython(python) {
  const r = spawnSync(python, ['-c', PROBE], { timeout: 30000, encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    /* ⚠️ THE INTERPRETER ITSELF DID NOT RUN. On another Mac that means the
       venv's base Python is absent, which is a different sentence to show a
       person than "a package is missing" — and pip cannot help with it. */
    return { dead: true, why: String(r.error || r.stderr || '').trim().split('\n').slice(-2).join(' ') };
  }
  try { return { dead: false, ...JSON.parse(r.stdout) }; }
  catch { return { dead: true, why: 'the interpreter answered with something that was not JSON' }; }
}

/* A Python on this machine that is NOT the bundled venv, for the case where the
   bundle's base interpreter is gone. Nothing is installed into it without being
   asked; it is only a candidate. */
function systemPython() {
  for (const cand of ['/usr/bin/python3', '/opt/homebrew/bin/python3', '/usr/local/bin/python3']) {
    if (!fs.existsSync(cand)) continue;
    const p = probePython(cand);
    if (!p.dead && p.version && p.version[0] === 3 && p.version[1] >= 10) return { python: cand, probe: p };
  }
  return null;
}

async function offerToInstall(python, probe) {
  const names = probe.missing.map((m) => PIP_NAMES[m] || m);
  /* ⛔ NO `--user`. In a virtualenv it is a hard error; outside one it is the
     right flag. Choose by what the interpreter reported about itself. */
  const flags = probe.venv ? [] : ['--user'];
  const cmd = `${python} -m pip install ${flags.join(' ')}${flags.length ? ' ' : ''}${names.join(' ')}`;

  if (!probe.pip) {
    dialog.showErrorBox(
      'Devoid needs a few Python packages, and cannot install them itself',
      `Missing: ${names.join(', ')}.\n\n` +
        'This copy of Python has no `pip`, so Devoid cannot add them for you — ' +
        'the packaged app deliberately ships without it to keep the bundle small.\n\n' +
        'Install them yourself:\n\n' +
        `    ${python} -m ensurepip --upgrade\n    ${cmd}\n\n` +
        'or point DEVOID_PYTHON at a Python 3.11 that already has them, and reopen Devoid.'
    );
    return false;
  }

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['Install them', 'Quit'],
    defaultId: 1,
    cancelId: 1,
    title: 'Devoid needs a few Python packages',
    message: `Devoid cannot run the engine without ${names.join(', ')}.`,
    detail:
      'The engine runs as a Python subprocess, and this Mac is missing ' +
      `${names.length === 1 ? 'one package it needs' : `${names.length} packages it needs`}.\n\n` +
      'Devoid can install them for you, once, and nothing is installed unless ' +
      'you say so here:\n\n' +
      `    ${cmd}\n\n` +
      (probe.venv
        ? 'They go into the copy of Python inside Devoid, not into your system.\n\n'
        : 'They go into your user directory, not into your system.\n\n') +
      'This can take a few minutes; scipy and numpy are large.',
  });
  if (response !== 0) return false;

  const r = spawnSync(python, ['-m', 'pip', 'install', ...flags, ...names],
    { timeout: 15 * 60 * 1000, encoding: 'utf8' });
  const after = probePython(python);
  if (r.status === 0 && !after.dead && after.missing.length === 0) return true;

  dialog.showErrorBox(
    'That install did not finish',
    `Devoid ran:\n    ${cmd}\n\n` +
      (r.status === 0
        ? 'It reported success, but the packages still cannot be imported.\n\n'
        : `It exited with status ${r.status === null ? 'a timeout' : r.status}.\n\n`) +
      `${String(r.stderr || r.stdout || '').trim().split('\n').slice(-8).join('\n')}\n\n` +
      'Install them yourself and reopen Devoid, or set DEVOID_PYTHON to a ' +
      'Python 3.11 that already has them.'
  );
  return false;
}

let serverProcess = null;
let mainWindow = null;
let activePort = BASE_PORT;

// ⚠️ SINGLE INSTANCE, and it is a correctness guard rather than a nicety.
// Two copies means two servers on two ports (the probe handles that) and TWO
// WRITERS to labels/protection.jsonl -- and "two append-only logs, one writer
// each" (CLAUDE.md) is a schema rule, not something the filesystem enforces. A
// POSIX append is atomic only below PIPE_BUF, and a label row carrying a bbox
// and a long absolute path can exceed it, so interleaved writes can tear a line.
// The second copy hands its file arguments to the first and exits.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const paths = fileArgs(argv);
    if (paths.length) deliverPaths(paths);
  });
}

/** File paths in a second launch's argv -- Finder's "Open With" arrives this way.
 *  Anything that is not an existing file (flags, the executable, a cwd) is dropped. */
function fileArgs(argv) {
  return (argv || []).slice(1).filter((a) => {
    if (typeof a !== 'string' || a.startsWith('-')) return false;
    try { return fs.statSync(a).isFile(); } catch { return false; }
  });
}

let serverStderr = '';

function startServer(port, python) {
  /* ⚠️ The app must never write inside its own bundle: that breaks under
   * signing and is wiped by the next install. Packaged, the two logs and the
   * crash journal go to ~/Library/Application Support/Devoid; from a checkout
   * they stay in the repo, where labels/protection.jsonl is tracked evidence. */
  const env = { ...process.env };
  if (PACKAGED) env.DEVOID_DATA_DIR = app.getPath('userData');
  /* ⚠️ ...and "never write inside its own bundle" includes BYTECODE, which is
   * the case the line above does not cover. Python byte-compiles site-packages
   * on first import, and packaged that lands in Contents/Resources/pyvenv as
   * __pycache__. Measured 2026-09-06: one launch of the signed build wrote 340
   * .pyc files into the bundle and `codesign --verify --deep --strict` went
   * from exit 0 to "a sealed resource is missing or invalid". The app broke its
   * own signature by running. Unset, this is invisible until something checks. */
  if (PACKAGED) env.PYTHONDONTWRITEBYTECODE = '1';

  serverProcess = spawn(
    python,
    ['-m', 'uvicorn', 'server.app:app', '--port', String(port)],
    { cwd: SERVER_CWD, env, stdio: ['ignore', 'inherit', 'pipe'] }
  );
  /* keep stderr: when the server dies at import time, this text IS the reason,
   * and without it a failed launch is a window that simply never appears */
  serverProcess.stderr.on('data', (chunk) => {
    const text = String(chunk);
    serverStderr = (serverStderr + text).slice(-4000);
    process.stderr.write(text);
  });
  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) console.error(`[devoid] server exited with ${code}`);
  });
}

/* ⚠️ This used to retry FOREVER. A server that never comes up then showed the
 * person nothing at all -- no window, no error, just a bouncing icon. A launch
 * that cannot work has to say so. 40s covers a 3.82s cold engine import
 * (PLAN.md 1.2) many times over. */
function waitForServer(port, callback, onTimeout, deadline = Date.now() + 40000) {
  const attempt = () => {
    http
      .get(`http://127.0.0.1:${port}`, () => callback())
      .on('error', () => {
        if (Date.now() > deadline) return onTimeout();
        setTimeout(attempt, 100);
      });
  };
  attempt();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // ⚠️ web/ ships as extraResources beside server/, because Python serves
      // it and Python cannot read inside app.asar. One copy, one path.
      preload: path.join(SERVER_CWD, 'web', 'preload.js'),
    },
  });
  mainWindow.loadURL(`http://127.0.0.1:${activePort}`);
}

// `web/app.js`'s "Add files" button goes through this (FileSource.pick, PLAN
// 2.5), reusing the same dialog + filters Stage 6's File > Open menu item
// uses. web/preload.js exposes it as window.devoid.pickFiles().
ipcMain.handle('pick-files', async () => {
  if (!mainWindow) return [];
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open images',
    properties: ['openFile', 'multiSelections'],
    filters: IMAGE_FILTERS,
  });
  return canceled ? [] : filePaths;
});

// ─────────────────────────────────────────────────────────────────────────────
// Stage 6 — ship it. Everything below this line is additive; it is one block so
// it lifts cleanly into a merge. See docs/PLAN.md "Stage 6" and the edge-case
// table ("Port 8732 already bound", "Two engine versions", "Offline").
// ─────────────────────────────────────────────────────────────────────────────

// ── Port already bound (edge-case table; the gap 0.5 shipped without) ─────────
// PLAN allows failing loudly or taking the next free port. We take the next free
// port — "a second window, a crashed run" is the case, and a second window that
// works beats a dialog. The probe is a real TCP connect, not a sleep: something
// that accepts a connection is listening, ECONNREFUSED is free, and a timeout is
// treated as occupied because a socket that neither accepts nor refuses is worse
// than a busy one.

function isPortFree(port, timeoutMs = 300) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (free) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(free);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(false)); // someone is listening
    socket.once('timeout', () => finish(false)); // neither accepts nor refuses
    socket.once('error', (err) => finish(err.code === 'ECONNREFUSED'));
    socket.connect(port, '127.0.0.1');
  });
}

async function findFreePort() {
  for (let port = BASE_PORT; port <= LAST_PORT; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) {
      if (port !== BASE_PORT) {
        console.log(`[devoid] port ${BASE_PORT} is busy — using ${port}`);
      }
      return port;
    }
  }
  return null;
}

// ── Two engine versions (edge-case table) ────────────────────────────────────
// Stage 1 owns recording engine_version alongside every result. This is the
// Electron-side accompaniment: say out loud, in the main process's own stdout,
// which engine build a session is actually running against. Tolerant by design —
// /api/engine/status does not exist until Stage 1, and a 404 is not a failure
// worth stopping a launch for.

async function logEngineStatus(port, attempts = 20) {
  const url = `http://127.0.0.1:${port}/api/engine/status`;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url); // eslint-disable-line no-await-in-loop
      if (res.status === 404) {
        console.log('[devoid] engine: /api/engine/status not implemented yet (PLAN 1.1)');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const status = await res.json(); // eslint-disable-line no-await-in-loop
      const version = status.engine_version || 'unknown';
      const skillPath =
        status.skill_path || status.engine_path || status.resolved_path || 'unreported';
      console.log(`[devoid] engine_version=${version}`);
      console.log(`[devoid] skill path=${skillPath}`);
      if (status.available === false) {
        console.log(`[devoid] engine unavailable — missing: ${(status.missing || []).join(', ')}`);
      }
      return;
    } catch (err) {
      if (i === attempts - 1) {
        console.log(`[devoid] engine status unavailable: ${err.message}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 150)); // eslint-disable-line no-await-in-loop
    }
  }
}

// ── Opening files (PLAN 2.5, the FileSource boundary) ────────────────────────
// The native dialog is how a real file's real path reaches the app. The renderer
// never touches the filesystem and never reads bytes — main hands it absolute
// paths and nothing else, as a `devoid:open-files` CustomEvent on window. That
// event is the FileSource seam: web/app.js listens for it, and a future web build
// swaps the event's producer without the renderer noticing.

const IMAGE_FILTERS = [
  { name: 'Images', extensions: ['gif', 'webp', 'avif', 'apng', 'png', 'jpg', 'jpeg'] },
  { name: 'Animated', extensions: ['gif', 'webp', 'avif', 'apng'] },
  { name: 'All Files', extensions: ['*'] },
];

async function openFiles() {
  if (!mainWindow) return;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open images',
    properties: ['openFile', 'multiSelections'],
    filters: IMAGE_FILTERS,
  });
  if (canceled || filePaths.length === 0) return;
  deliverPaths(filePaths);
}

function deliverPaths(filePaths) {
  if (!mainWindow) return;
  const payload = JSON.stringify(filePaths);
  mainWindow.webContents.executeJavaScript(
    `window.dispatchEvent(new CustomEvent('devoid:open-files',{detail:{paths:${payload}}}));`
  );
  console.log(`[devoid] opened ${filePaths.length} file(s)`);
}

/* ── Check for Updates (6.4) ───────────────────────────────────────────────
 * ⚠️ USER-INITIATED ONLY, NEVER ON LAUNCH. This app's whole premise is that it
 * works on your machine with your files and talks to nothing; a version ping
 * fired at startup would quietly break that promise for a feature nobody asked
 * for at that moment. It runs when the menu item is clicked and at no other time.
 *
 * ⚠️ And it does NOT auto-update, deliberately. On macOS electron-updater goes
 * through Squirrel.Mac, which VALIDATES THE CODE SIGNATURE of what it downloads
 * — so an unsigned build cannot install its own update, and wiring one would
 * ship a path that fails at runtime. This tells you what exists and opens the
 * release page. See README's Packaging section for the signing story.
 */
const RELEASES_API = 'https://api.github.com/repos/HarkiratMangat/Devoid/releases/latest';

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      RELEASES_API,
      { headers: { 'user-agent': `Devoid/${app.getVersion()}`, accept: 'application/vnd.github+json' } },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          // ⚠️ 404 is AMBIGUOUS and must not be reported as one thing. GitHub
          // returns it both when a repository has no published releases and
          // when the repository is PRIVATE and the caller is anonymous — and
          // HarkiratMangat/Devoid is private today, so this app cannot tell
          // "nothing released" from "released, but not visible to you".
          if (res.statusCode === 404) return resolve(null);
          if (res.statusCode !== 200) {
            return reject(new Error(`GitHub answered ${res.statusCode}`));
          }
          try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('GitHub sent something unreadable')); }
        });
      }
    );
    req.setTimeout(10000, () => { req.destroy(new Error('GitHub did not answer within 10 seconds')); });
    req.on('error', reject);
  });
}

async function checkForUpdates() {
  const current = app.getVersion();
  let release;
  try {
    release = await fetchLatestRelease();
  } catch (err) {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      message: 'Could not check for updates',
      detail: `${err.message}.\n\nDevoid ${current} is what you are running. Nothing was changed.`,
      buttons: ['OK'],
    });
    return;
  }

  if (!release || !release.tag_name) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: 'GitHub has no release to show',
      detail: `You are running Devoid ${current}.\n\n` +
        'Either nothing has been published yet, or the repository is private — ' +
        'Devoid asks anonymously and GitHub answers both cases identically, so ' +
        'it cannot tell you which. This is not an error, and nothing was changed.',
      buttons: ['OK'],
    });
    return;
  }

  const latest = release.tag_name;
  if (compareVersions(latest, current) <= 0) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      message: `Devoid ${current} is up to date`,
      detail: `The newest published release is ${latest}.`,
      buttons: ['OK'],
    });
    return;
  }

  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    message: `Devoid ${latest.replace(/^v/, '')} is available`,
    detail: `You are running ${current}.\n\n` +
      'Devoid cannot install its own updates — it is not code-signed, and macOS ' +
      'refuses an unsigned update. Opening the release page downloads the new ' +
      'disk image, which you drag into Applications the same way as the first one.',
    buttons: ['Open the release page', 'Later'],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0 && release.html_url) shell.openExternal(release.html_url);
}

// ── Menus, shortcuts, About panel (6.1) ──────────────────────────────────────

function setAboutPanel() {
  app.setAboutPanelOptions({
    applicationName: 'Devoid',
    applicationVersion: app.getVersion(),
    version: `Electron ${process.versions.electron}`,
    copyright:
      'A front end for the gif-background-remover skill, which stays the engine.\n' +
      'Devoid reimplements no image processing.',
    credits: 'github.com/HarkiratMangat/Devoid',
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const isDev = !app.isPackaged;

  const appMenu = {
    label: 'Devoid',
    submenu: [
      { label: 'About Devoid', click: () => app.showAboutPanel() },
      { label: 'Check for Updates…', click: checkForUpdates },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide', label: 'Hide Devoid' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit', label: 'Quit Devoid' },
    ],
  };

  const fileMenu = {
    label: 'File',
    submenu: [
      { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: openFiles },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  };

  const editMenu = {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      /* ⚠️ F16. `{ role: 'cut' }` — the platform's clipboard Cut, ⌘X — is
         removed deliberately. In an app whose product verb IS "cut", an Edit
         menu item called Cut that does something entirely different is the
         worst available collision. Copy and Paste stay: neither is overloaded. */
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  };

  const viewMenu = {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      ...(isDev
        ? [{ type: 'separator' }, { role: 'toggleDevTools' }]
        : []),
    ],
  };

  const windowMenu = { role: 'windowMenu' };

  const helpMenu = {
    role: 'help',
    submenu: [
      {
        label: 'Devoid on GitHub',
        click: () => shell.openExternal('https://github.com/HarkiratMangat/Devoid'),
      },
      ...(isMac ? [] : [{ label: 'About Devoid', click: () => app.showAboutPanel() }]),
    ],
  };

  const template = [
    ...(isMac ? [appMenu] : []),
    fileMenu,
    editMenu,
    viewMenu,
    windowMenu,
    helpMenu,
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── End Stage 6 block ────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  if (!gotTheLock) return;          // a second copy: the first one owns the logs
  const port = await findFreePort();
  if (port === null) {
    dialog.showErrorBox(
      'Devoid cannot start',
      `Every port from ${BASE_PORT} to ${LAST_PORT} is already in use.\n\n` +
        'Devoid is probably already running. Quit the other copy, or free one of ' +
        'those ports, and try again.'
    );
    app.quit();
    return;
  }
  activePort = port;
  console.log(`[devoid] serving on http://127.0.0.1:${activePort}`);

  setAboutPanel();
  buildMenu();

  const found = resolvePython();
  if (!found) {
    dialog.showErrorBox(
      'Devoid cannot find its Python',
      'Devoid runs a small local server and could not find an interpreter to run it with.\n\n' +
        'Looked for, in order:\n' +
        '  • $DEVOID_PYTHON\n' +
        (PACKAGED ? '  • the copy bundled inside Devoid.app\n' : '') +
        `  • ${path.join(__dirname, '.venv', 'bin', 'python')}\n\n` +
        'Set DEVOID_PYTHON to a Python 3.11 that has starlette, uvicorn, numpy, scipy and Pillow.'
    );
    app.quit();
    return;
  }
  console.log(`[devoid] python: ${found.python} (via ${found.why})`);

  /* ⚠️ BEFORE the server, not after. A missing package surfaces as a server
     that never answers, and `waitForServer` then blames the port after 40
     seconds of nothing. One probe here turns that into a sentence. */
  let py = found.python;
  let probe = probePython(py);
  if (probe.dead) {
    /* the bundle's venv cannot run — almost always its base interpreter is
       absent on this Mac. Look for a real one before giving up. */
    const alt = systemPython();
    if (alt) {
      console.log(`[devoid] bundled python is dead (${probe.why}); using ${alt.python}`);
      py = alt.python; probe = alt.probe;
    } else {
      dialog.showErrorBox(
        'Devoid needs Python 3.11 and this Mac does not have it',
        `Devoid ships a copy of Python, but that copy is a virtual environment: ` +
          'it needs the Python it was built against, and that is a system-wide ' +
          'install rather than part of the app.\n\n' +
          `Tried: ${py}\n${probe.why}\n\n` +
          'Install Python 3.11 from python.org, or set DEVOID_PYTHON to a ' +
          'Python 3.11 that has starlette, uvicorn, numpy, scipy and Pillow.'
      );
      app.quit();
      return;
    }
  }
  if (probe.missing.length) {
    console.log(`[devoid] missing: ${probe.missing.join(', ')} (venv=${probe.venv}, pip=${probe.pip})`);
    const fixed = await offerToInstall(py, probe);
    if (!fixed) { app.quit(); return; }
  }
  found.python = py;

  startServer(activePort, found.python);
  waitForServer(
    activePort,
    () => { createWindow(); logEngineStatus(activePort); },
    () => {
      dialog.showErrorBox(
        'Devoid could not start its server',
        `The local server did not answer on port ${activePort} within 40 seconds.\n\n` +
          `Python: ${found.python} (via ${found.why})\n` +
          `Working directory: ${SERVER_CWD}\n\n` +
          (serverStderr ? `Last output from the server:\n\n${serverStderr.slice(-1200)}`
                        : 'The server printed nothing, which usually means the interpreter itself could not start.')
      );
      app.quit();
    }
  );
});

/* ⚠️ On macOS this killed the server and then did NOT quit, and there was no
 * `activate` handler — so ⌘W left a Dock icon with a dead server behind it and
 * no way to get a window back. Two halves of one bug: the platform convention
 * is that the app survives its last window, and surviving means being able to
 * open another one. */
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return;   // keep the server; `activate` reopens
  if (serverProcess) serverProcess.kill();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length) return;
  // The server is still up (window-all-closed left it alone on darwin), so this
  // is just a window again. If it somehow died, waitForServer's deadline turns
  // that into the same dialog a cold start would show rather than a blank frame.
  if (serverProcess && serverProcess.exitCode === null) return void createWindow();
  const found = resolvePython();
  if (!found) return;
  startServer(activePort, found.python);
  waitForServer(activePort, createWindow, () => {
    dialog.showErrorBox('Devoid could not restart its server',
      `The local server did not answer on port ${activePort}.\n\n` +
      (serverStderr ? serverStderr.slice(-1200) : 'It printed nothing.'));
  });
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
