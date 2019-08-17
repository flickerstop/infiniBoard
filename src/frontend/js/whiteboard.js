whiteboard = function(){

    //NOTE to do undo/redo:
    /**
     * Have an array that just holds multiple copies of the "lines" array.
     * Every time a new line is draw, push the new "lines" array to the undo buffer
     * maybe only hold like 30 of the last actions to save space?
     * Seems kinda hacky, but it will work!
     */

    let svg = null; // hold d3 object of the svg
    let isDrawing = false; // Is the user currently drawing
    let buffer = []; // Buffer for the currently drawing ling
    let lastPointTime = 0; // Time of the last drawing point
    
    let boardbox = null; // the current board box
    let thisBoard = null; // The current infiniboard that's being drawn on

    let currentTool = 0; // Current tool being used
    // 0 -> Pen
    // 1 -> Hand
    let currentStroke = 2; // Current selected stroke
    let currentColor = "white"; // Current selected colour

    let mouseDownPoint = null; // Point where the mouse was pressed down

    let viewbox = null; // Current viewbox

    let autoSave = { // object for the 10 second autosave
        isSaved:true,
        msBetweenSave: 10000,
        lastSaveTime:null,
        saveTimeout: null
    }

    /**
     * Function that runs to initialize the whiteboard and load the current board
     */
    function init(){
        // Create the current viewbox
        viewbox = {
            x:0,
            y:0,
            h:getSVGSize().h,
            w:getSVGSize().w
        }


        // Create the svg
        svg = d3.select("#drawingBoard").append("svg")
        .attr("id","drawingBoard-svg")
        .attr("width", "100%")
        .attr("height", "100%");

        // Update the viewbox html with the viewbox object
        updateViewbox();

        
        // Add the group element that holds the temp line when drawing
        svg.append("g").attr("id","temp-line");

        // draw all the lines in the current whiteboard
        for(line of thisBoard.lines){
            drawLine(svg,line.dots,line.stroke,line.color,line.type);
        }
        
        //TODO set the background colour
        
        // When the mouse is down, set the drawing to true
        svg.on("mousedown",mouseDown);

        // When the mouse is up, stop drawing
        svg.on("mouseup",mouseUp)

        svg.on("mousemove", mouseMove);
    
    }

    
    /**
     * Draws a line on the passed svg
     * @param {Object} svg d3 object for the svg
     * @param {Array} buffer Array holding the dots for the line
     * @param {Number} stroke Size of the stroke for this line
     * @param {String} colour Colour of the line 
     * @param {Number} type Type of the line
     */
    function drawLine(svg,buffer,stroke,colour,type){
        //TODO draw the line according to line "type"
        //FIXME does not draw line of 1 length, maybe draw a dot instead?

        // https://www.d3indepth.com/shapes/#line-generator
        // https://github.com/d3/d3-shape/blob/v1.3.4/README.md#line
        // https://www.dashingd3js.com/svg-paths-and-d3js

        // Create the line
        let line = d3.line().curve(d3.curveCardinal);

        // for every x and y, set the value to (object passed).x
        line.x((d)=>{
            return d.x;
        });
        line.y((d)=>{
            return d.y;
        });

        // Append the line
        svg.append("path")
            .attr("d", line(buffer))
            .attr("stroke", colour)
            .attr("stroke-width", stroke)
            .attr("fill", "none");

        // Add the buffer to the whiteboard object

    }

    /**
     * Gets the size of the svg from d3
     */
    function getSVGSize(){
        return {
            w:d3.select("#drawingBoard").node().getBoundingClientRect().width,
            h:d3.select("#drawingBoard").node().getBoundingClientRect().height
        }
    }

    /**
     * Update the HTML viewbox with the data from the object
     */
    function updateViewbox(){
        svg.attr("viewBox",`${viewbox.x},${viewbox.y},${viewbox.w},${viewbox.h}`);
    }
    //////////////////////////
    // Mouse Actions
    // #region

    function mouseDown(){
        if(isPen()){
            isDrawing = true;
        }
        if(isHand()){
            // Get the current mouse coordinates
            let coordinates= d3.mouse(d3.event.currentTarget);
            mouseDownPoint = {
                x:coordinates[0],
                y:coordinates[1],
                vx: viewbox.x,
                vy: viewbox.y
            };
        }
    }

    function mouseUp(){
        if(isPen()){
            //FIXME Saves line of 0 length, should always be min 1
            isDrawing = false;
            // Draw the line in the buffer
            drawLine(svg,buffer,currentStroke,currentColor,0);

            newLine(buffer,0,currentColor,currentStroke);
            // clear the buffer
            buffer = [];
            // clear the temp line
            d3.select("#temp-line").html(null);

            // Save in x seconds
            autoSaveTimeout();
        }
        if(isHand()){
            mouseDownPoint = null;
        }
    }

    function mouseMove(){
        // Get the current mouse coordinates
        let coordinates= d3.mouse(this);
        let x = coordinates[0];
        let y = coordinates[1];

        if(isPen()){
            let currentTime = Date.now();
            
            // if the user is drawing, add the x,y to the buffer
            if(isDrawing){
                // if it has been x milliseconds since the last coordinate saved
                if(currentTime>=lastPointTime+10){
                    buffer.push({x:x,y:y});
                    lastPointTime = currentTime;
                    //add the temp line
                    d3.select("#temp-line").append("circle")
                        .attr("fill","red")
                        .attr("r",3)
                        .attr("cx",x)
                        .attr("cy",y);
                }
            }
        }
        if(isHand()){
            // If the mouse has been down
            if(mouseDownPoint != null){
                /**
                 * Move the viewbox by taking the position the box was at when the mouse was first clicked.
                 * the (/1.2) is there to slow down the movement, no idea how to get around this atm 
                 */
                viewbox.x = mouseDownPoint.vx-(x-mouseDownPoint.x)/1.2;
                viewbox.y = mouseDownPoint.vy-(y-mouseDownPoint.y)/1.2;
                updateViewbox();
            }
        }
    }


    // #endregion
    //////////////////////////
    // Functions for saving
    // #region

    /**
     * Send the current boardbox to the main process to save
     */
    function save(){
        // Send a message with the tag "save" and payload of the boardbox
        comm.sendMessage("save", getBoardBox());
        autoSave.isSaved = true;
        autoSave.lastSaveTime = Date.now();
    }

    /**
     * Timeout to save in 10 seconds after no activity
     */
    function autoSaveTimeout(){
        autoSave.isSaved = false;
        // Clear the timeout if there is one
        clearTimeout(autoSave.saveTimeout);
        // Save in x ms
        autoSave.saveTimeout = setTimeout(save, autoSave.msBetweenSave);
    }

    // #endregion
    //////////////////////////
    // Functions for new lines/boards/boxes
    // #region

    /**
     * Creates a brand new boardbox with the first board
     * @param {String} boardboxName Name of the new board box
     * @param {String} boardName Name of the first board in the box
     * @param {String} bgColour Code of the colour of the first board's background
     */
    function newBoardBox(boardboxName,boardName,bgColour){
        // create the box for all the boards
        boardbox = {
            saveName: boardboxName,
            lastUsed: Date.now(),
            boardCount: 0,
            boards: []
        };

        // Create the first board to put in the box
        newBoard(boardName,bgColour);

        // Set the current board to the first (newly created) board
        thisBoard = boardbox.boards.find(x=>x.id == 0);

    }

    /**
     * Creates a new board in the current boardbox
     * @param {String} boardName Name for the new board
     * @param {String} bgColour Colour for the background
     */
    function newBoard(boardName,bgColour){
        boardbox.boards.push({
            id: boardbox.boardCount++,
            name: boardName,
            bgType: 0, // make this do something like 0 -> solid color, 1 -> grid etc
            bgColour: bgColour,
            lines: []
        });
    }

    /**
     * Saves the line to the current board
     * @param {Array} buffer Array of dots for the line
     * @param {Number} type type of line
     * @param {String} color Colour of the line
     * @param {Number} stroke Stroke size of the line
     * @param {?String} link id to link to
     */
    function newLine(buffer,type,color,stroke,link=null){
        thisBoard.lines.push({
            type:type,
            color:color,
            stroke:stroke,
            link:link,
            dots:buffer
        });
    }

    // #endregion
    //////////////////////////
    // Functions for tools
    // #region

    /**
     * Changes the current tool to the passed number
     * @param {Number} toolID number for the tool
     */
    function setTool(toolID){
        currentTool = toolID;
    }

    /**
     * Checks if the current tool is the pen tool
     */
    function isPen(){
        return currentTool==0?true:false;
    }

    /**
     * Checks if the current tool is the Hand tool
     */
    function isHand(){
        return currentTool==1?true:false;
    }

    // #endregion
    //////////////////////////
    // Getters/setters
    // #region

    /**
     * Get the current board
     */
    function getThisBoard(){
        return thisBoard;
    }

    /**
     * Get the current box
     */
    function getBoardBox(){
        return boardbox;
    }

    /**
     * Sets the current boardbox to the passed. Then loads board id 0 to the current board
     * @param {Object} newBoards Object holding the new boardbox
     */
    function setBoardBox(newBoards){
        boardbox = newBoards;
        // Set the current board to the first (newly created) board
        thisBoard = boardbox.boards.find(x=>x.id == 0);
    }

    // #endregion
    //////////////////////////

    return{
        init:init,
        getSVGSize:getSVGSize,
        setTool:setTool,
        setBoardBox:setBoardBox,
        newBoardBox:newBoardBox,
        getThisBoard:getThisBoard,
        getBoardBox:getBoardBox,
        save:save
    }
}();