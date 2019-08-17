mainMenu = function(){

    let loadedBoxes = null;

    /**
     * Does nothing atm
     */
    function init(){

    }

    /**
     * Button function for when selecting "new boardbox"
     */
    function createBoardBox(){
        popup.newBoardBox((boardName,bgcolor)=>{
            //NOTE color can't be set correctly ATM
            console.log(boardName + " " + bgcolor);
            whiteboard.newBoardBox(boardName,bgcolor);
            switchToWhiteboard();
            whiteboard.init();
        });
    }

    /**
     * Hides the menu to show the whiteboard
     */
    function switchToWhiteboard(){
        d3.select("#mainMenu").style("display","none");
        d3.select("#loadBox").style("display","none");
        d3.select("#whiteboard").style("display",null);
    }

    /**
     * Menu option to load a previous box
     */
    function loadMenu(){
        // Hide the main menu but show the loading boxes screen
        d3.select("#mainMenu").style("display","none");
        d3.select("#loadBox").style("display",null);

        // For each box that was has been previously saved
        for(let box of loadedBoxes){
            let numberOfLines = 0;
            // Calculate number of lines
            for(let board of box.boards){
                numberOfLines += board.lines.length;
            }

            let tableRow = d3.select("#loadBox-table").append("tr");
            tableRow.append("td").html(box.saveName);
            tableRow.append("td").html(box.lastUsed); //TODO convert to date
            tableRow.append("td").html(box.boardCount);
            tableRow.append("td").html(numberOfLines);
            tableRow.on("click",()=>{
                return loadBox(box);
            });
        }
    }

    /**
     * Loads the passed boardbox, loads up the first inifiboard by default
     * @param {object} box Box object to load up
     */
    function loadBox(box){
        console.log(box);
        whiteboard.setBoardBox(box);
        switchToWhiteboard();
        whiteboard.init();
    }

    /**
     * Sets the loaded boxes to the passed object
     * @param {object} boxes Array of all saved boxes
     */
    function setLoadBoxes(boxes){
        loadedBoxes=boxes;
    }

    /**
     * Checks to see if this name is good to use. True = Already used
     * @param {String} newName Name of the box to Check
     */
    function checkBoxNameUsed(newName){
        for(let box of loadedBoxes){
            if(box.saveName == newName){
                return true;
            }
        }
        return false;
    }

    return {
        init:init,
        createBoardBox:createBoardBox,
        loadMenu:loadMenu,
        setLoadBoxes:setLoadBoxes,
        checkBoxNameUsed:checkBoxNameUsed
    }
}();