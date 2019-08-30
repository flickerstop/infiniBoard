popup = function(){
    /**
     * Creates a popup to ask for box name and color
     * @param {function} callback Function to callback to when popup is submitted
     */
    function newBoardBox(callback){
        keyManager.newEvent(13,0,submit);
        // Add the ability to click the background to close the popup
        d3.select("#popup-blackout").on("click",closePopup);

        // Add the title
        d3.select("#popup-box").style("width","400px").style("padding","25px").append("div").html("Create an Infiniboard Box").attr("class","popup-title");

        // Add the row to name the box
        let boxNameRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        boxNameRow.append("div").html("Box Name:").attr("class","popup-inputInfo");
        boxNameRow.append("input").attr("id","popup-boardBoxName").attr("class","popup-input");

        // Add the row to name the first board
        let boardNameRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        boardNameRow.append("div").html("First Board Name:").attr("class","popup-inputInfo");
        boardNameRow.append("input").attr("id","popup-boardName").attr("class","popup-input");

        // Add the row to get the color for the first board
        let colorRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        colorRow.append("div").html("First board bg color:").attr("class","popup-inputInfo");
        colorRow.append("input").attr("id","popup-colorPicker").attr("class",`popup-input jscolor`).attr("value","202020");
        

        // Build the colour picker for background
        var input = document.getElementById('popup-colorPicker');
        var picker = new jscolor(input);

        // Set the background/border colour for the colour picker
        picker.backgroundColor = "var(--main)";
        picker.borderColor = "var(--highlight)";

        // Add the submit button
        let submitButton = d3.select("#popup-box").append("div");
        submitButton.html("Submit").attr("class","popup-submit button");

        // Add the error message
        d3.select("#popup-box").append("div").attr("id","popup-error");

        // Setup the onClick for the submit button
        submitButton.on("click",submit);

        // Unhide the popup
        d3.select("#popup").style("display",null);

        /**
         * Submit the given information if it passes checks
         */
        function submit(){
            let boxName = util.getValueId("popup-boardBoxName");
            let boardName = util.getValueId("popup-boardName");
            let bgcolor = util.getValueId("popup-colorPicker");
            // Make sure they wrote a name
            if(boxName == ""){
                d3.select("#popup-boardBoxName").style("background-color","#c0392b");
                d3.select("#popup-error").html("Please Write a Name for this Infiniboard Box!");
                return;
            }
            if(boardName == ""){
                d3.select("#popup-boardName").style("background-color","#c0392b");
                d3.select("#popup-error").html("Please Write a Name for the first Infiniboard!");
                return;
            }
            // Check if the name is already used
            if(boxManager.checkBoxNameUsed(boxName)){ 
                d3.select("#popup-boardBoxName").style("background-color","#c0392b");
                d3.select("#popup-error").html("This name is already in use!");
                return;
            }

            // Clear the key event for the enter key
            keyManager.clearEvent(13,0);
            // Turn off the popup
            d3.select("#popup").style("display","none");
            // Clear the popup
            d3.select("#popup-box").html(null);
            callback(boxName,boardName,bgcolor);
        }

        /**
         * Forget all the info given and close the popup
         */
        function closePopup(){
            d3.select("#popup-box").html(null);
            d3.select("#popup").style("display","none");
            keyManager.clearEvent(13,0);
        }
    }

    /**
     * Creates a popup
     * @param {object[]} lineBuffer Array that holds the line for the link
     * @param {function} callback Function to return the data to
     */
    function newBoard(lineBuffer,callback){
        keyManager.newEvent(13,0,submit);
        // Add the ability to click the background to close the popup
        d3.select("#popup-blackout").on("click",closePopup);

        // Add the title
        d3.select("#popup-box").style("width","400px").style("padding","25px").append("div").html("Create a New Infiniboard").attr("class","popup-title");

        // Add the row to show the dropdown list of previous boards
        let pastBoardsRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        pastBoardsRow.append("div").html("Select A Board:").attr("class","popup-inputInfo");
        let dropdown = pastBoardsRow.append("select").attr("id","popup-selectBoard").attr("class","popup-select");

        dropdown.append("option").attr("value",-1).html("(+) Add a new Infiniboard");
        for(let board of boxManager.getBox().boards){
            dropdown.append("option").attr("value",board.id).html(board.name);
        }

        // Add the row to name the board
        let boardNameRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        boardNameRow.append("div").html("Board Name:").attr("class","popup-inputInfo");
        let boardNameInput = boardNameRow.append("input").attr("id","popup-boardName").attr("class","popup-input");

        // Add the row to get the color for the first board
        let colorRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        colorRow.append("div").html("First board bg color:").attr("class","popup-inputInfo");
        let colorInput = colorRow.append("input").attr("id","popup-colorPicker").attr("class",`popup-input jscolor`).attr("value","202020");

        // Add the submit button
        let submitButton = d3.select("#popup-box").append("div");
        submitButton.html("Submit").attr("class","popup-submit");

        // Add the error message
        d3.select("#popup-box").append("div").attr("id","popup-error");

        // Setup the onClick for the submit button
        submitButton.on("click",submit);

        var input = document.getElementById('popup-colorPicker');
        var picker = new jscolor(input);

        picker.backgroundColor = "var(--main)";
        picker.borderColor = "var(--highlight)";

        dropdown.on("change",()=>{
            let value = util.getValueId("popup-selectBoard");

            if(value >= 0){
                let board = boxManager.getBoard(value);

                // Disable the rows 
                colorRow.attr("class","popup-row disabled");
                boardNameRow.attr("class","popup-row disabled");

                // Disable the inputs
                colorInput.property("disabled", true);
                boardNameInput.property("disabled", true);

                // Change the values to reflect the selected board
                boardNameInput.property("value",board.name);
                picker.fromString(board.bgcolor);
                //d3.select("#popup-colorPicker").property("value",board.bgcolor).style("background-color",board.bgcolor);
            }else{
                // Enable the rows 
                colorRow.attr("class","popup-row");
                boardNameRow.attr("class","popup-row");

                // Enable the inputs
                colorInput.property("disabled", false);
                boardNameInput.property("disabled", false);

                // Set back to default inputs
                boardNameInput.property("value","");
                picker.fromString("202020");
            }

        });



        // Unhide the popup
        d3.select("#popup").style("display",null);

        function submit(){
            let boardName = util.getValueId("popup-boardName");
            let bgcolor = util.getValueId("popup-colorPicker");
            let id = util.getValueId("popup-selectBoard");

            if(id == -1){
                // Make sure they wrote a name
                if(boardName == ""){
                    d3.select("#popup-boardName").style("background-color","#c0392b");
                    d3.select("#popup-error").html("Please Write a Name for the Infiniboard!");
                    return;
                }
                // Check if the name is already used
                if(boxManager.checkBoardNameUsed(boardName)){ 
                    d3.select("#popup-boardName").style("background-color","#c0392b");
                    d3.select("#popup-error").html("This name is already in use!");
                    return;
                }
            }
            
            keyManager.clearEvent(13,0);
            d3.select("#popup").style("display","none");
            d3.select("#popup-box").html(null);
            callback(id,boardName,bgcolor,lineBuffer);
        }

        function closePopup(){
            d3.select("#popup-box").html(null);
            d3.select("#popup").style("display","none");
            keyManager.clearEvent(13,0);
        }
    }

    function imageSelector(mouseCoords, callback){
        // Load all the images
        getImages();

        let currentSelected = -2;
        let boxes = [];
        let allImages = null;

        // Add the ability to click the background to close the popup
        d3.select("#popup-blackout").on("click",closePopup);

        // Resize the popup box
        let popupBox = d3.select("#popup-box").style("width","800px");

        // Create the navbar on the side
        let navBar = popupBox.append("div").attr("id","popup-navBar")

        // Add the row in the navbar for adding an image
        let navBarRow = navBar.append("div").attr("class","popup-navBar-row").attr("id","popup-navBar-item-2").on("click",()=>{return showImages(-2)});
        navBarRow.append("div").attr("class","popup-navBar-icon").style("background-image","url('./images/add_white.png')");
        navBarRow.append("div").attr("class","popup-navBar-boxName").html("Add New Image");

        // Add the row for all images
        navBarRow = navBar.append("div").attr("class","popup-navBar-row").attr("id","popup-navBar-item-1").on("click",()=>{return showImages(-1)});
        navBarRow.append("div").attr("class","popup-navBar-icon").style("background-image","url('./images/all_white.png')");
        navBarRow.append("div").attr("class","popup-navBar-boxName").html("All");

        // Go through all the boxes and add a row for each of the boxes the user has
        let boxCount = 0;
        for(let box of boxManager.getShelf()){
            navBarRow = navBar.append("div").attr("class","popup-navBar-row").attr("id","popup-navBar-item"+boxCount).on("click",function(temp){return function(){showImages(temp)}}(boxCount));
            navBarRow.append("div").attr("class","popup-navBar-icon").style("background-image","url('./images/box_white.png')");
            navBarRow.append("div").attr("class","popup-navBar-boxName").html(box.saveName);
            boxes.push({
                name: box.saveName,
                id: boxCount
            });
        
            // // If this box is the current box
            // if(box.saveName == boxManager.getBox().saveName){
            //     // Set the currently selected item to this one
            //     currentSelected = boxCount
            // }
            boxCount++;
        }

        // Create the div for the main content area
        let mainContent = popupBox.append("div").attr("id","popup-main").attr("class","scrollBarStyle");

        // Show the images for the current selected box
        showImages(currentSelected);

        // Unhide the popup
        d3.select("#popup").style("display",null);

        /**
         * Forget all the info given and close the popup
         */
        function closePopup(){
            d3.select("#popup-box").html(null);
            d3.select("#popup").style("display","none");
        }

        /**
         * Shows the images for the current box. If negative number, it's either all boxes or add images
         * @param {Number} boxId ID of the box to show
         */
        function showImages(boxId){
            mainContent.html(null);

            let imagePanel = mainContent.append("div");
            d3.select("#popup-navBar-item"+currentSelected).attr("class","popup-navBar-row");
            d3.select("#popup-navBar-item"+boxId).attr("class","popup-navBar-row selected");
            currentSelected = boxId;
            if(boxId == -2){ // Tab to upload images
                drawUploadImage();
            }else if(boxId == -1){ // Tab for all images
                for(let box of allImages){
                    for(let image of box.images){
                        // Create the image box
                        let imageBox = imagePanel.append("div").attr("class","popup-imageCard");
                        imageBox.append("div").attr("class","popup-imageCard-image").style("background-image",`url('../../${image.path}')`);

                        // If the name of the image is too long, shorten it
                        if(image.file.length >= 30){
                            imageBox.append("div").attr("class","popup-imageCard-text").html(`(...).${image.file.split(".")[1]}`);
                        }else{
                            imageBox.append("div").attr("class","popup-imageCard-text").html(image.file);
                        }  
                        // When clicking the image, return the image path
                        imageBox.on("click",()=>{
                            closePopup();
                            callback({
                                x: mouseCoords.x,
                                y: mouseCoords.y,
                                path: image.absolutePath,
                                width: image.width,
                                height: image.height
                            });
                        })
                    }
                }
            }else{
                let boxName = boxes.find(x=>x.id == boxId).name;

                let images = allImages.find(x=>x.boxName == boxName)
                
                if(images == undefined){
                    
                }else{
                    for(let image of images.images){
                        let imageBox = imagePanel.append("div").attr("class","popup-imageCard");
                        imageBox.append("div").attr("class","popup-imageCard-image").style("background-image",`url('../../${image.path}')`);
                        if(image.file.length >= 30){
                            imageBox.append("div").attr("class","popup-imageCard-text").html(`(...).${image.file.split(".")[1]}`);
                        }else{
                            imageBox.append("div").attr("class","popup-imageCard-text").html(image.file);
                        }  
                        imageBox.on("click",()=>{
                            closePopup();
                            callback({
                                x: mouseCoords.x,
                                y: mouseCoords.y,
                                path: image.absolutePath,
                                width: image.width,
                                height: image.height
                            });
                        })
                    }
                }
            }
        }

        /**
         * Draws the "Upload Images" on the main panel
         */
        function drawUploadImage(){
            mainContent.html(null);
            let dragArea = mainContent.append("div").attr("id","popup-dropArea");

            let infoRow = dragArea.append("div").attr("id","popup-dropArea-infoRow");
            infoRow.append("div").attr("id","popup-dropArea-infoRow-image").style("background-image","url('./images/upload_white.png')");
            infoRow.append("div").attr("id","popup-dropArea-infoRow-text").html("Drag & Drop Files Here");

            mainContent.append("div")
                .attr("id","popup-dropArea-uploadButton")
                .html("Open the file Browser")
                .on("click",()=>{
                    document.getElementById('popup-dropArea-input').click();
                });

            dragArea.append("input")
                .attr("multiple",true)
                .attr("type","file")
                .attr("accept","image/*")
                .attr("id","popup-dropArea-input")
                .on("change",()=>{
                    dropManager.handleDrop().then((files)=>{
                        if(files.length == 1){
                            d3.select("#popup-dropArea-uploadCount").html(`${files.length} file has been loaded...`)
                                .style("opacity",1)
                                .transition()
                                .duration(2000)
                                .transition()
                                .duration(1000)
                                .style("opacity",0);
                        }else{
                            d3.select("#popup-dropArea-uploadCount").html(`${files.length} files have been loaded...`)
                                .style("opacity",1)
                                .transition()
                                .duration(2000)
                                .transition()
                                .duration(1000)
                                .style("opacity",0);
                        }
                        getImages();
                    })
                });

            mainContent.append("div").attr("id","popup-dropArea-uploadCount").html("5 files loaded");

            // When dragging over/on the area, set the background to blue
            dragArea.on("dragenter",()=>{
                dragArea.attr("class","popup-dropArea-enter");
            });
            dragArea.on("dragover",()=>{
                dragArea.attr("class","popup-dropArea-enter");
            });

            // When leaving/dropped reset the background
            dragArea.on("dragleave",()=>{
                dragArea.attr("class",null);
            });
            dragArea.on("drop",()=>{
                dragArea.attr("class",null);
            });

        }


        /**
         * Ask the main process for the images
         */
        function getImages(){
            comm.sendSync("getImages","please").then((images)=>{
                console.log(images);
                allImages = images;
            });
        }
    }

    return{
        newBoardBox:newBoardBox,
        newBoard:newBoard,
        imageSelector:imageSelector
    }
}();