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
    
    let thisBoard = null; // The current infiniboard that's being drawn on

    let currentTool = 0; // Current tool being used
    // 0 -> Pen
    // 1 -> Hand
    // 2 -> Eraser

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

    let colourBar = null;

    /**
     * Function that runs to initialize the whiteboard and load the current board
     */
    function init(id){
        thisBoard = boxManager.getBoard(id);


        // Create the current viewbox
        viewbox = {
            x:0,
            y:0,
            h:getSVGSize().h,
            w:getSVGSize().w
        }


        currentColor = thisBoard.pens[0];

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
            drawLine(svg,line.dots,line.stroke,line.color,line.type,line.id);
        }
        
        svg.style("background-color",thisBoard.bgColour);
        
        // When the mouse is down, set the drawing to true
        svg.on("mousedown",mouseDown);

        // When the mouse is up, stop drawing
        svg.on("mouseup",mouseUp)

        svg.on("mousemove", mouseMove);

        initColourBar();

        // Setup keys for tools
        keyManager.newEvent(80,0,function(){return setTool(0)}); // pen
        keyManager.newEvent(72,0,function(){return setTool(1)});
        keyManager.newEvent(69,0,function(){return setTool(2)}); // eraser
    }

    
    /**
     * Draws a line on the passed svg
     * @param {Object} svg d3 object for the svg
     * @param {Array} buffer Array holding the dots for the line
     * @param {Number} stroke Size of the stroke for this line
     * @param {String} colour Colour of the line 
     * @param {Number} type Type of the line
     */
    function drawLine(svg,buffer,stroke,colour,type,id){
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
        let svgLine = svg.append("path")
            .attr("d", line(buffer))
            .attr("stroke", colour)
            .attr("stroke-width", stroke)
            .attr("fill", "none")
            .attr("id",`line${id}`);

        // if the mouse moves over this line
        svgLine.on("mouseover",()=>{
            // if the tools is set to erasers and is drawing (mouse down)
            if(isEraser() && isDrawing){
                // Delete the line from the array
                deleteLine(id);
                // Delete the line from the svg
                d3.select(`#line${id}`).remove();
                // set the save timeout
                autoSaveTimeout();
            }
        })

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
        // Get the current mouse coordinates
        let coordinates= d3.mouse(d3.event.currentTarget);
            mouseDownPoint = {
                x:coordinates[0],
                y:coordinates[1],
                vx: viewbox.x,
                vy: viewbox.y
            };

        if(isPen()){
            isDrawing = true;

            // check if this line is a new colour
            for(let pen of thisBoard.pens){
                if(pen == currentColor){
                    return;
                }
            }
            colourBar.addPen(currentColor);

        }
        if(isHand()){
            
            
        }
        if(isEraser()){
            isDrawing = true;
        }
        
    }

    function mouseUp(){
        if(isPen()){
            //FIXME Saves line of 0 length, should always be min 1
            isDrawing = false;
            if(buffer.length <= 1){
                buffer = [];
                d3.select("#temp-line").html(null);
                return;
            }

            // Draw the line in the buffer
            let id = thisBoard.lines.length;
            drawLine(svg,buffer,currentStroke,currentColor,0,id);

            newLine(buffer,0,currentColor,currentStroke,id);
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
        if(isEraser()){
            isDrawing = false;
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
                    
                    lastPointTime = currentTime;
                    //add the temp line

                    let lastPoint = null;

                    if(buffer.length == 0){
                        lastPoint = mouseDownPoint;
                    }else{
                        lastPoint = buffer[buffer.length-1];
                    }

                    d3.select("#temp-line").append("circle")
                        .attr("fill",currentColor)
                        .attr("r",currentStroke/2)
                        .attr("cx",x)
                        .attr("cy",y);
                    
                    // d3.select("#temp-line").append("line")
                    //     .attr("x1",x)
                    //     .attr("y1",y)
                    //     .attr("x2",lastPoint.x)
                    //     .attr("y2",lastPoint.y)
                    //     .attr("stroke", currentColor)
                    //     .attr("stroke-width", currentStroke);

                    buffer.push({x:x,y:y});
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
        // get the pens from the colour bar
        let pens = [];
        for(let pen of colourBar.pens){
            pens.push(pen.getColour());
        }
        thisBoard.pens = pens;

        // Send a message with the tag "save" and payload of the boardbox
        comm.sendMessage("save", boxManager.getBox());
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
    // Functions for new lines
    // #region

    

    /**
     * Saves the line to the current board
     * @param {Array} buffer Array of dots for the line
     * @param {Number} type type of line
     * @param {String} color Colour of the line
     * @param {Number} stroke Stroke size of the line
     * @param {?String} link id to link to
     */
    function newLine(buffer,type,color,stroke,id,link=null){
        thisBoard.lines.push({
            id: id,
            type:type,
            color:color,
            stroke:stroke,
            link:link,
            dots:buffer
        });
    }


    function deleteLine(id){
        thisBoard.lines.splice((thisBoard.lines.findIndex(x=>x.id == id)),1);
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
        d3.select("#toolbar-icon-"+currentTool).attr("class","toolbar-icon");
        currentTool = toolID;
        d3.select("#toolbar-icon-"+currentTool).attr("class","toolbar-icon selected");
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

    function isEraser(){
        return currentTool==2?true:false;
    }

    // #endregion
    //////////////////////////
    // Colour bar
    // #region
    function initColourBar(){
        colourBar = {
            pens: [],
            svg: null,
            maxPens: 10,
            changeColour: null
        }
        colourBar.svg = d3.select("#colourBar").append("svg");
        let x=10;
        ///////////////////////////////
        // draw the current pen
        // #region 
        let currentPenGroup = colourBar.svg.append("g");

        // Draw the current pen
        // Ellipse for the "tip"
        let currentPenTip = currentPenGroup.append("ellipse")
            .attr("cx", x+15)
            .attr("cy", 15+5)
            .attr("rx", 6)
            .attr("ry", 15)
            .attr("fill", currentColor)
            .attr("stroke-width", 2)
            .attr("stroke", "var(--text)");

        // Rectangle for the "shaft"
        let currentPenShaft = currentPenGroup.append("rect")
            .attr("x",x-2)
            .attr("y",-15+5)
            .attr("width", 34)
            .attr("height", 25)
            .attr("fill", currentColor)
            .attr("stroke-width", 2)
            .attr("stroke", "var(--text)");

        // Polygon for the "neck"
        currentPenGroup.append("polygon")
            .attr("points",`${x},15
            ${x+7},20
            ${x+23},20
            ${x+30},15`)
            .attr("fill", "var(--text)")
            .attr("stroke-width", 2)
            .attr("stroke", "var(--text)");

        colourBar.changeColour = function(newColour){
            currentColor = newColour;
            currentPenTip.attr("fill",newColour);
            currentPenShaft.attr("fill",newColour);
            colourBar.strokeSizeLine.attr("stroke", newColour);
        }

        colourBar.addPen = function(newColour){
            thisBoard.pens.pop()
            thisBoard.pens.unshift(newColour);

            for(let i = 0;i < colourBar.maxPens;i++){
                colourBar.pens[i].changeColour(thisBoard.pens[i]);
            }
        }

        // Line between current pen and past pens
        colourBar.svg.append("line")
            .attr("x1",x+45)
            .attr("x2",x+45)
            .attr("y1",5)
            .attr("y2","35")
            .attr("stroke-width", 2)
            .attr("stroke", "var(--highlight)");

        // #endregion
        ///////////////////////////////
        // Draw the pen board
        // #region
        x+= 60;
        for(let i = 0;i < colourBar.maxPens;i++){
            let colour = thisBoard.pens[i];

            let group = colourBar.svg.append("g");
            // Ellipse for the "tip"
            let tip = group.append("ellipse")
                .attr("cx", x+15)
                .attr("cy", 15)
                .attr("rx", 6)
                .attr("ry", 15)
                .attr("fill", colour)
                .attr("stroke-width", 2)
                .attr("stroke", "var(--text)");

            // Rectangle for the "shaft"
            let shaft = group.append("rect")
                .attr("x",x-2)
                .attr("y",-15)
                .attr("width", 34)
                .attr("height", 25)
                .attr("fill", colour)
                .attr("stroke-width", 2)
                .attr("stroke", "var(--text)");

            // Polygon for the "neck"
            group.append("polygon")
                .attr("points",`${x},10
                ${x+7},15
                ${x+23},15
                ${x+30},10`)
                .attr("fill", "var(--text)")
                .attr("stroke-width", 2)
                .attr("stroke", "var(--text)");

            group.on("mouseover",function(){
                d3.select(this).transition()
                .duration(100).attr("transform", "translate(0,10)");
            });
            group.on("mouseout",function(){
                d3.select(this).transition()
                .duration(100).attr("transform", "translate(0,0)");
            });

            group.on("click",function(){
                colourBar.changeColour(colourBar.pens[i].getColour());
            });

            colourBar.pens.push({
                colour: colour,
                changeColour: function(newColour){
                    tip.attr("fill",newColour);
                    shaft.attr("fill",newColour);
                    this.colour = newColour;
                },
                getColour: function(){
                    return this.colour
                }
            })
            x+=45;
        }
        // #endregion
        ///////////////////////////////
        // Draw the Stroke sizer
        // #region
        x+= 30;

        let strokeIncreaseGroup = colourBar.svg.append("g")
            .attr("id","colourBar-strokeIncreaseButton");

        strokeIncreaseGroup.on("click",()=>{
            currentStroke++;
            colourBar.strokeSizeLine.attr("stroke-width", currentStroke)
        });

        strokeIncreaseGroup.append("rect")
            .attr("x",x)
            .attr("y",0)
            .attr("width", 40)
            .attr("height", 40)
            .attr("fill", "transparent")

        strokeIncreaseGroup.append("line")
            .attr("x1",x+10)
            .attr("y1",20)
            .attr("x2",x+30)
            .attr("y2",20)
            .attr("stroke", "var(--text)")
            .attr("stroke-width", 2)
            .attr("class","colourBar-strokeIncreaseLine");

        strokeIncreaseGroup.append("line")
            .attr("x1",x+20)
            .attr("y1",10)
            .attr("x2",x+20)
            .attr("y2",30)
            .attr("stroke", "var(--text)")
            .attr("stroke-width", 2)
            .attr("class","colourBar-strokeIncreaseLine");
        
        x+= 50;
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
        colourBar.strokeSizeLine = colourBar.svg.append("path")
            .attr("d", line([
                {x:x,y:20},
                {x:x+25,y:10},
                {x:x+50,y:20},
                {x:x+75,y:30},
                {x:x+100,y:20}
            ]))
            .attr("stroke", currentColor)
            .attr("stroke-width", currentStroke)
            .attr("fill", "none");

        x+= 110;     
        let strokeDecreaseGroup = colourBar.svg.append("g")
            .attr("id","colourBar-strokeDecreaseButton");

        strokeDecreaseGroup.on("click",()=>{
            if(currentStroke-1 >=1){
                currentStroke--;
                colourBar.strokeSizeLine.attr("stroke-width", currentStroke)
            }
        });

        strokeDecreaseGroup.append("rect")
            .attr("x",x)
            .attr("y",0)
            .attr("width", 40)
            .attr("height", 40)
            .attr("fill", "transparent");

        strokeDecreaseGroup.append("line")
            .attr("x1",x+10)
            .attr("y1",20)
            .attr("x2",x+30)
            .attr("y2",20)
            .attr("stroke", "var(--text)")
            .attr("stroke-width", 2)
            .attr("class","colourBar-strokeDecreaseLine");
        // #endregion
    }

    function getPens(){
        return colourBar;
    }
    // #endregion

    function changeColour(){
        let newColour = "#"+d3.select("#colourBar-newColour").html();
        // Check if there's a # before
        currentColor = newColour;
        colourBar.changeColour(newColour);
        colourBar.strokeSizeLine.attr("stroke", newColour);
    }

    return{
        init:init,
        getSVGSize:getSVGSize,
        setTool:setTool,
        save:save,
        getPens:getPens,
        changeColour:changeColour
    }
}();