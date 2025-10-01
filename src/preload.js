const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('excel', {
  create: (filePath, headers) => ipcRenderer.invoke('excel:create', filePath, headers),
  addRow: (filePath, row) => ipcRenderer.invoke('excel:addRow', filePath, row),
  editCell: (filePath, row, col, val) => ipcRenderer.invoke('excel:editCell', filePath, row, col, val),
  view: (filePath) => ipcRenderer.invoke('excel:view', filePath),
  pickOpenPath: () => ipcRenderer.invoke('excel:pickOpenPath'),   // must match main.js
  pickSavePath: () => ipcRenderer.invoke('excel:pickSavePath'),   // must match main.js
});