popup = function(){
    /**
     * Creates a popup to ask for box name and color
     * @param {function} callback Function to callback to when popup is submitted
     */
    function newBoardBox(callback){
        $("#popup-box").load("./js/popup/newBox.html",()=>{
            newBoxPopup.init(callback);
        });
    }

    /**
     * Creates a popup
     * @param {object[]} lineBuffer Array that holds the line for the link
     * @param {function} callback Function to return the data to
     */
    function newBoard(callback){
        $("#popup-box").load("./js/popup/newBoard.html",()=>{
            newBoardPopup.init(callback);
        });
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