comm = function(){
    let ipcRenderer = require("electron").ipcRenderer;


    /**
     * Sends a message to the main process using the passed channel
     * @param {String} channel Channel to send the message on
     * @param {Object} message Message to send on the channel
     */
    function sendMessage(channel,message){
        ipcRenderer.send(channel, message);
    }

    /**
     * Sends a message to the pass channel, but waits for a reply and sends the reply back in a promise
     * @param {String} channel Channel to send the message on
     * @param {Object} message Message to send on the channel
     */
    function sendSync(channel,message){
        return new Promise(async function(resolve, reject) {
            // Send the message and pass what channel to reply on
            ipcRenderer.send(channel, {replyChannel:channel+"-reply",payload:message});
            
            // Wait for the specific channel once
            ipcRenderer.once(channel+"-reply",(event, message)=>{
                return resolve(message);
            })
        }); 
    }

    //////////////////////////
    // Messages to wait for
    ipcRenderer.on('getBoxes-reply', (event, message) => {
        boxManager.setShelf(message);
        mainMenu.loadMenu();
    });
    //////////////////////////

    return {
        sendMessage:sendMessage,
        sendSync:sendSync
    }
}();