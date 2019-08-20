/////////////////////////////////////////////////////
// File Name: boxManager.js


/////////////////////////////////////////////////////
// Requires
// #region


// #endregion
/////////////////////////////////////////////////////
// Vars
// #region


// #endregion
/////////////////////////////////////////////////////
// Exported Class
boxManager = function(){
    let currentBox = null;

    let shelf = null;

    /**
     * Sets the loaded boxes to the passed object
     * @param {object} boxes Array of all saved boxes
     */
    function setShelf(boxes){
        shelf=boxes;
    }

    function getShelf(){
        return shelf;
    }

    /**
     * Button function for when selecting "new boardbox"
     */
    function createBox(callback){
        popup.newBoardBox((boardBoxName,boardName,bgColor)=>{
            console.log({
                boxName: boardBoxName,
                boardName: boardName,
                bgColor: bgColor
            });

            // create the box for all the boards
            currentBox = {
                saveName: boardBoxName,
                lastUsed: Date.now(),
                boardCount: 0,
                boards: []
            };

            // Create the first board to put in the box
            let id = newBoard(boardName,bgColor);

            callback(id);
        });
    }

    /**
     * Sets the current box to the passed box
     * @param {Object} newBox New box to set
     */
    function setBox(newBox){
        currentBox = newBox;
    }

    /**
     * Get the current box
     */
    function getBox(){
        return currentBox;
    }

    /**
     * Creates a new board in the current boardbox
     * @param {String} boardName Name for the new board
     * @param {String} bgColour Colour for the background
     */
    function newBoard(boardName,bgColour){
        let id = currentBox.boardCount++;

        currentBox.boards.push({
            id: id,
            name: boardName,
            bgType: 0, // make this do something like 0 -> solid color, 1 -> grid etc
            bgColour: bgColour,
            lines: [],
            pens:defaultPens()
        });

        return id;
    }

    /**
     * Passes back the board with the id given
     * @param {Number} id Id of the board to get
     */
    function getBoard(id){
        return currentBox.boards.find(x=>x.id == id);
    }

    /**
     * Checks to see if this name is good to use. True = Already used
     * @param {String} newName Name of the box to Check
     */
    function checkBoxNameUsed(newName){
        for(let box of shelf){
            if(box.saveName == newName){
                return true;
            }
        }
        return false;
    }

    /**
     * Checks to see if a board name is already used, TRUE = used
     * @param {String} boardName Name of the board to check
     */
    function checkBoardNameUsed(boardName){
        for(let board of currentBox.boards){
            if(boardName == board.name){
                return true;
            }
        }
        return false;
    }

    function defaultPens(){
        return ["#ffffff","#2ecc71","#3498db","#9b59b6","#34495e","#f1c40f","#e67e22","#e74c3c","#000000","#bada55"];
    }

    return {
        setBox:setBox,
        getBox:getBox,
        createBox:createBox,
        newBoard:newBoard,
        getBoard:getBoard,
        setShelf:setShelf,
        getShelf:getShelf,
        checkBoxNameUsed:checkBoxNameUsed,
        checkBoardNameUsed:checkBoardNameUsed
    }
}();
/////////////////////////////////////////////////////
// Local Functions
// #region


// #endregion
/////////////////////////////////////////////////////