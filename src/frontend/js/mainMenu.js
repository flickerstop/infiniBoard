mainMenu = function(){

    /**
     * TODO
     * Add the most recent box to the top in it's own section then list the past boxes below
     */

    let isBoxesLoaded = false;
    let isBoxesDrawn = false;
    /**
     * Does nothing atm
     */
    function init(){
        comm.sendSync("getBoxes","please").then((boxes)=>{
            boxManager.setShelf(boxes);
        });

        let loadingInterval = setInterval(()=>{
            //TODO Add loading settings
            // Check if the boxes have been loaded from file
            if(boxManager.getShelf()!= null && !isBoxesLoaded){
                loadMyBoxes();
                isBoxesLoaded = true;
                d3.select("#splashScreen-middleCard-text").html("Rendering Previews...");
            }
            // If loaded, check if the boxes have been draw
            if(isBoxesDrawn){
                // Fade out
                d3.select("#splashScreen").transition().duration(600).style("opacity",0).transition().duration(0).style("display","none");
                // set to myboxes view
                mainMenu.changeState('myBoxes');
                // clear this interval
                clearInterval(loadingInterval);
            }
        },100)
    }

    function changeState(stateID, boxName){
        d3.selectAll(".stateSection").style("display","none");
        d3.select("#" + stateID).style("display",null);
        
        switch (stateID) {
            case "home":
                d3.select("#menuBar").style("display",null);
                break;
            case "myBoxes":

                break;
            case "whiteboard":
                d3.select("#menuBar").style("display","none");
                boxManager.setBox(boxName)
                whiteboard.init(0);
                break;
            case "settings":

                break;
            default:
                break;
        }
    }

    function createNewBox(newBox, newBoard){
        boxManager.createBox(newBox, newBoard);
        changeState("whiteboard", newBox.name);
    }

    /**
     * Menu Bar Option to show list of users boxes
     */
    function loadMyBoxes(){
        let boxesArea = d3.select("#boxList").html("");


        let sortedBoxes = boxManager.getShelf().sort(sortTime);


        //boxesArea.append("h2").html("My Boxes");
        let isMostRecent = true;
        for(let box of sortedBoxes){
            let boxItem = null;

            if(isMostRecent){
                // Add main Box Item div
                boxItem = d3.select("#mostRecentBox").append("div").attr("class","boxList-boxItem").style("background-color","#"+box.boards[0].bgcolor).style("float","none");
                isMostRecent = false;
            }else{
                // Add main Box Item div
                boxItem = boxesArea.append("div").attr("class","boxList-boxItem").style("background-color","#"+box.boards[0].bgcolor);
            }

            // Draw svg Preview
            let svg = boxItem.append("svg").attr("viewBox",`0,0,1000,1000`).attr("class","boxList-boxItem-svg-preview");

            // Add the background to the card
            whiteboard.generateBackground(box.boards[0],svg);

            // Add the objects to the card
            for(let layer of box.boards[0].layers){
                for(let object of layer.objects){
                    whiteboard.drawLine(object,svg,false);
                }
            }
            
            
            // Add a dimmer for the svg
            boxItem.append("div").attr("class","boxList-boxItem-svg-dimmer");
           
            let numberOfLines = 0;
            let boxInfo = boxItem.append("div").attr("class","boxList-boxItem-Info");
            // Show Box info (Name, Details, Date)
            boxInfo.append("div").attr("class","boxList-boxItem-Info-Name").append("span")
                .html(box.saveName);

            // Count the number of lines
            box.boards.forEach(board => board.layers.forEach(layer => numberOfLines += layer.objects.length));

            // Add the number of lines to the card
            boxInfo.append("div").attr("class","boxList-boxItem-Info-Details").append("span")
                .html(numberOfLines + ` Line${numberOfLines > 1 ? "s" : ""}` + "<br />"
                    + box.boardCount + ` Board${box.boardCount > 1 ? "s" : ""}`);

            // Add the time to the card
            boxInfo.append("div").attr("class","boxList-boxItem-Info-Date").append("span")
                .html(new Date(box.lastUsed).toLocaleString());  

            // Add on click event to open box
            boxItem.on("click",()=>{
                changeState("whiteboard", box.saveName);
            });
        }
        isBoxesDrawn = true;

        function sortTime(a,b) {
            if (a.lastUsed > b.lastUsed)
                return -1;
            if (a.lastUsed < b.lastUsed)
                return 1;
            return 0;
        }
    }

    function setTheme(themeID){
        d3.selectAll(".settings-themeRow").style("opacity",null);
        d3.selectAll(".settings-themeRow-checkBox").style("background-image",null);
        if(themeID == 0){ // Dark Theme
            d3.select("#settings-darkThemeRow").style("opacity","1");
            d3.select("#settings-darkThemeRow-checkBox").style("background-image","url('./images/x_white.png'");
            d3.select("#themeStyle").html(`
            :root {
            
                --highlight: rgb(103, 103, 103);
    
                --titlebar: rgb(29, 29, 29); 
                --sidebar: rgb(37, 37, 37); 
                --main: rgb(49, 49, 49); 
    
                --accent: #e78665;
                --text: #ecf0f1;
                --green: #27ae60;
                --red: #e74c3c;
                --blue: #3498db;
                --darkblue: #2980b9;
                --image-filter: invert(0);
            }`);
        }else if(themeID == 1){ // Light Theme
            d3.select("#settings-lightThemeRow").style("opacity","1");
            d3.select("#settings-lightThemeRow-checkBox").style("background-image","url('./images/x_white.png'");
            d3.select("#themeStyle").html(`
            :root {
                
                --highlight: #ffffff;
    
                --titlebar: #a9a9a9; 
                --sidebar: #bdc3c7; 
                --main: #ecf0f1; 
    
                --text: #000000;
                --green: #27ae60;
                --red: #e74c3c;
                --blue: #3498db;
                --darkblue: #2980b9;
                --image-filter: invert(1);
            }`);
        }
    }

    
    return {
        init:init,
        createNewBox:createNewBox,
        changeState:changeState,
        setTheme:setTheme
    }
}();