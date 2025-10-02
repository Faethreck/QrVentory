// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('excel', {
  pickSavePath: () => ipcRenderer.invoke('excel:pickSavePath'),
  pickOpenPath: () => ipcRenderer.invoke('excel:pickOpenPath'),
});

contextBridge.exposeInMainWorld('items', {
  save: (filePath, item) => ipcRenderer.invoke('item:save', filePath, item),
});