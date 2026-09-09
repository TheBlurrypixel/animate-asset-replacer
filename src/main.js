const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { processReplacementJob } = require("./core/processor");
const { loadRecipe } = require("./core/recipe");

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 820,
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
  const result = await dialog.showOpenDialog({ properties: ["openFile"], filters: options.filters || [] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("load-recipe", async (_event, recipeFile) => {
  try { return { ok: true, recipe: loadRecipe(recipeFile) }; }
  catch (err) { return { ok: false, error: err && err.stack ? err.stack : String(err) }; }
});

ipcMain.handle("process-replacements", async (_event, payload) => {
  try { return { ok: true, result: await processReplacementJob(payload) }; }
  catch (err) { return { ok: false, error: err && err.stack ? err.stack : String(err) }; }
});
