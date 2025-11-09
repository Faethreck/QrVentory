// -------------------------
// Main process entry point
// -------------------------
// Runs in Electron's "main" process. Handles window creation,
// IPC (inter-process communication), dialogs, and backend logic.

import { app, BrowserWindow, ipcMain, nativeImage, dialog } from 'electron';
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
    autoHideMenuBar: true,
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

ipcMain.handle('item:update', async (_e, payload) => {
  return utils.updateItem(excelFilePath, payload);
});

ipcMain.handle('items:decommission', async (_e, entries, options) => {
  return utils.markItemsAsBaja(excelFilePath, entries, options);
});

ipcMain.handle('items:save-batch', async (_e, items) => {
  return utils.saveItemsBatch(excelFilePath, items);
});

ipcMain.handle('items:export', async () => {
  const browserWindow = BrowserWindow.getFocusedWindow();
  const timestamp = new Date()
    .toISOString()
    .replace(/[:]/g, '-')
    .split('.')[0];
  const defaultPath = path.join(app.getPath('documents'), `QrVentory-${timestamp}.xlsx`);

  try {
    const { canceled, filePath } = await dialog.showSaveDialog(browserWindow ?? undefined, {
      title: 'Exportar inventario',
      defaultPath,
      buttonLabel: 'Guardar',
      filters: [
        {
          name: 'Libro de Excel',
          extensions: ['xlsx'],
        },
      ],
    });

    if (canceled || !filePath) {
      return { canceled: true };
    }

    await utils.exportItemsToFile(excelFilePath, filePath);
    return { canceled: false, filePath };
  } catch (error) {
    console.error('Failed to export items', error);
    throw error;
  }
});

ipcMain.handle('items:import', async () => {
  try {
    const browserWindow = BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(browserWindow ?? undefined, {
      title: 'Importar inventario',
      buttonLabel: 'Importar',
      filters: [
        {
          name: 'Libro de Excel',
          extensions: ['xlsx'],
        },
      ],
      properties: ['openFile'],
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { canceled: true };
    }

    const sourcePath = filePaths[0];
    const result = await utils.importItemsFromFile(excelFilePath, sourcePath);
    return {
      canceled: false,
      imported: Number(result?.imported ?? 0),
    };
  } catch (error) {
    console.error('Failed to import items', error);
    throw error;
  }
});
ipcMain.handle('items:print-labels', async (_event, entries) => {
  try {
    const browserWindow = BrowserWindow.getFocusedWindow();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:]/g, '-')
      .split('.')[0];
    const defaultPath = path.join(
      app.getPath('documents'),
      `QrVentory-etiquetas-${timestamp}.pdf`,
    );

    const { canceled, filePath } = await dialog.showSaveDialog(browserWindow ?? undefined, {
      title: 'Guardar etiquetas',
      defaultPath,
      buttonLabel: 'Guardar',
      filters: [
        {
          name: 'Documento PDF',
          extensions: ['pdf'],
        },
      ],
    });

    if (canceled || !filePath) {
      return { canceled: true, reason: 'user-cancelled' };
    }

    const result = await utils.generateLabelsPdf(excelFilePath, entries, filePath);

    return {
      canceled: false,
      filePath,
      printed: Number(result?.printed ?? 0),
      totalRequested: Number(result?.totalRequested ?? 0),
      missing: Number(result?.missing ?? 0),
    };
  } catch (error) {
    console.error('Failed to generate label PDF', error);
    throw error;
  }
});

ipcMain.handle('items:load-demo', async () => {
  try {
    const result = await utils.seedDemoItems(excelFilePath);
    return {
      added: Number(result?.added ?? 0),
    };
  } catch (error) {
    console.error('Failed to seed demo items', error);
    throw error;
  }
});







