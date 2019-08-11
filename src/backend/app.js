/////////////////////////////////////////////////////
// File Name: app.js


/////////////////////////////////////////////////////
// Requires
// #region
const { app, BrowserWindow } = require('electron');
const console = require("./modules/console/console.js");
// #endregion
/////////////////////////////////////////////////////
// Vars
// #region


// #endregion
/////////////////////////////////////////////////////
// Main Process
console.log("Starting application");

app.on('ready', createWindow);


/////////////////////////////////////////////////////
// Local Functions
// #region
function createWindow () {
    // Create the browser window.
    let win = new BrowserWindow({
        width: 1600,
        height: 1000,
        //frame: false, 
        icon: './icon.png',
        webPreferences: {
            nodeIntegration: true
        }
    });
    win.webContents.openDevTools();
    win.setMenu(null);

    win.on('closed', () => {
        console.log("Application closed");
    });

    // and load the index.html of the app.
    win.loadFile("./src/frontend/index.html");
}

// #endregion
/////////////////////////////////////////////////////