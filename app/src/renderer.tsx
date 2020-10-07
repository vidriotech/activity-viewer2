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

import React from "react";
import ReactDOM from "react-dom";

// Import styling
import "./assets/css/index.css";
// import "fomantic-ui-css/semantic.css";
import "fontsource-roboto";

// eslint-disable-next-line import/no-unresolved
import { APIClient } from "./apiClient";
// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "./constants";
// eslint-disable-next-line import/no-unresolved
import { CompartmentTree } from "./compartmentTree";
// eslint-disable-next-line import/no-unresolved
import { CompartmentNodeInterface, AVSettings } from "./models/apiModels";

// eslint-disable-next-line import/no-unresolved
import { App } from "./components/App";

// Since we are using HtmlWebpackPlugin WITHOUT a template, we should create our own root node in the body element before rendering into it
const root = document.createElement("div");
root.id = "root";
document.body.appendChild(root);

ReactDOM.render(<App />, document.getElementById("root"));



