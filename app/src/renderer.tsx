/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import { ipcRenderer } from 'electron';

import React from 'react';
import ReactDOM from 'react-dom';

import { App, IAppProps } from './components/App';

// Import CSS stylesheet
import './css/index.css';
import { APIClient } from './apiClient';
import { AVConstants } from './constants';
import { CompartmentTree } from './models/compartmentTree';

// Since we are using HtmlWebpackPlugin WITHOUT a template, we should create our own root node in the body element before rendering into it
let root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);

// get settings path and data file paths from main process
const settingsPath = ipcRenderer.sendSync('settings-path');
const dataPaths = ipcRenderer.sendSync('data-paths');

const constants = new AVConstants();
const apiClient = new APIClient(constants.apiEndpoint);

let props: IAppProps = {
    compartmentTree: null,
    constants: constants,
    initialPenetrations: null,
    settings: null
}

apiClient.setSettings(settingsPath)
    .then((res: any) => {
        props.settings = res.data;

        return apiClient.addPenetrations(dataPaths);
    })
    .then((res: any) => {
        props.initialPenetrations = res.data.penetrations;

        return apiClient.fetchCompartmentTree();
    })
    .then((res: any) => {
        props.compartmentTree = new CompartmentTree(res.data);

        ReactDOM.render(
            <App {...props}/>,
            document.getElementById('root')
        );
    })
    .catch((err: any) => {
        console.error(err);
    });

