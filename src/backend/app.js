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
        
        console.object(files);
        // Check if the folder for the files exists
        for(let file of files){
            await fs.ensureDir(`${saveLocation}/images/${folder}/`);
            await fs.copyFile(file.path,`${saveLocation}/images/${folder}/${file.name}`);
        }
        return resolve(files.length);
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
                boxData.images.push({
                    file: escape(file),
                    path: escape(`${saveLocation}images/${folder}/${file}`)
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
    // Create the browser window.
    window = new BrowserWindow({
        width: 1600,
        height: 1000,
        frame: false, 
        icon: './icon.png',
        webPreferences: {
            nodeIntegration: true
        }
    });

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