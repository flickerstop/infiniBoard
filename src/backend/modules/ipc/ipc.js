/////////////////////////////////////////////////////
// File Name: comm.js


/////////////////////////////////////////////////////
// Requires
// #region
const {ipcMain} = require('electron');

// #endregion
/////////////////////////////////////////////////////
// Vars
// #region
let window = null;

// #endregion
/////////////////////////////////////////////////////
// Exported Class
module.exports = class {
    static init(newWindow){
        window = newWindow;
    }

    static on(channel, callback){
        ipcMain.on(channel, (event, payload) => {
            callback(event,payload);
        });
    }

    static clear(channel){
        ipcMain.removeAllListeners(channel);
    }

    static onReply(channel,promise){
        ipcMain.on(channel, (event, payload) => {
            promise(payload.payload).then((replyMessage)=>{
                event.reply(payload.replyChannel,replyMessage);
            });
        });
    }

    static sendMessage(channel,message){
        window.webContents.send(channel, message);
    }
}
/////////////////////////////////////////////////////
// Local Functions
// #region


// #endregion
/////////////////////////////////////////////////////