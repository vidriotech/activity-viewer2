import { app, BrowserWindow } from 'electron';
const axios = require('axios');
import path = require('path');
import { PythonShell } from 'python-shell';
const { spawn } = require('child_process');
declare const MAIN_WINDOW_WEBPACK_ENTRY: any;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
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
// const viewerd = spawn('viewerd')

// viewerd.on('error', (err: any) => {
//   console.error(`failed to start: ${err}`)
// });

// viewerd.stdout.on('data', (data: string) => {
//   console.log(`Received chunk ${data}`);
// });

// viewerd.stderr.on('data', (data: string) => {
//   console.error(`Received error ${data}`);
// });

// viewerd.on('close', (code: any) => {
//   console.log(`child process exited with code ${code}`);
// });

// viewerd.on('exit', (code: number, signal: string) => {
//   console.log(`viewerd has quit with code ${code}: ${signal}.`);
// });

// app.on('before-quit', () => {
//   console.log('quitting');
//   let killed = viewerd.kill();
//   console.log(`killed: ${killed}`);
// });

// const pypath = path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'activity_viewer');
// let pyshell = new PythonShell(path.join(pypath, 'app.py'));

// axios.post('http://localhost:5000/configure', {
//   'settings_path': process.env.AV_SETTINGS_PATH,
//   'data_path': process.env.AV_DATA_PATH
// }).then((res: any) => {
//   console.log(`statusCode: ${res.statusCode}`);
// })
// .catch((error: any) => {
//   console.error(error);
// })