"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var axios = require('axios');
var path = require("path");
var python_shell_1 = require("python-shell");
var pypath = path.join(path.dirname(__dirname), 'activity_viewer');
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    electron_1.app.quit();
}
var createWindow = function () {
    // Create the browser window.
    var mainWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
    });
    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
    // console.log(process.env);
};
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electron_1.app.on('ready', createWindow);
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
var pyshell = new python_shell_1.PythonShell(path.join(pypath, 'app.py'));
axios.post('http://localhost:5000/configure', {
    'settings_path': process.env.AV_SETTINGS_PATH,
    'data_path': process.env.AV_DATA_PATH
}).then(function (res) {
    console.log(res);
    console.log("statusCode: " + res.statusCode);
})
    .catch(function (error) {
    console.error(error);
});
