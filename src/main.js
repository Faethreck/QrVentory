import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import started from 'electron-squirrel-startup';
import * as utils from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
// --- IPC handlers for Excel operations ---
ipcMain.handle('excel:create', async (_e, filePath, headers) => {
  await utils.createExcelFile(filePath, headers);
  return true;
});

ipcMain.handle('excel:addRow', async (_e, filePath, row) => {
  await utils.addRowToExcel(filePath, row);
  return true;
});

ipcMain.handle('excel:editCell', async (_e, filePath, r, c, v) => {
  await utils.editCellInExcel(filePath, r, c, v);
  return true;
});

ipcMain.handle('excel:view', async (_e, filePath) => {
  return utils.viewExcelFile(filePath);
});

// (Optional) show a Save dialog from renderer via preload
ipcMain.handle('excel:pickOpenPath', async () => {
  return dialog.showOpenDialog({
    title: 'Open Excel File',
    properties: ['openFile'],
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
});

ipcMain.handle('excel:pickSavePath', async () => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Save Excel File',
    defaultPath: 'data.xlsx',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });
  return canceled ? null : filePath;
});