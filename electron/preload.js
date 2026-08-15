const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  printToPDF: (opts) => ipcRenderer.invoke('print-to-pdf', opts),
});
