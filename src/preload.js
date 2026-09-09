const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("assetReplacer", {
  pickFile: (options) => ipcRenderer.invoke("pick-file", options),
  processReplacement: (payload) => ipcRenderer.invoke("process-replacement", payload)
});