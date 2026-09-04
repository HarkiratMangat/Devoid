/* Devoid — the renderer's only door to the filesystem (PLAN.md 2.5).

   The renderer never touches the filesystem. It asks the main process for
   PATHS — a native dialog, or the real path behind a dropped File — and hands
   those paths to the server, which is the only thing that opens them.

   ⚠️ This is the seam PLAN.md 2.5 asks for. `web/app.js` calls it through a
   `FileSource` shape (two functions), so a future web build swaps this bridge
   for an upload without touching the shell. */

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('devoid', {
  /* → [absolute path, ...]; [] when the person cancels the dialog. */
  pickFiles: () => ipcRenderer.invoke('pick-files'),

  /* A dropped File carries no path through plain web APIs — Electron 32+
     recovers it here, in the preload, where `webUtils` is reachable. */
  pathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || null;
    } catch (e) {
      return null;
    }
  },
});
