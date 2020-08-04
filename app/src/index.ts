import { app, BrowserWindow, ipcMain } from 'electron';
const axios = require('axios');
declare const MAIN_WINDOW_WEBPACK_ENTRY: any;

// Keep a reference for dev mode
let devMode = false;

// Determine the mode (dev or production)
if (process.defaultApp ||
   /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || 
   /[\\/]electron[\\/]/.test(process.execPath)) {
  devMode = true;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true
    }
  });
  
  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  if (devMode) {        
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
if (devMode) {
  const dotenv = require('dotenv');
  dotenv.config();
}

// pass settings path to renderer process
ipcMain.on('settings-path', (event, arg) => {
  event.returnValue = process.env.AV_SETTINGS_PATH;
})

// pass initial data paths to renderer process
ipcMain.on('data-paths', (event, arg) => {
  let dataPaths: string[] = [];
  Object.keys(process.env).forEach((key: string) => {
    if (key.startsWith('AV_DATA_PATH')) {
      dataPaths.push(process.env[key]);
    }
  });

  event.returnValue = dataPaths;
})
