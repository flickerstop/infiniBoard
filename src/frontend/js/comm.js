comm = function(){
    let ipcRenderer = require("electron").ipcRenderer;

    function sendMessage(channel,message){
        ipcRenderer.send(channel, message);
    }

    //////////////////////////
    // Messages to wait for
    ipcRenderer.on('loadedData', (event, message) => {
        mainMenu.setLoadBoxes(message);
    });
    //////////////////////////

    return {
        sendMessage:sendMessage
    }
}();