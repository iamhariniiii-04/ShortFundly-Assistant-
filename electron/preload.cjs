const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  sendNotification: (title, body) => ipcRenderer.send('app:notification', { title, body }),
  openExternal: (url) => ipcRenderer.send('app:openExternal', url)
});
