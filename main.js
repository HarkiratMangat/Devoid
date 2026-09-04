const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const net = require('net');

const BASE_PORT = 8732;
const LAST_PORT = 8740;
const PYTHON = path.join(__dirname, '.venv', 'bin', 'python');

let serverProcess = null;
let mainWindow = null;
let activePort = BASE_PORT;

function startServer(port) {
  serverProcess = spawn(
    PYTHON,
    ['-m', 'uvicorn', 'server.app:app', '--port', String(port)],
    { cwd: __dirname, stdio: 'inherit' }
  );
}

function waitForServer(port, callback) {
  const attempt = () => {
    http
      .get(`http://127.0.0.1:${port}`, () => callback())
      .on('error', () => setTimeout(attempt, 100));
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
      preload: path.join(__dirname, 'web', 'preload.js'),
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
      { role: 'cut' },
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
  startServer(activePort);
  waitForServer(activePort, () => {
    createWindow();
    logEngineStatus(activePort);
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
