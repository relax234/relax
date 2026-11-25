const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('opticoreDesktop', {
  getAppInfo: () => ipcRenderer.invoke('opticore:get-app-info'),
  checkForUpdates: () => ipcRenderer.invoke('opticore:check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('opticore:download-update'),
  installUpdate: () => ipcRenderer.invoke('opticore:install-update'),
  onUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('opticore:update-status', handler);
    return () => ipcRenderer.removeListener('opticore:update-status', handler);
  },
});
