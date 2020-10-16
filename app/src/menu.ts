import {app, dialog, shell, webContents, Menu, WebContents} from "electron";
import {homedir} from "os";
import {Simulate} from "react-dom/test-utils";
import select = Simulate.select;

const isMac = process.platform === "darwin"

export const createMenu = (contents: WebContents): Menu => {
    const template = [
        // { role: "appMenu" }
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: "about" },
                { type: "separator" },
                { role: "services" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideothers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" }
            ]
        }] : []),
        // { role: "fileMenu" }
        {
            label: "File",
            submenu: [
                {
                    label: "Select settings file",
                    click: async (): Promise<void> => {
                        if (contents) {
                            dialog.showOpenDialog({
                                title: "Select settings file",
                                defaultPath: homedir(),
                                properties: ["openFile"],
                                filters: [
                                    {
                                        name: "JSON files",
                                        extensions: ["json"],
                                    },
                                ]
                            }).then((value) => {
                                if (!value.canceled) {
                                    return value.filePaths[0];
                                }
                            }).then((selectedSettings) => {
                                if (selectedSettings) {
                                    console.log(selectedSettings);
                                    contents.send("setSettings", selectedSettings);
                                }
                            }).catch((err) => {
                                console.error(err);
                            });
                        }
                    }
                },
                {
                    label: "Select data files",
                    click: async(): Promise<void> => {
                        if (contents) {
                            dialog.showOpenDialog({
                                title: "Select data files",
                                defaultPath: homedir(),
                                properties: ["openFile", "multiSelections"],
                                filters: [
                                    {
                                        name: ".npz files",
                                        extensions: ["npz"],
                                    }
                                ]
                            }).then((value) => {
                                if (!value.canceled) {
                                    return value.filePaths;
                                }
                            }).then((selectedFiles) => {
                                if (selectedFiles) {
                                    contents.send("setDataPaths", selectedFiles);
                                }
                            }).catch((err) => {
                                console.error(err);
                            });
                        }
                    }
                },
                { type: "separator"},
                isMac ? { role: "close" } : { role: "quit" }
            ]
        },
        // { role: "editMenu" }
        {
            label: "Edit",
            submenu: [
                { role: "undo" },
                { role: "redo" },
                { type: "separator" },
                { role: "cut" },
                { role: "copy" },
                { role: "paste" },
                ...(isMac ? [
                    { role: "pasteAndMatchStyle" },
                    { role: "delete" },
                    { role: "selectAll" },
                    { type: "separator" },
                    {
                        label: "Speech",
                        submenu: [
                            { role: "startspeaking" },
                            { role: "stopspeaking" }
                        ]
                    }
                ] : [
                    { role: "delete" },
                    { type: "separator" },
                    { role: "selectAll" }
                ])
            ]
        },
        // { role: "viewMenu" }
        {
            label: "View",
            submenu: [
                { role: "reload" },
                { role: "forcereload" },
                { role: "toggledevtools" },
                { type: "separator" },
                { role: "resetzoom" },
                { role: "zoomin" },
                { role: "zoomout" },
                { type: "separator" },
                { role: "togglefullscreen" }
            ]
        },
        // { role: "windowMenu" }
        {
            label: "Window",
            submenu: [
                { role: "minimize" },
                { role: "zoom" },
                ...(isMac ? [
                    { type: "separator" },
                    { role: "front" },
                    { type: "separator" },
                    { role: "window" }
                ] : [
                    { role: "close" }
                ])
            ]
        },
        {
            role: "help",
            submenu: [
                {
                    label: "Documentation",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://vidriotech.github.io/activity-viewer2/")
                    },
                },
                {
                    label: "Search open issues",
                    click: async (): Promise<void> => {
                        await shell.openExternal("https://github.com/vidriotech/activity-viewer2/issues");
                    }
                }
            ]
        }
    ];

    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    return Menu.buildFromTemplate(template);
}
