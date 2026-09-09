const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("assetReplacer", {
  pickFile: options => ipcRenderer.invoke("pick-file", options),
  loadRecipe: recipeFile => ipcRenderer.invoke("load-recipe", recipeFile),
  processReplacements: payload => ipcRenderer.invoke("process-replacements", payload)
});
