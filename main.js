const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 8732;
const PYTHON = path.join(__dirname, '.venv', 'bin', 'python');

let serverProcess = null;
let mainWindow = null;

/* ── Stage 2 (PLAN.md 2.5): the file picker's main-process half ────────────
   Added 2026-09-04 17:08 EDT by the Stage 2 agent, in its own block so it
   merges cleanly with Stage 6's other main.js changes. `web/preload.js` is
   the renderer half. The renderer never touches the filesystem: it gets
   PATHS from here and hands them to the server, which is what opens them. */
const PICKABLE = [
  { name: 'Animated and still images', extensions: ['gif', 'webp', 'avif', 'apng', 'png', 'jpg', 'jpeg'] },
];

ipcMain.handle('pick-files', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: 'Put something on the table',
    properties: ['openFile', 'multiSelections'],
    filters: PICKABLE,
  });
  return r.canceled ? [] : r.filePaths;
});

function startServer() {
  serverProcess = spawn(
    PYTHON,
    ['-m', 'uvicorn', 'server.app:app', '--port', String(PORT)],
    { cwd: __dirname, stdio: 'inherit' }
  );
}

function waitForServer(callback) {
  const attempt = () => {
    http
      .get(`http://127.0.0.1:${PORT}`, () => callback())
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
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(() => {
  startServer();
  waitForServer(createWindow);
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
