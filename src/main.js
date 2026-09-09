const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { processReplacement } = require("./core/processor");

function createWindow() {
  const win = new BrowserWindow({
    width: 840,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, "ui", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("pick-file", async (_event, options = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: options.filters || []
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("process-replacement", async (_event, payload) => {
  try {
    const result = await processReplacement(payload);
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err && err.stack ? err.stack : String(err) };
  }
});