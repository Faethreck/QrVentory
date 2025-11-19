// preload.js
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  saveItem: (item) => ipcRenderer.invoke('item:save', item),
  listItems: () => ipcRenderer.invoke('items:list'),
  generateQr: (item) => ipcRenderer.invoke('item:qr', item),
  deleteItems: (serials) => ipcRenderer.invoke('items:delete', serials),
  restoreItems: (items) => ipcRenderer.invoke('items:restore', items),
  updateItem: (payload) => ipcRenderer.invoke('item:update', payload),
  exportItems: () => ipcRenderer.invoke('items:export'),
  importItems: () => ipcRenderer.invoke('items:import'),
  decommissionItems: (entries, options) => ipcRenderer.invoke('items:decommission', entries, options),
  saveItemsBatch: (items) => ipcRenderer.invoke('items:save-batch', items),
  printLabels: (entries) => ipcRenderer.invoke('items:print-labels', entries),
  generateLocationReport: (entries) => ipcRenderer.invoke('items:location-report', entries),
  loadDemoItems: () => ipcRenderer.invoke('items:load-demo'),
});
