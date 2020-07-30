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

import React from 'react';
import ReactDOM from 'react-dom';
const THREE = require('three');
import * as THREEM from 'three';
require("three-obj-loader")(THREE);

import {Viewer3D} from './components/Viewer3D';

// Import CSS stylesheet
import './css/index.css';

// Since we are using HtmlWebpackPlugin WITHOUT a template, we should create our own root node in the body element before rendering into it
let root = document.createElement('div');
root.id = 'root';
document.body.appendChild(root);

ReactDOM.render(
    <Viewer3D />,
    document.getElementById('root')
);

console.log('👋 This message is being logged by "renderer.js", included via webpack and hey there\'s some React here too');

const loader = new THREE.OBJLoader();
const path = 'http://localhost:3030/mesh/1';

loader.load(path, (obj: THREE.Group) => {
    console.log(obj);
    obj.traverse((child: any) => {
        console.log(child);
    });
});
