const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;

// Live cloud URL so code updates here reflect instantly in the .exe without new releases!
const LIVE_CLOUD_URL = 'https://ais-pre-ycozi4jcbblbjgudogp3hh-567239189723.europe-west1.run.app';

function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('opticore:update-status', payload);
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      state: 'available',
      version: info?.version || '',
      releaseNotes:
        typeof info?.releaseNotes === 'string' ? info.releaseNotes : undefined,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({
      state: 'not-available',
      version: info?.version || app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      state: 'downloading',
      progressPercent: Math.round(progress?.percent || 0),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      state: 'downloaded',
      version: info?.version || '',
    });
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus({
      state: 'error',
      message: err?.message || 'Ошибка проверки обновлений',
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 390,
    minHeight: 640,
    backgroundColor: '#070b14',
    title: 'OptiCore — Оптимизация ПК и буст FPS',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const devUrl = process.env.ELECTRON_START_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    // Try loading live cloud app first so updates appear instantly without rebuilding .exe
    mainWindow.loadURL(LIVE_CLOUD_URL).catch(() => {
      void mainWindow.loadFile(path.join(__dirname, 'web-dist', 'index.html'));
    });
  }
}

app.whenReady().then(() => {
  setupAutoUpdater();
  createWindow();

  ipcMain.handle('opticore:get-app-info', () => ({
    isElectron: true,
    version: app.getVersion(),
    platform: process.platform,
  }));

  ipcMain.handle('opticore:check-updates', async () => {
    try {
      if (!app.isPackaged) {
        sendUpdateStatus({
          state: 'not-available',
          version: app.getVersion(),
        });
        return { ok: true };
      }
      await autoUpdater.checkForUpdates();
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не удалось подключиться к серверу обновлений';
      sendUpdateStatus({ state: 'error', message });
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('opticore:download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки обновления';
      sendUpdateStatus({ state: 'error', message });
      return { ok: false, error: message };
    }
  });

  ipcMain.handle('opticore:install-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
