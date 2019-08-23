dropManager = function(){


    function allowDrop(event) {
        event.preventDefault();
    }

    /**
     * Handles the event when a file is dropped onto an input
     */
    function handleDrop(){
        return new Promise(async function(resolve, reject) {
            // Get the current box so we know where to save the files
            let toSend = {
                box: boxManager.getBox().saveName,
                files: []
            }
            // For each file that was dropped
            for(let file of event.target.files){
                toSend.files.push({
                    path:file.path,
                    name:file.name
                });
            }
            // Send the files to be uploaded
            comm.sendSync("fileUpload",toSend).then((files)=>{
                return resolve(files);
            });
        });
    }

    return{
        allowDrop:allowDrop,
        handleDrop:handleDrop
    }
}();