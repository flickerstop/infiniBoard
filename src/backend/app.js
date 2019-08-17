/////////////////////////////////////////////////////
// File Name: app.js


/////////////////////////////////////////////////////
// Requires
// #region
const { app, BrowserWindow, ipcMain } = require('electron');
const console = require("./modules/console/console.js");
const fs = require("fs-extra");
const packer = require("./modules/packer/packer");

const saveLocation = "./boxes/";//(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + "/.local/share")).replace(/\\/gm,"/")+"/infiniboard/boxes/";
// #endregion
/////////////////////////////////////////////////////
// Vars
// #region
let window = null;

// #endregion
/////////////////////////////////////////////////////
// Main Process
console.log("Starting application");


app.on('ready', ()=>{
    loadBoxes().then((boxes)=>{
        window.webContents.on('did-finish-load', () => {
            window.webContents.send('loadedData', boxes);
        })
    });
    createWindow();
});


// Calls from main to render
ipcMain.on("save", (event, payload) => {
    saveBox(payload);
});

/////////////////////////////////////////////////////
// Local Functions
// #region
function createWindow () {
    // Create the browser window.
    window = new BrowserWindow({
        width: 1600,
        height: 1000,
        //frame: false, 
        icon: './icon.png',
        webPreferences: {
            nodeIntegration: true
        }
    });
    window.webContents.openDevTools();
    window.setMenu(null);

    window.on('closed', () => {
        console.log("Application closed");
    });

    // and load the index.html of the app.
    window.loadFile("./src/frontend/index.html");
}

function saveBox(box){
    // Write the plain json for testing
    fs.ensureFile(saveLocation+box.saveName+".json",()=>{
        fs.writeJSON(saveLocation+box.saveName+".json",box,{spaces:"\t",flag:"w+"},()=>{
            console.log("JSON has been saved!");
        });
    });
    
    let packedBox = packer.pack(box);

    // ensure the file exists
    fs.ensureFile(saveLocation+box.saveName+".box",()=>{
        // Write the data to the file
        fs.writeFile(saveLocation+box.saveName+".box",packedBox,{flag:"w+"},()=>{
            console.log("Box has been saved!");
        });
    });
}

function loadBoxes(){
    return new Promise(async function(resolve, reject) {
        let boxes = [];
        // read all the files in the directory
        fs.readdir(saveLocation,async (err,files)=>{
            // loop through all files
            for(let file of files){
                // Check if it's a .box file
                if(!file.includes(".box")){
                    continue;
                }
                boxes.push(packer.unpack(await fs.readFile(saveLocation+file)));
            }
            return resolve(boxes);
        });
    });
}

// #endregion
/////////////////////////////////////////////////////