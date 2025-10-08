// -------------------------
// Main process entry point
// -------------------------
// Runs in Electron's "main" process. Handles window creation,
// IPC (inter-process communication), dialogs, and backend logic.

import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import started from 'electron-squirrel-startup'; // Manages Windows installer/uninstaller shortcuts
import * as utils from './utils.js';             // Custom utility functions (Excel + QR handling)

// -------------------------
// Path resolution helpers
// -------------------------
const excelFilePath = path.join(app.getPath('userData'), 'data.xlsx');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveIconPath = () => {
  const iconSegments = ['assets', 'icons', 'app-icon.ico'];
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...iconSegments);
  }
  return path.join(process.cwd(), ...iconSegments);
};

const createWindowIcon = () => {
  const iconPath = resolveIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    console.warn('Window icon missing at', iconPath);
  }
  return icon;
};

// -------------------------
// Windows installer/uninstaller hook
// -------------------------
if (started) {
  app.quit();
}

// -------------------------
// Window creation
// -------------------------
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 900,
    minHeight: 600,
    icon: createWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // mainWindow.webContents.openDevTools();
};

// -------------------------
// App lifecycle
// -------------------------
app.whenReady().then(() => {
  createWindow();

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

// -------------------------
// IPC handlers
// -------------------------
ipcMain.handle('item:save', async (_e, item) => {
  return utils.saveItemAndGenerateQR(excelFilePath, item);
});

ipcMain.handle('items:list', async () => {
  return utils.getAllItems(excelFilePath);
});

ipcMain.handle('item:qr', async (_e, item) => {
  return utils.generateQrForItem(item);
});

ipcMain.handle('items:delete', async (_e, serials) => {
  return utils.deleteItemsBySerial(excelFilePath, serials);
});

ipcMain.handle('items:restore', async (_e, items) => {
  return utils.restoreItems(excelFilePath, items);
});







