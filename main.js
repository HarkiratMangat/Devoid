const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 8732;
const PYTHON = path.join(__dirname, '.venv', 'bin', 'python');

let serverProcess = null;
let mainWindow = null;

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
