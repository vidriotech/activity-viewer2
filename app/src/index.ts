import {BrowserWindow, app, dialog, ipcMain} from "electron";
declare const MAIN_WINDOW_WEBPACK_ENTRY: any;

// Keep a reference for dev mode
const devMode = (process.defaultApp ||
    /[\\/]electron-prebuilt[\\/]/.test(process.execPath) ||
    /[\\/]electron[\\/]/.test(process.execPath));

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) { // eslint-disable-line global-require
    app.quit();
}

let settingsPath: string;

const createWindow = (): void => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // require a settings file
    dialog.showOpenDialog({
        title: "Select settings file",
        // defaultPath: os.homedir(),
        defaultPath: __dirname,
        properties: ["openFile"]
    }).then((value) => {
        if (value.canceled) {
            throw Error("No settings file given.");
        } else {
            return value.filePaths[0];
        }
    }).then((selectedSettings) => {
        settingsPath = selectedSettings;

        // and load the index.html of the app.
        return mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    }).then(() => {
        // Open the DevTools.
        if (devMode) {
            mainWindow.webContents.openDevTools();
        }
    }).catch((err) => {
        let errmsg: Error | string;
        if (err.isAxiosError) {
            if (err.code === "ECONNREFUSED") {
                errmsg = "Connection failed. Is the viewer daemon running?";
            } else {
                errmsg = `Connection failed with code "${err.code}"`;
            }
        } else {
            errmsg = err;
        }

        console.error(errmsg);
        app.quit();
    });
};

ipcMain.on("getSettings", (event, args) => {
    event.reply("getSettings", settingsPath);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
