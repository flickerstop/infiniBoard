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
    let currentColor = "white"; // Current selected color

    let mouseDownPoint = null; // Point where the mouse was pressed down

    let viewbox = null; // Current viewbox

    let autoSave = { // object for the 10 second autosave
        isSaved:true,
        msBetweenSave: 1000,
        lastSaveTime:null,
        saveTimeout: null
    }

    let colorBar = null;

    let textDrawArea = null;

    let selectedElement = null;

    let tempTransform = {x:null,y:null};

    /**
     * Function that runs to initialize the whiteboard and load the current board
     */
    function init(id){
        // Clear all elements we're about to use (for reloading)
        d3.select("#drawingBoard").html(null);
        isDrawing = false;

        svg = {};


        thisBoard = boxManager.getBoard(id);

        // Create the current viewbox
        viewbox = {
            x:0,
            y:0,
            h:getSVGSize().h,
            w:getSVGSize().w,
            dh:getSVGSize().h,
            dw:getSVGSize().w,
            scale:1
        }


        currentColor = thisBoard.pens[0];

        // Create the svg
        svg.parent = d3.select("#drawingBoard").append("svg")
        .attr("id","drawingBoard-svg")
        .attr("width", "100%")
        .attr("height", "100%");

        // Update the viewbox html with the viewbox object
        updateViewbox();

        
        // Add the group element that holds the temp line when drawing
        svg.main = svg.parent.append("g");

        svg.link = svg.parent.append("g");

        svg.temp = svg.parent.append("g").attr("id","temp-line");

        

        // draw all the lines in the current whiteboard
        for(line of thisBoard.lines){
            if(line.type == 2){
                drawLine(svg.link,line);
            }else{
                drawLine(svg.main,line);
            }
            
        }
        
        svg.parent.style("background-color",thisBoard.bgcolor);
        
        // When the mouse is down, set the drawing to true
        svg.parent.on("mousedown",mouseDown);

        // When the mouse is up, stop drawing
        svg.parent.on("mouseup",mouseUp)

        svg.parent.on("mousemove", mouseMove);

        initcolorBar();
        initNavBar();
        setupKeyboardShortcuts();

        setTool(7); // Set the tool to the direct selection
        keyManager.newEvent(32,0,function(){
            viewbox = {
                x:0,
                y:0,
                h:getSVGSize().h,
                w:getSVGSize().w,
                dh:getSVGSize().h,
                dw:getSVGSize().w,
                scale:1
            }
            updateViewbox();
        });

        //NOTE this took fucking 5 hours to figure out...
        svg.parent.on("wheel",function(){

            let coordinates= d3.mouse(this);
            let x = coordinates[0];
            let y = coordinates[1];

            let direction = d3.event.wheelDelta < 0 ? 'out' : 'in';

            if(direction == "in"){
                viewbox.scale = viewbox.scale/1.2;
            }else{
                viewbox.scale = viewbox.scale*1.2;
            }
            // Zoom in and set the mouse x,y to the origin (top left)
            viewbox.h = viewbox.dh*viewbox.scale;
            viewbox.w = viewbox.dw*viewbox.scale;
            viewbox.x = x;
            viewbox.y = y;
            updateViewbox();
            // Then set the origin back to the new mouse coordinates
            coordinates = d3.mouse(this);
            let x2 = coordinates[0];
            let y2 = coordinates[1];

            viewbox.x -= x2-x;
            viewbox.y -= y2-y;
            updateViewbox();
        });
    }

    
    /**
     * Draws a line on the passed svg
     * @param {Object} svg d3 object for the svg
     * @param {Array} buffer Array holding the dots for the line
     * @param {Number} stroke Size of the stroke for this line
     * @param {String} color color of the line 
     * @param {Number} type Type of the line
     */
    function drawLine(svg,line){
        // https://www.d3indepth.com/shapes/#line-generator
        // https://github.com/d3/d3-shape/blob/v1.3.4/README.md#line
        // https://www.dashingd3js.com/svg-paths-and-d3js

        svg = svg.append("g");

        if(line.type == 0){ // Normal Line
            // Create the line
            let drawLine = d3.line().curve(d3.curveCardinal);

            // for every x and y, set the value to (object passed).x
            drawLine.x((d)=>{
                return d.x;
            });
            drawLine.y((d)=>{
                return d.y;
            });

            // Append the line
            let svgLine = svg.append("path")
                .attr("d", drawLine(line.dots))
                .attr("stroke", line.color)
                .attr("stroke-width", line.stroke)
                .attr("fill", "none")
                .attr("id",`object${line.id}`);

            // if the mouse moves over this line
            svgLine.on("mousemove",()=>{
                // if the tools is set to erasers and is drawing (mouse down)
                if(isEraser() && isDrawing){
                    // Delete the line from the array
                    deleteLine(line.id);
                    // Delete the line from the svg
                    d3.select(`#object${line.id}`).remove();
                    // set the save timeout
                    autoSaveTimeout();
                }
            });

            svgLine.on("mousedown",()=>{
                if(isMove()){
                    selectedElement = line.id;
                }
            });
        }else if(line.type == 1){ // Rectangle
            let data = {
                x1:line.dots[0].x,
                y1:line.dots[0].y,
                x2:line.dots[1].x,
                y2:line.dots[1].y,
            }
            let height = data.y1>=data.y2?data.y1-data.y2:data.y2-data.y1;
            let width = data.x1>=data.x2?data.x1-data.x2:data.x2-data.x1;

            let rectX = data.x1>=data.x2?data.x2:data.x1;
            let rectY = data.y1>=data.y2?data.y2:data.y1;

            let svgLine = svg.append("rect")
                .attr("x",rectX)
                .attr("y",rectY)
                .attr("height",height)
                .attr("width",width)
                .attr("fill", line.color)
                .attr("id",`object${line.id}`);

            // if the mouse moves over this line
            svgLine.on("mousemove",()=>{
                // if the tools is set to erasers and is drawing (mouse down)
                if(isEraser() && isDrawing){
                    // Delete the line from the array
                    deleteLine(line.id);
                    // Delete the line from the svg
                    d3.select(`#object${line.id}`).remove();
                    // set the save timeout
                    autoSaveTimeout();
                }
            });

            svgLine.on("mousedown",()=>{
                if(isMove()){
                    selectedElement = line.id;
                }
            });
        }else if(line.type == 2){ // Link
            // Create the line
            let drawLine = d3.line().curve(d3.curveCardinal);

            // for every x and y, set the value to (object passed).x
            drawLine.x((d)=>{
                return d.x;
            });
            drawLine.y((d)=>{
                return d.y;
            });

            // Append the line
            let svgLine = svg.append("path")
                .attr("d", drawLine(line.dots))
                .attr("stroke", line.color)
                .attr("stroke-width", line.stroke)
                .attr("fill", line.color)
                .attr("fill-opacity",0.3)
                .attr("id",`object${line.id}`)
                .attr("class","whiteboard-link");

            // if the mouse moves over this line
            svgLine.on("mousemove",()=>{
                // if the tools is set to erasers and is drawing (mouse down)
                if(isEraser() && isDrawing){
                    // Delete the line from the array
                    deleteLine(line.id);
                    // Delete the line from the svg
                    d3.select(`#object${line.id}`).remove();
                    // set the save timeout
                    autoSaveTimeout();
                }
            });

            svgLine.on("click",()=>{
                if(isMouse()){
                    init(line.linkID);
                }
            });
            
            svgLine.on("mousedown",()=>{
                if(isMove()){
                    selectedElement = line.id;
                }
            });

        }else if(line.type == 3){ // Text

            let fontSize = 12 + (line.stroke*2);
            let textGroup = svg.append("g").attr("id",`object${line.id}`);

            let lines = 0;
            for(let textLine of line.dots.text.split("\n")){
                textGroup.append("text")
                    .attr("x",line.dots.x)
                    .style("font-size",`${fontSize}px`)
                    .attr("y",line.dots.y+(lines*fontSize))
                    .style("fill",currentColor)
                    .html(textLine);
                lines++;
            }

            textGroup.on("mousemove",()=>{
                // if the tools is set to erasers and is drawing (mouse down)
                if(isEraser() && isDrawing){
                    // Delete the line from the array
                    deleteLine(line.id);
                    // Delete the line from the svg
                    d3.select(`#object${line.id}`).remove();
                    // set the save timeout
                    autoSaveTimeout();
                }
            });

            textGroup.on("mousedown",()=>{
                if(isMove()){
                    selectedElement = line.id;
                }
            });
        }

        if(isMove() && line.id == selectedElement){
            svg.attr("transform",`translate(${tempTransform.x} ${tempTransform.y})`);
        }else{
            svg.attr("transform",`translate(${line.transform.x} ${line.transform.y})`);
        }
    }

    //==//==//==//==//==//==//
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

            // check if this line is a new color
            for(let pen of thisBoard.pens){
                if(pen == currentColor){
                    return;
                }
            }
            colorBar.addPen(currentColor);
        }
        else if(isEraser() || isLine() || isRect() || isLink()){
            isDrawing = true;
        }
        else if(isText()){
            if(!isTyping()){
                // console.log("focus input")
                textDrawArea = mouseDownPoint;

                d3.select("#whiteboard-textInput")
                    .style("display",null)
                    .transition().duration(100)
                    .style("top","40px");

                setTimeout(()=>{
                    d3.select("#whiteboard-textInput-input").node().focus();
                },10);

                d3.select("#whiteboard-textInput-submit").on("click",()=>{
                    d3.select("#whiteboard-textInput")
                        .transition().duration(100)
                        .style("top","-65px");

                    let data = {
                        text: util.getValueId("whiteboard-textInput-input"),
                        x: textDrawArea.x,
                        y: textDrawArea.y
                    };

                    textDrawArea = null;
                    let id = thisBoard.idCounter++;

                    let line = newLine(data,3,currentColor,currentStroke,id);

                    drawLine(svg.main,line);
                    

                    // clear the buffer
                    buffer = [];
                    // clear the temp line
                    d3.select("#temp-line").html(null);

                    // Save in x seconds
                    autoSaveTimeout();
                });

                d3.select("#whiteboard-textInput-input").on("input",updateTextArea);
            }
        }
    }

    function mouseUp(){
        // Get the current mouse coordinates
        let coordinates= d3.mouse(this);
        let x = coordinates[0];
        let y = coordinates[1];
        if(isPen() || isLink()){
            if(buffer.length <= 1){
                buffer = [];
                d3.select("#temp-line").html(null);
                return;
            }

            // Draw the line in the buffer
            let id = thisBoard.idCounter++;

            if(isPen()){
                let line = newLine(buffer,0,currentColor,currentStroke,id);
                drawLine(svg.main,line);
                
            }else if(isLink()){
                // Make sure the line goes back to the start
                buffer.push({x:buffer[0].x,y:buffer[0].y});

                // Create a new popup getting what board to link to
                popup.newBoard(buffer,(resID,boardName,bgcolor,lineBuffer)=>{
                    // if a new board is to be made
                    if(resID == -1){
                        let newBoardID = boxManager.newBoard(boardName,bgcolor);
                        
                        let line = newLine(lineBuffer,2,currentColor,currentStroke,id,newBoardID);
                        drawLine(svg.link,line);
                        save();
                        //init(newBoardID);
                    }else{
                        let line = newLine(lineBuffer,2,currentColor,currentStroke,id,resID);
                        drawLine(svg.link,line);
                        
                        save();
                    }
                });
            }
            
            // clear the buffer
            buffer = [];
            // clear the temp line
            d3.select("#temp-line").html(null);

            // Save in x seconds
            autoSaveTimeout();
        }
        if(isHand()){
            
        }
        if(isEraser()){

        }
        if(isLine() || isRect()){
            buffer = [{x:mouseDownPoint.x,y:mouseDownPoint.y},{x:x,y:y}]

            // Draw the line in the buffer
            let id = thisBoard.idCounter++;

            if(isLine()){
                let line = newLine(buffer,0,currentColor,currentStroke,id);
                drawLine(svg.main,line);
                
            }else if(isRect()){
                let line = newLine(buffer,1,currentColor,currentStroke,id);
                drawLine(svg.main,line);
            }
            

            // clear the buffer
            buffer = [];
            // clear the temp line
            d3.select("#temp-line").html(null);

            // Save in x seconds
            autoSaveTimeout();
        }
        if(isMove() && selectedElement != null){
            let line = getLine(selectedElement);

            line.transform.x = tempTransform.x;
            line.transform.y = tempTransform.y;

            selectedElement = null;
        }

        isDrawing = false;

        
        mouseDownPoint = null;
        
    }

    function mouseMove(){
        // Get the current mouse coordinates
        let coordinates= d3.mouse(this);
        let x = coordinates[0];
        let y = coordinates[1];

        if(isPen() || isLink()){
            let currentTime = Date.now();
            
            // if the user is drawing, add the x,y to the buffer
            if(isDrawing){
                // if it has been x milliseconds since the last coordinate saved
                if(currentTime>=lastPointTime+10){
                    
                    lastPointTime = currentTime;
                    //add the temp line

                    // let lastPoint = null;

                    // if(buffer.length == 0){
                    //     lastPoint = mouseDownPoint;
                    // }else{
                    //     lastPoint = buffer[buffer.length-1];
                    // }

                    svg.temp.append("circle")
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
        if(isLine()){
            if(isDrawing){
                svg.temp.html(null);

                svg.temp.append("line")
                    .attr("x1",x)
                    .attr("y1",y)
                    .attr("x2",mouseDownPoint.x)
                    .attr("y2",mouseDownPoint.y)
                    .attr("stroke", currentColor)
                    .attr("stroke-width", currentStroke);
            }
        }
        if(isRect()){
            if(isDrawing){
                let height = mouseDownPoint.y>=y?mouseDownPoint.y-y:y-mouseDownPoint.y;
                let width = mouseDownPoint.x>=x?mouseDownPoint.x-x:x-mouseDownPoint.x;

                let rectX = mouseDownPoint.x>=x?x:mouseDownPoint.x;
                let rectY = mouseDownPoint.y>=y?y:mouseDownPoint.y;

                svg.temp.html(null);

                svg.temp.append("rect")
                    .attr("x",rectX)
                    .attr("y",rectY)
                    .attr("height",height)
                    .attr("width",width)
                    .attr("fill", currentColor);
            }
        }
        if(isMove() && selectedElement != null){
            let obj = getLine(selectedElement);

            tempTransform.x = x-mouseDownPoint.x+obj.transform.x;
            tempTransform.y = y-mouseDownPoint.y+obj.transform.y;

            updateLine(obj);
        }
    }


    // #endregion
    //==//==//==//==//==//==//
    // Functions for saving
    // #region 

    /**
     * Send the current boardbox to the main process to save
     */
    function save(){
        // get the pens from the color bar
        let pens = [];
        for(let pen of colorBar.pens){
            pens.push(pen.getcolor());
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
    //==//==//==//==//==//==//
    // Functions for new lines
    // #region

    /**
     * Saves the line to the current board
     * @param {Array} buffer Array of dots for the line
     * @param {Number} type type of line
     * @param {String} color color of the line
     * @param {Number} stroke Stroke size of the line
     * @param {?String} link id to link to
     */
    function newLine(buffer,type,color,stroke,id,link=null){
        let obj = {
            id: id,
            type:type,
            color:color,
            stroke:stroke,
            linkID:link,
            dots:buffer,
            transform: {
                x:0,
                y:0
            }
        };
        thisBoard.lines.push(obj);
        return obj;
    }


    function deleteLine(id){
        return thisBoard.lines.splice((thisBoard.lines.findIndex(x=>x.id == id)),1);
    }

    function getLine(id){
        return thisBoard.lines.find(x=>x.id == id);
    }

    function updateLine(line){
        d3.select(`#object${line.id}`).remove();

        if(line.type == 2){
            drawLine(svg.link,line);
        }else{
            drawLine(svg.main,line);
        }
    }

    // #endregion
    //==//==//==//==//==//==//
    // Functions for tools
    // #region

    /**
     * Changes the current tool to the passed number
     * @param {Number} toolID number for the tool
     */
    function setTool(toolID){
        if(!isTyping()){
            d3.select("#toolbar-icon-"+currentTool).attr("class","toolbar-icon");
            currentTool = toolID;
            d3.select("#toolbar-icon-"+currentTool).attr("class","toolbar-icon selected");
        }
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

    /**
     * Is the current tool the eraser
     */
    function isEraser(){
        return currentTool==2?true:false;
    }

    function isLine(){
        return currentTool==3?true:false;
    }

    function isRect(){
        return currentTool==4?true:false;
    }

    function isLink(){
        return currentTool==5?true:false;
    }

    function isText(){
        return currentTool==6?true:false;
    }

    function isMouse(){
        return currentTool==7?true:false;
    }

    function isMove(){
        return currentTool==8?true:false;
    }

    /**
     * Checks to see if the user is typing something into the text tool
     * @returns {boolean} true if typing
     */
    function isTyping(){
        return textDrawArea != null;
    }

    // #endregion
    //==//==//==//==//==//==//
    // color bar
    // #region
    function initcolorBar(){
        d3.select("#colorBar").html(null);
        colorBar = {
            pens: [],
            svg: null,
            maxPens: 10,
            changecolor: null
        }
        colorBar.svg = d3.select("#colorBar").append("svg");
        let x=10;

        // draw the current pen
        // #region 
        let currentPenGroup = colorBar.svg.append("g");

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

        colorBar.changecolor = function(newcolor){
            currentColor = newcolor;
            currentPenTip.attr("fill",newcolor);
            currentPenShaft.attr("fill",newcolor);
            colorBar.strokeSizeLine.attr("stroke", newcolor);
            if(isTyping()){
                updateTextArea();
            }
        }

        colorBar.addPen = function(newcolor){
            thisBoard.pens.pop()
            thisBoard.pens.unshift(newcolor);

            for(let i = 0;i < colorBar.maxPens;i++){
                colorBar.pens[i].changecolor(thisBoard.pens[i]);
            }
        }

        // Line between current pen and past pens
        colorBar.svg.append("line")
            .attr("x1",x+45)
            .attr("x2",x+45)
            .attr("y1",5)
            .attr("y2","35")
            .attr("stroke-width", 2)
            .attr("stroke", "var(--highlight)");

        // #endregion
        //--//--//--//--//--//--//
        // Draw the pen board
        // #region
        x+= 60;
        for(let i = 0;i < colorBar.maxPens;i++){
            let color = thisBoard.pens[i];

            let group = colorBar.svg.append("g");
            // Ellipse for the "tip"
            let tip = group.append("ellipse")
                .attr("cx", x+15)
                .attr("cy", 15)
                .attr("rx", 6)
                .attr("ry", 15)
                .attr("fill", color)
                .attr("stroke-width", 2)
                .attr("stroke", "var(--text)");

            // Rectangle for the "shaft"
            let shaft = group.append("rect")
                .attr("x",x-2)
                .attr("y",-15)
                .attr("width", 34)
                .attr("height", 25)
                .attr("fill", color)
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
                colorBar.changecolor(colorBar.pens[i].getcolor());
                if(isTyping()){
                    updateTextArea();
                }
            });

            colorBar.pens.push({
                color: color,
                changecolor: function(newcolor){
                    tip.attr("fill",newcolor);
                    shaft.attr("fill",newcolor);
                    this.color = newcolor;
                },
                getcolor: function(){
                    return this.color
                }
            })
            x+=45;
        }
        // #endregion
        //--//--//--//--//--//--//
        // Draw the Stroke sizer
        // #region
        x+= 30;

        let strokeIncreaseGroup = colorBar.svg.append("g")
            .attr("id","colorBar-strokeIncreaseButton");

        strokeIncreaseGroup.on("click",()=>{
            currentStroke++;
            colorBar.strokeSizeLine.attr("stroke-width", currentStroke)
            if(isTyping()){
                updateTextArea();
            }
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
            .attr("class","colorBar-strokeIncreaseLine");

        strokeIncreaseGroup.append("line")
            .attr("x1",x+20)
            .attr("y1",10)
            .attr("x2",x+20)
            .attr("y2",30)
            .attr("stroke", "var(--text)")
            .attr("stroke-width", 2)
            .attr("class","colorBar-strokeIncreaseLine");
        
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
        colorBar.strokeSizeLine = colorBar.svg.append("path")
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
        let strokeDecreaseGroup = colorBar.svg.append("g")
            .attr("id","colorBar-strokeDecreaseButton");

        strokeDecreaseGroup.on("click",()=>{
            if(currentStroke-1 >=1){
                currentStroke--;
                colorBar.strokeSizeLine.attr("stroke-width", currentStroke)
            }
            if(isTyping()){
                updateTextArea();
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
            .attr("class","colorBar-strokeDecreaseLine");
        // #endregion
    }

    function getPens(){
        return colorBar;
    }
    // #endregion
    //==//==//==//==//==//==//
    // Nav bar
    // #region 

    function initNavBar(){
        d3.select("#navBar-content").html(null);
        d3.select("#navBar-side").on("click",()=>{
            openNavBar();
        });

        let panel = d3.select("#navBar-content");
        let boards = boxManager.getBox().boards;
        for(let board of boards){
            let selector = panel.append("div").html(board.name).attr("class","navBar-content-board");
            if(board.name == thisBoard.name){
                selector.attr("class","navBar-content-board current");
            }
            selector.on("click",()=>{
                init(board.id)
            });
        }
    }

    function openNavBar(){
        d3.select("#navBar").transition().duration(100).style("right","0px");
        d3.select("#navBar-side").style("background-image",`url("./images/chevron_right.png")`);
        d3.select("#navBar-side").on("click",()=>{
            closeNavBar();
        });
    }

    function closeNavBar(){
        d3.select("#navBar").transition().duration(100).style("right","-200px");
        d3.select("#navBar-side").style("background-image",`url("./images/chevron_left.png")`);
        d3.select("#navBar-side").on("click",()=>{
            openNavBar();
        });
    }

    // #endregion
    //==//==//==//==//==//==//
    // Text Tool
    // #region
    function updateTextArea(){
        let textArea = svg.temp.html(null);
        let input = util.getValueId("whiteboard-textInput-input");

        let fontSize = 12 + (currentStroke*2);

        let lines = 0;
        for(let line of input.split("\n")){
            textArea.append("text")
                .attr("x",textDrawArea.x)
                .style("font-size",`${fontSize}px`)
                .attr("y",textDrawArea.y+(lines*fontSize))
                .style("fill",currentColor)
                .html(line);
            lines++;
        }
    }
    // #endregion
    
    function changecolor(){
        let newcolor = "#"+d3.select("#colorBar-newcolor").html();
        // Check if there's a # before
        currentColor = newcolor;
        colorBar.changecolor(newcolor);
        colorBar.strokeSizeLine.attr("stroke", newcolor);
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
        svg.parent.attr("viewBox",`${viewbox.x},${viewbox.y},${viewbox.w},${viewbox.h}`);
    }

    function setupKeyboardShortcuts(){
        // https://keycode.info/
        keyManager.newEvent(80,0,function(){return setTool(0)}); // pen
        keyManager.newEvent(72,0,function(){return setTool(1)}); // Hand
        keyManager.newEvent(69,0,function(){return setTool(2)}); // eraser
        keyManager.newEvent(76,0,function(){return setTool(3)}); // line
        keyManager.newEvent(82,0,function(){return setTool(4)}); // rect
        keyManager.newEvent(77,0,function(){return setTool(8)}); // move
        keyManager.newEvent(84,0,function(){return setTool(6)}); // text
    }


    return{
        init:init,
        getSVGSize:getSVGSize,
        setTool:setTool,
        save:save,
        getPens:getPens,
        changecolor:changecolor
    }
}();