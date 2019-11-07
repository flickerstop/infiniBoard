/////////////////////////////////////////////////////
// File Name: boxManager.js


/**
 * The boxManager static class is used for managing the users boxes a
 * and handling the creation of new boxes and boards.
 */
class boxManager {
    // Private fields
    static currentBox = null;
    static shelf = null;

    /**
     * Sets the loaded boxes to the passed object
     * @param {object} boxes Array of all saved boxes
     */
    static setShelf(boxes){
        this.shelf=boxes;
    }

    /**
     * Get the entire shelf of boxes
     */
    static getShelf(){
        return this.shelf;
    }

    /**
     * Button function for when selecting "new boardbox"
     */
    static createBox(newBox,newBoard){
        console.log({
            newBox: newBox,
            newBoard: newBoard
        });

        // create the box for all the boards
        this.currentBox = {
            saveName: newBox.name,
            lastUsed: Date.now(),
            boardCount: 0,
            boards: []
        };

        // Create the first board to put in the box
        createBoard(newBoard);

        // Add the new box to the shelf
        this.shelf.push(this.currentBox);
    }

    /**
     * Sets the current box to the passed box
     * @param {Object} newBox New box to set
     */
    static setBox(boxName){
        this.currentBox = this.shelf.find(box => box.saveName == boxName);
    }

    /**
     * Get the current box
     */
    static getBox(){
        return this.currentBox;
    }

    /**
     * Creates a new board in the current boardbox
     * @param {String} boardName Name for the new board
     * @param {String} bgcolor color for the background
     */
    static createBoard(boardData){
        let id = this.currentBox.boardCount++;

        this.currentBox.boards.push({
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


    static newLayer(boardId){
        let id = this.currentBox.boards.find(x=>x.id == boardId).layerCounter++;
        this.currentBox.boards.find(x=>x.id == boardId).layers.push({
            name: this.currentBox.boards.find(x=>x.id == boardId).layerCounter+1,
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
    static getBoard(id){
        return this.currentBox.boards.find(x=>x.id == id);
    }

    /**
     * Checks to see if this name is good to use. True = Already used
     * @param {String} newName Name of the box to Check
     */
    static checkBoxNameUsed(newName){
        for(let box of this.shelf){
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
    static checkBoardNameUsed(boardName){
        for(let board of this.currentBox.boards){
            if(boardName == board.name){
                return true;
            }
        }
        return false;
    }

    /**
     * Gets the 10 default pen colours
     */
    static defaultPens(){
        return ["#ffffff","#2ecc71","#3498db","#9b59b6","#34495e","#f1c40f","#e67e22","#e74c3c","#000000","#bada55"];
    }

    // return {
    //     setBox:setBox,
    //     getBox:getBox,
    //     createBox:createBox,
    //     newBoard:createBoard,
    //     getBoard:getBoard,
    //     setShelf:setShelf,
    //     getShelf:getShelf,
    //     checkBoxNameUsed:checkBoxNameUsed,
    //     checkBoardNameUsed:checkBoardNameUsed,
    //     newLayer:newLayer
    // }
}

/////////////////////////////////////////////////////
// Local Functions
// #region


// #endregion
/////////////////////////////////////////////////////