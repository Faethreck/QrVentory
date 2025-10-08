// preload.js
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  saveItem: (item) => ipcRenderer.invoke('item:save', item),
  listItems: () => ipcRenderer.invoke('items:list'),
  generateQr: (item) => ipcRenderer.invoke('item:qr', item),
  deleteItems: (serials) => ipcRenderer.invoke('items:delete', serials),
  restoreItems: (items) => ipcRenderer.invoke('items:restore', items),
});
