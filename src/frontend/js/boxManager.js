/////////////////////////////////////////////////////
// File Name: boxManager.js


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

    /**
     * Get the entire shelf of boxes
     */
    function getShelf(){
        return shelf;
    }

    /**
     * Button function for when selecting "new boardbox"
     */
    function createBox(newBox,newBoard){
        console.log({
            newBox: newBox,
            newBoard: newBoard
        });

        // create the box for all the boards
        currentBox = {
            saveName: newBox.name,
            lastUsed: Date.now(),
            boardCount: 0,
            boards: []
        };

        // Create the first board to put in the box
        createBoard(newBoard);

        // Add the new box to the shelf
        shelf.push(currentBox);
    }

    /**
     * Sets the current box to the passed box
     * @param {Object} newBox New box to set
     */
    function setBox(boxName){
        currentBox = shelf.find(box => box.saveName == boxName);
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
     * @param {String} bgcolor color for the background
     */
    function createBoard(boardData){
        let id = currentBox.boardCount++;

        currentBox.boards.push({
            id: id,
            name: boardData.name,
            bgType: boardData.bgType, // make this do something like 0 -> solid color, 1 -> grid etc
            bgSpacing: boardData.spacing,
            bgcolor: boardData.background,
            fgcolor: boardData.foreground,
            bgThickness: boardData.thickness,
            idCounter:0,
            layerCounter: 0,
            pens:defaultPens(),
            history: [],
            layers: [],
            boardType: 0 // Type of board, 0 is default, 1 is dnd
        });

        newLayer(id);

        return id;
    }


    function newLayer(boardId){
        let id = currentBox.boards.find(x=>x.id == boardId).layerCounter++;
        currentBox.boards.find(x=>x.id == boardId).layers.push({
            name: currentBox.boards.find(x=>x.id == boardId).layerCounter+1,
            objects: [],
            isVisible: true,
            id: id
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

    /**
     * Gets the 10 default pen colours
     */
    function defaultPens(){
        return ["#ffffff","#2ecc71","#3498db","#9b59b6","#34495e","#f1c40f","#e67e22","#e74c3c","#000000","#bada55"];
    }

    return {
        setBox:setBox,
        getBox:getBox,
        createBox:createBox,
        newBoard:createBoard,
        getBoard:getBoard,
        setShelf:setShelf,
        getShelf:getShelf,
        checkBoxNameUsed:checkBoxNameUsed,
        checkBoardNameUsed:checkBoardNameUsed,
        newLayer:newLayer
    }
}();
/////////////////////////////////////////////////////
// Local Functions
// #region


// #endregion
/////////////////////////////////////////////////////