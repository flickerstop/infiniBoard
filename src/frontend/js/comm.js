comm = function(){
    let ipcRenderer = require("electron").ipcRenderer;

    function sendMessage(channel,message){
        ipcRenderer.send(channel, message);
    }

    //////////////////////////
    // Messages to wait for
    ipcRenderer.on('getBoxes-reply', (event, message) => {
        mainMenu.setLoadBoxes(message);
        mainMenu.loadMenu();
    });
    //////////////////////////

    return {
        sendMessage:sendMessage
    }
}();