/////////////////////////////////////////////////////
// File Name: app.js


/////////////////////////////////////////////////////
// Requires
// #region
const { app, BrowserWindow, globalShortcut  } = require('electron');
const console = require("./modules/console/console.js");
const fs = require("fs-extra");
const packer = require("./modules/packer/packer");
const ipc = require("./modules/ipc/ipc");
const sizeOf = require('image-size');
const absolutePath = require('path').resolve;

const saveLocation = "./boxes/";//(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + "/.local/share")).replace(/\\/gm,"/")+"/infiniboard/boxes/";
// #endregion
/////////////////////////////////////////////////////
// Vars
// #region
let window = null;

let appDataPath = app.getPath("userData");
let settingsFilePath = appDataPath + "/settings.json";

let stateChangeTimeout;
// #endregion
/////////////////////////////////////////////////////
// Main Process
console.log("Starting application");


app.on('ready', ()=>{
    createWindow();
});


// Calls from main to render
ipc.on('save', (event, payload) => {
    saveBox(payload);
});

// Loads boxes from directory and sends them to renderer 
ipc.on('getBoxes', (event) => {
    loadBoxes().then((boxes)=>{
        event.reply('getBoxes-reply', boxes);
    });
});

ipc.on('updateSettings', (event, payload) => {
    // Get the current saved settings
    let currentSettings = getSettings();

    // Update the setting
    currentSettings[payload.settingKey] = payload.settingValue;

    // Save the file again
    fs.writeFileSync(settingsFilePath,JSON.stringify(currentSettings));
});

ipc.onReply("getSettings",(payload)=>{
    return new Promise(async function(resolve, reject) {
        return resolve(getSettings());
    });
})
ipc.on('windowsButtons', (event, payload) => {
    switch(payload){
        case "close":
            app.quit();
            break;
        case "minimize":
            window.minimize();
            break;
        case "maximize":
            if(window.isMaximized()){
                window.unmaximize();
            }else{
                window.maximize()
            }
            break;
        default:
            console.error("uhh, wtf","windows buttons channel was passed something odd: "+payload);
            break;
    }
});

ipc.onReply("fileUpload",(payload)=>{
    return new Promise(async function(resolve, reject) {
        let folder = payload.box;
        let files = payload.files;
        
        let savedFiles = []
        // Check if the folder for the files exists
        for(let file of files){
            await fs.ensureDir(`${saveLocation}/images/${folder}/`);
            await fs.copyFile(file.path,`${saveLocation}/images/${folder}/${file.name}`);

            let dimensions = await sizeOf(`${saveLocation}images/${folder}/${file.name}`);
            savedFiles.push({
                file: escape(file.name),
                path: absolutePath(`${saveLocation}images/${folder}/${file.name}`),
                width: dimensions.width,
                height: dimensions.height
            });

        }
        return resolve(savedFiles);
    });    
})

ipc.onReply("getImages",(payload)=>{
    return new Promise(async function(resolve, reject) {
        let toSend = [];
        let dir = await fs.readdir(`${saveLocation}/images/`);

        for(let folder of dir){
            let files = await fs.readdir(`${saveLocation}/images/${folder}`);
            
            let boxData = {
                boxName: folder,
                images: []
            }

            for(let file of files){
                let dimensions = await sizeOf(`${saveLocation}images/${folder}/${file}`);
                boxData.images.push({
                    file: escape(file),
                    path: escape(`${saveLocation}images/${folder}/${file}`),
                    absolutePath: absolutePath(`${saveLocation}images/${folder}/${file}`),
                    width: dimensions.width,
                    height: dimensions.height
                });
            }
            toSend.push(boxData);
        }

        return resolve(toSend);
    });
})

/////////////////////////////////////////////////////
// Local Functions
// #region
function createWindow () {

    // Get the saved settings
    let currentSettings = getSettings();
    
    // Create the browser window.
    window = new BrowserWindow({
        width: currentSettings.windowState.width,
        height: currentSettings.windowState.height,
        x: currentSettings.windowState.x,
        y: currentSettings.windowState.y,
        frame: false, 
        icon: './src/frontend/images/box.png',
        webPreferences: {
            nodeIntegration: true
        }
    });
    
    // If window was maximized, then maximize...
    if (currentSettings.windowState.isMaximized){
        window.maximize();
    }

    ipc.init(window);

    //window.webContents.openDevTools();
    window.setMenu(null);

    window.on('closed', () => {
        console.log("Application closed");
    });

    // and load the index.html of the app.
    window.loadFile("./src/frontend/index.html");

    //***//
    globalShortcut.register('f11', function() {
        console.log('f11 is pressed')
        window.webContents.openDevTools();
    });
	globalShortcut.register('f5', function() {
		console.log('f5 is pressed')
		window.reload()
    });
    
    // Add event listeners for changes to window state (position, size)
    window.on('resize', ()=> {
        // Basically if nothing was recieved on the listener for 100ms, the save function is called
        clearTimeout(stateChangeTimeout); // clear existing timeout function
        stateChangeTimeout = setTimeout(saveWindowState, 100 ,window.getBounds(),window.isMaximized()); // Set Timeout Function with delay of 100 seconds
    });
    window.on('move', ()=> {
        clearTimeout(stateChangeTimeout);
        stateChangeTimeout = setTimeout(saveWindowState, 100 ,window.getBounds(),window.isMaximized());
    });
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
        // make sure the boxes folder exists first
        fs.ensureDirSync(saveLocation);


        let boxes = [];
        // read all the files in the directory
        fs.readdir(saveLocation,async (err,files)=>{

            // if there are no boxes created, return an empty string
            if(files.length == 0){
                return resolve(boxes);
            }
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

function getSettings(){

    let defaults = {
        windowState: {
            height:1000,
            width:1600,
            x:160,
            y:20,
            isMaximized:false,
        },
        theme: 1,
    }
    try {
        let currentSettings =  JSON.parse(fs.readFileSync(settingsFilePath));
        for (const [key, value] of Object.entries(defaults)) {
            if (!currentSettings.hasOwnProperty(key) || currentSettings[key] == null || currentSettings[key] == undefined){
                currentSettings[key] = value;
            }
        }
        return currentSettings;
    } catch (error) {
        return defaults;
    }
}

function saveWindowState(winBounds, isMaximized){
    let currentSettings = getSettings();

    winBounds.isMaximized = isMaximized;

    currentSettings["windowState"] = winBounds;
    fs.writeFileSync(settingsFilePath,JSON.stringify(currentSettings));
}
// #endregion
/////////////////////////////////////////////////////