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

    let holdShift = {isHeld:false,x:null,y:null};

    let colorBar = null;
    let textDrawArea = null;
    let selectedElement = null;
    let tempTransform = {x:null,y:null};
    let mouse = {x:0,y:0};

    /**
     * Function that runs to initialize the whiteboard and load the current board
     */
    function init(id){
        // Clear all elements we're about to use (for reloading)
        d3.select("#drawingBoard").html(null).on("dragenter",()=>{
            inputBox.style("display",null);
        })

        let inputBox = d3.select("#drawingBoard").append("input")
            .attr("multiple",true)
            .attr("type","file")
            .attr("accept","image/*")
            .attr("id","drawingBoard-input")
            .style("display","none")
            .on("change",()=>{
                inputBox.style("display","none");
                dropManager.handleDrop().then((files)=>{
                    util.clearValueId("drawingBoard-input");

                    //NOTE working here
                    for(let file of files){
                        let data = {
                            x: mouse.x,
                            y: mouse.y,
                            w: file.width,
                            h: file.height
                        }
                        let line = newLine(data,4,null,null,file.path);
                        drawLine(svg.image,line);

                        autoSaveTimeout();
                    }
                    
                });
            }).on("click",()=>{
                d3.event.preventDefault();
            }).on("dragleave",()=>{
                inputBox.style("display","none");
            }).on("dragover",()=>{
                let coordinates= d3.mouse(d3.select("#drawingBoard-svg").node());
                mouse = {
                    x:coordinates[0],
                    y:coordinates[1]
                }
            })

        isDrawing = false;

        svg = {};

        // Set this board to the board with the passed ID
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

        // Set the current colour to the
        currentColor = thisBoard.pens[0];

        // Create the svg
        svg.parent = d3.select("#drawingBoard").append("svg")
            .attr("id","drawingBoard-svg")
            .attr("width", "100%")
            .attr("height", "100%");

        
        
        // Set the groups where to draw the objects
        // Main is lines/rects/text
        // Links will always be ontop of lines so you can always click then
        // Temp is always ontop of everything else to see what you're drawing
        svg.background = svg.parent.append("g");
        svg.image = svg.parent.append("g");
        svg.main = svg.parent.append("g");
        svg.link = svg.parent.append("g");
        svg.temp = svg.parent.append("g").attr("id","temp-line");

        svg.parent.on("mousedown",mouseDown);
        svg.parent.on("mouseup",mouseUp)
        svg.parent.on("mousemove", mouseMove);

        

        // draw all the lines in the current whiteboard
        for(line of thisBoard.lines){
            if(line.type == 2){
                drawLine(svg.link,line);
            }else if(line.type == 4){
                drawLine(svg.image,line);
            }else{
                drawLine(svg.main,line);
            }
            
        }
        
        // Set the background colour
        svg.parent.style("background-color",thisBoard.bgcolor);

        // Update the viewbox html with the viewbox object
        updateViewbox();

        // Init the colour/nav bar
        initColorBar();
        initNavBar();

        // Draw the background if needs it
        generateBackground();

        // Setup the keyboard shortcuts
        setupKeyboardShortcuts();

        setTool(7); // Set the tool to the direct selection

        // Mouse event for scrolling in/out (zooming)
        // this took fucking 5 hours to figure out...
        svg.parent.on("wheel",function(){

            // Get the mouse coordinateds
            let coordinates= d3.mouse(this);
            let x = coordinates[0];
            let y = coordinates[1];

            // Check which direction the mouse is scrolling
            let direction = d3.event.wheelDelta < 0 ? 'out' : 'in';

            // If it's in, make the scale smaller, vise versa
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

            generateBackground();
        });
    }

    
    /**
     * Draws a line on the passed svg
     * @param {Object} svg d3 object for the svg
     * @param {object} line The object that holds all the data about the line
     */
    function drawLine(svg,line){
        // https://www.d3indepth.com/shapes/#line-generator
        // https://github.com/d3/d3-shape/blob/v1.3.4/README.md#line
        // https://www.dashingd3js.com/svg-paths-and-d3js

        // Append a new group for the draw object
        svg = svg.append("g").attr("id",`object${line.id}`);

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
            svg.append("path")
                .attr("d", drawLine(line.dots))
                .attr("stroke", line.color)
                .attr("stroke-width", line.stroke)
                .attr("fill", "none");

        }else if(line.type == 1){ // Rectangle

            // set the bounding box for the rect
            let data = {
                x1:line.dots[0].x,
                y1:line.dots[0].y,
                x2:line.dots[1].x,
                y2:line.dots[1].y,
            }
            // Calculate height/width depends on which x/y is greater (want a positive height/width)
            let height = data.y1>=data.y2?data.y1-data.y2:data.y2-data.y1;
            let width = data.x1>=data.x2?data.x1-data.x2:data.x2-data.x1;

            // Which coordinate is going to be the top/left most
            let rectX = data.x1>=data.x2?data.x2:data.x1;
            let rectY = data.y1>=data.y2?data.y2:data.y1;

            // draw the rectangle
            svg.append("rect")
                .attr("x",rectX)
                .attr("y",rectY)
                .attr("height",height)
                .attr("width",width)
                .attr("fill", line.color);


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
                .attr("class","whiteboard-link");

            // If the tool is set to the mouse, portal to the linked whiteboard
            svgLine.on("click",()=>{
                if(isMouse()){
                    init(line.linkID);
                }
            });

        }else if(line.type == 3){ // Text

            // Set the font size
            let fontSize = 12 + (line.stroke*2);

            // Group to draw the text
            let textGroup = svg.append("g");

            let lines = 0;
            // For each line of text
            for(let textLine of line.dots.text.split("\n")){
                // Draw a new line that's moved down x number of pixels
                textGroup.append("text")
                    .attr("x",line.dots.x)
                    .style("font-size",`${fontSize}px`)
                    .attr("y",line.dots.y+(lines*fontSize))
                    .style("fill",line.color)
                    .style("font-family","Tahoma")
                    .html(textLine);
                lines++;
            }

        }else if(line.type == 4){ // Image
            svg.append("image")
                .attr("xlink:href", `file://${line.linkID}`)
                .attr("x",line.dots.x)
                .attr("y",line.dots.y)
                .attr("width",line.dots.w)
                .attr("height",line.dots.h);
        }

        // If the tool is the move tool, set the selected element to this one
        svg.on("mousedown",()=>{
            if(isMove()){
                selectedElement = line.id;
            }
        });

        // if the mouse moves over this line
        svg.on("mousemove",()=>{
            // if the tools is set to erasers and is drawing (mouse down)
            if(isEraser() && isDrawing){
                // Delete the line from the array
                deleteLine(line.id);
                // set the save timeout
                autoSaveTimeout();
            }
        });

        // If this element is currently being moved
        if(isMove() && line.id == selectedElement){
            // Use the temp transform
            svg.attr("transform",`translate(${tempTransform.x} ${tempTransform.y})`);
        }else{
            // Use the transform for this object
            svg.attr("transform",`translate(${line.transform.x} ${line.transform.y})`);
        }
    }

    //==//==//==//==//==//==//
    // Mouse Actions
    // #region 

    function mouseDown(){
        function isLeftClick(){return d3.event.button==0}
        function isRightClick(){return d3.event.button==2}
        function isMiddleClick(){return d3.event.button==1}

        if(isMiddleClick()){
            d3.event.preventDefault();
        }

        // Get the current mouse coordinates
        let coordinates= d3.mouse(d3.select("#drawingBoard-svg").node());
        mouseDownPoint = {
            x:coordinates[0],
            y:coordinates[1],
            vx: viewbox.x,
            vy: viewbox.y,
            button: d3.event.button
        };

        if(isPen() && isLeftClick()){
            isDrawing = true;

            let isNewPen = true;
            // check if this line is a new color
            for(let pen of thisBoard.pens){
                if(pen == currentColor){
                    isNewPen = false;
                }
            }
            if(isNewPen){
                colorBar.addPen(currentColor);
            }
        }
        else if((isEraser() || isLine() || isRect() || isLink()) && isLeftClick()){
            isDrawing = true;
        }
        else if(isText() && isLeftClick()){
            if(!isTyping()){
                // Setup the data for the text input area
                textDrawArea = {
                    x:mouseDownPoint.x,
                    y:mouseDownPoint.y,
                    w: 215,
                    h: 115,
                    isMouseDownForMoving: false,
                    isDraggable:true
                };

                // Set the font size
                let fontSize = 12 + (currentStroke*2);

                // Build the foreign Object that holds the text area in the svg
                svg.temp.append("foreignObject")
                    .attr("id","whiteboard-textInputArea-container")
                    .attr("x",textDrawArea.x)
                    .attr("y",textDrawArea.y)
                    .attr("width","100000px") // Technically the text area can't be bigger than 1000x1000
                    .attr("height","100000px")// But that shouldn't ever happen
                // Build the div that borders the text area and allows for dragging
                .append("xhtml:div")
                    .attr("id","whiteboard-textInputArea-moveBorder")
                    .style("width",textDrawArea.w+20)
                    .style("height",textDrawArea.h+20)
                    .on("mouseenter",()=>{
                        // Set the flag that says the mouse is over the text input area
                        textDrawArea.isMouseOver = true;
                    }).on("mouseleave",()=>{
                        // Clear the flag
                        textDrawArea.isMouseOver = false;
                    })
                    .on("mousedown",()=>{
                        // Only allow the "isMouseDownForMoving" flag to only be set if the mouse isn't over the text area
                        /*
                            This solves the issue of when dragging starting from inside the text box and the mouse
                            moves outside the box, it triggers the move event
                        */
                       console.log(textDrawArea.isDraggable);
                        if(textDrawArea.isDraggable){
                            // Set the flag that says the mouse is held down to move the text area
                            textDrawArea.isMouseDownForMoving = true;
                            // Set the offset that makes it so the text area's origin isn't exactly at the mouse
                            textDrawArea.offsetX = d3.mouse(d3.select("#whiteboard-textInputArea-moveBorder").node())[0];
                            textDrawArea.offsetY = d3.mouse(d3.select("#whiteboard-textInputArea-moveBorder").node())[1];
                        }
                    }).on("mouseup",()=>{
                        // Remove the flag
                        textDrawArea.isMouseDownForMoving = false;
                    })
                // Build the textarea
                .append("xhtml:textarea")
                    .attr("id","whiteboard-textInputArea")
                    .style("font-size",`${fontSize}px`)
                    .style("line-height",`${fontSize}px`)
                    .style("color",currentColor)
                    .style("width",textDrawArea.w)
                    .style("height",textDrawArea.h)
                    .on("input",updateTextArea)
                    .on("mouseenter",()=>{
                        // Flag for saying the mouse is over the text area container AND over the textarea
                        textDrawArea.isDraggable = false;
                    }).on("mouseleave",()=>{
                        // Remove the flag
                        textDrawArea.isDraggable = true;
                    })

                // After 10 milliseconds, select focus on the textarea
                setTimeout(()=>{document.getElementById("whiteboard-textInputArea").focus()},10);
            }else{ // If they are currently using a textarea
                // And they click anyone not over the text area
                if(!textDrawArea.isMouseOver){
                    // Submit the text area
                    submitTextArea();
                }
            }
        }
        else if(isImage() && isLeftClick()){
            popup.imageSelector(mouse,(image)=>{
                let data = {
                    x: image.x,
                    y: image.y,
                    w: image.width,
                    h: image.height
                }
                let line = newLine(data,4,null,null,image.path);
                drawLine(svg.image,line);

                autoSaveTimeout();
            });
        }
        else if(isHand() || isMiddleClick()){
            clearBackground();
        }

        if(holdShift.isHeld){
            if(holdShift.x == null && holdShift.y == null){
                holdShift.x = mouseDownPoint.x;
                holdShift.y = mouseDownPoint.y;
            }
        }
    }

    function mouseUp(){
        function isLeftClick(){return d3.event.button==0}
        function isRightClick(){return d3.event.button==2}
        function isMiddleClick(){return d3.event.button==1}
        if(isPen() || isLink()){
            if(buffer.length > 1){
                // Draw the line in the buffer

                if(isPen()){
                    let line = newLine(buffer,0,currentColor,currentStroke);
                    drawLine(svg.main,line);
                    
                }else if(isLink()){
                    // Make sure the line goes back to the start
                    buffer.push({x:buffer[0].x,y:buffer[0].y});

                    // Create a new popup getting what board to link to
                    popup.newBoard(buffer,(resID,boardName,bgcolor,lineBuffer)=>{
                        // if a new board is to be made
                        if(resID == -1){
                            let newBoardID = boxManager.newBoard(boardName,bgcolor);
                            
                            let line = newLine(lineBuffer,2,currentColor,currentStroke,newBoardID);
                            drawLine(svg.link,line);
                            save();
                            //init(newBoardID);
                        }else{
                            let line = newLine(lineBuffer,2,currentColor,currentStroke,resID);
                            drawLine(svg.link,line);
                            
                            save();
                        }
                    });
                }
                autoSaveTimeout();
            }
            // clear the buffer
            buffer = [];
            // clear the temp line
            d3.select("#temp-line").html(null);

            // Save in x seconds
            
        }
        if(isHand() || isMiddleClick()){
            mouseDownPoint = null;
            generateBackground();
        }
        if(isEraser()){

        }
        if(isLine() || isRect()){
            buffer = [{x:mouseDownPoint.x,y:mouseDownPoint.y},{x:mouse.x,y:mouse.y}]

            // Draw the line in the buffer

            if(isLine()){
                // Check if the height and width is 0
                if((buffer[0].x - buffer[1].x) != 0 && (buffer[0].y - buffer[1].y) != 0){
                    let line = newLine(buffer,0,currentColor,currentStroke);
                    drawLine(svg.main,line);
                }
            }else if(isRect()){
                // Check if the height or width is 0
                if((buffer[0].x - buffer[1].x) != 0 || (buffer[0].y - buffer[1].y) != 0){
                    let line = newLine(buffer,1,currentColor,currentStroke);
                    drawLine(svg.main,line);
                }
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
        if(textDrawArea != null && textDrawArea.isMouseDownForMoving){
            textDrawArea.isMouseDownForMoving = false;
        }

        isDrawing = false;
        
        mouseDownPoint = null;

        if(holdShift.isHeld){
            if(holdShift.x != null && holdShift.y != null){
                holdShift.x = null;
                holdShift.y = null;
            }
        }
    }

    function mouseMove(){
        // Get the current mouse coordinates
        mouse = {
            // xy based on svg location
            x: d3.mouse(d3.select("#drawingBoard-svg").node())[0],
            y: d3.mouse(d3.select("#drawingBoard-svg").node())[1],
            // last xy
            lx: mouse.x,
            ly: mouse.y,
            // xy based on main panel position
            gx: d3.mouse(d3.select("#mainPanel").node())[0],
            gy: d3.mouse(d3.select("#mainPanel").node())[1],
            // last xy
            lgx: mouse.gx,
            lgy: mouse.gy
        }

        if(mouseDownPoint != null){ // If the mouse has been pressed down
            if(isHand() || mouseDownPoint.button == 1){
                viewbox.x = viewbox.x - (mouse.gx-mouse.lgx)*viewbox.scale;
                viewbox.y = viewbox.y - (mouse.gy-mouse.lgy)*viewbox.scale;
                updateViewbox();
            }

            if(holdShift.isHeld){
                if(holdShift.x == null && holdShift.y == null){
                    holdShift.x = mouse.x;
                    holdShift.y = mouse.y;
                }
            }
        }if(isPen() || isLink()){
            let currentTime = Date.now();
            
            // if the user is drawing, add the x,y to the buffer
            if(isDrawing){
                // if it has been x milliseconds since the last coordinate saved
                if(currentTime>=lastPointTime+10){
                    if(holdShift.isHeld){
                        // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                        if(Math.abs(mouse.x-holdShift.x)>Math.abs(mouse.y-holdShift.y)){
                            lastPointTime = currentTime;
                            svg.temp.append("circle")
                                .attr("fill",currentColor)
                                .attr("r",currentStroke/2)
                                .attr("cx",mouse.x)
                                .attr("cy",holdShift.y);

                            buffer.push({x:mouse.x,y:holdShift.y});

                        }else if(Math.abs(mouse.x-holdShift.x)<Math.abs(mouse.y-holdShift.y)){
                            lastPointTime = currentTime;
                            svg.temp.append("circle")
                                .attr("fill",currentColor)
                                .attr("r",currentStroke/2)
                                .attr("cx",holdShift.x)
                                .attr("cy",mouse.y);
                            
                            buffer.push({x:holdShift.x,y:mouse.y});
                        }
                    }else{
                        lastPointTime = currentTime;
                        svg.temp.append("circle")
                            .attr("fill",currentColor)
                            .attr("r",currentStroke/2)
                            .attr("cx",mouse.x)
                            .attr("cy",mouse.y);
                        
                        buffer.push({x:mouse.x,y:mouse.y});
                    }
                }
            }
        }
        if(isLine()){
            if(isDrawing){
                svg.temp.html(null);

                svg.temp.append("line")
                    .attr("x1",mouse.x)
                    .attr("y1",mouse.y)
                    .attr("x2",mouseDownPoint.x)
                    .attr("y2",mouseDownPoint.y)
                    .attr("stroke", currentColor)
                    .attr("stroke-width", currentStroke);
            }
        }
        if(isRect()){
            if(isDrawing){
                let height = mouseDownPoint.y>=mouse.y?mouseDownPoint.y-mouse.y:mouse.y-mouseDownPoint.y;
                let width = mouseDownPoint.x>=mouse.x?mouseDownPoint.x-mouse.x:mouse.x-mouseDownPoint.x;

                let rectX = mouseDownPoint.x>=mouse.x?mouse.x:mouseDownPoint.x;
                let rectY = mouseDownPoint.y>=mouse.y?mouse.y:mouseDownPoint.y;

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

            tempTransform.x = mouse.x-mouseDownPoint.x+obj.transform.x;
            tempTransform.y = mouse.y-mouseDownPoint.y+obj.transform.y;

            updateLine(obj);
            autoSaveTimeout();
        }
        if(textDrawArea != null && textDrawArea.isMouseDownForMoving && textDrawArea.isDraggable){ // Used for moving the text box when first writing text
            
            textDrawArea.x = mouse.x-textDrawArea.offsetX;
            textDrawArea.y = mouse.y-textDrawArea.offsetY;
            updateTextArea();
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
    function newLine(buffer,type,color,stroke,link=null){
        let obj = {
            id: thisBoard.idCounter++,
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
        let location = thisBoard.lines.findIndex(x=>x.id == id);

        if(location == -1){ // 2 eraser events fired resulting in no id
            return;
        }
        let deleted = thisBoard.lines.splice(location,1)[0];

        d3.selectAll(`#object${deleted.id}`).remove();
    }

    function getLine(id){
        return thisBoard.lines.find(x=>x.id == id);
    }

    function updateLine(line){
        d3.select(`#object${line.id}`).remove();

        if(line.type == 2){
            drawLine(svg.link,line);
        }else if(line.type == 4){
            drawLine(svg.image,line);
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
    function setTool(toolID,isKeyboardShortcut){
        // If they're typing and a keyboard shortcut is clicked
        if(isTyping() && isKeyboardShortcut){
            // Ignore it
            return;
        }

        // If they are typing and want to change tools
        if(isTyping()){
            // let them but submit the text box
            submitTextArea();
        }

        d3.select("#toolbar-icon-"+currentTool).attr("class","toolbar-icon");
        currentTool = toolID;
        d3.select("#toolbar-icon-"+currentTool).attr("class","toolbar-icon selected");
    }

    //Shortcuts to check what tool the user is on
 
    function isPen(){return currentTool==0?true:false;}
    function isHand(){return currentTool==1?true:false;}
    function isEraser(){return currentTool==2?true:false;}
    function isLine(){return currentTool==3?true:false;}
    function isRect(){return currentTool==4?true:false;}
    function isLink(){return currentTool==5?true:false;}
    function isText(){return currentTool==6?true:false;}
    function isMouse(){return currentTool==7?true:false;}
    function isMove(){return currentTool==8?true:false;}
    function isImage(){return currentTool==9?true:false;}

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
    function initColorBar(){
        
        colorBar = {
            pens: [],
            svg: null,
            maxPens: 10,
            changecolor: null
        }
        d3.select("#colorBar-penBar").remove();
        colorBar.svg = d3.select("#colorBar").append("svg").attr("id","colorBar-penBar");
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
        // #endregion
    }

    function getPens(){
        return colorBar;
    }

    function changecolor(){
        let newcolor = "#"+d3.select("#colorBar-newcolor").html();
        // Check if there's a # before
        currentColor = newcolor;
        colorBar.changecolor(newcolor);
        colorBar.strokeSizeLine.attr("stroke", newcolor);
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

        //#whiteboard-textInputArea
        let fontSize = 12 + (currentStroke*2);
        d3.select("#whiteboard-textInputArea")
            .style("font-size",`${fontSize}px`)
            .style("line-height",`${fontSize}px`)
            .style("color",currentColor);

        d3.select("#whiteboard-textInputArea-container")
            .attr("x",textDrawArea.x)
            .attr("y",textDrawArea.y);


        let element = document.getElementById("whiteboard-textInputArea");

        // Check for overflow
        let isXOverflow = element.scrollWidth > element.clientWidth;
        let isYOverflow = element.scrollHeight > element.clientHeight;

        if(isXOverflow){
            textDrawArea.w += (element.scrollWidth-element.clientWidth);
            d3.select("#whiteboard-textInputArea").style("width",textDrawArea.w);
        }
        if(isYOverflow){
            textDrawArea.h += 20;
            d3.select("#whiteboard-textInputArea").style("height",textDrawArea.h);
        }
            
        document.getElementById("whiteboard-textInputArea").focus();
    }

    function submitTextArea(){
        let fontSize = 12 + (currentStroke*2);
        //When hitting enter
        let data = {
            text: util.getValueId("whiteboard-textInputArea"),
            x: textDrawArea.x+13,
            y: textDrawArea.y+13+fontSize-(2+Math.floor(currentStroke/5)) // All this math adjusts the generated text to align the text area
        };

        let line = newLine(data,3,currentColor,currentStroke);

        drawLine(svg.main,line);

        // clear the buffer
        buffer = [];
        textDrawArea = null;
        // clear the temp line
        d3.select("#temp-line").html(null);

        // Save in x seconds
        autoSaveTimeout();
    }
    // #endregion
    //==//==//==//==//==//==//
    // Background
    // #region
    function clearBackground(){
        svg.background.html("");
    }

    function generateBackground(type = thisBoard.bgType){
        svg.background.html("");

        //TODO maybe instead of redrawing the board on a pan, just transform the board?
        // Prevents massive lag from filling in a huge viewbox
        if(viewbox.scale > 2.1 || thisBoard.bgType == 0){
            return;
        }

        let backgroundBox = {
            x1: viewbox.x,
            y1: viewbox.y,
            x2: viewbox.x+viewbox.w,
            y2: viewbox.y+viewbox.h
        }

        let lineSpacing = 25;
        let backgroundDetailColour = "#ecf0f1";

        if(type == 1){ // lines
            for(let y = Math.floor(backgroundBox.y1-10); y < backgroundBox.y2;y++){
                if(y%lineSpacing==0){
                    svg.background.append("line")
                        .attr("x1",backgroundBox.x1)
                        .attr("x2",backgroundBox.x2)
                        .attr("y1",y)
                        .attr("y2",y)
                        .attr("stroke", backgroundDetailColour)
                        .attr("stroke-width", 0.5)
                        .attr("fill", "none");
                }
            }
        }else if(type == 2){ // dots
            for(let y = Math.floor(backgroundBox.y1-10); y < backgroundBox.y2+10;y++){
                if(y%lineSpacing==0){
                    for(let x = Math.floor(backgroundBox.x1-10); x < backgroundBox.x2+10;x++){
                        if(x%lineSpacing==0){
                            svg.background.append("circle")
                                .attr("fill",backgroundDetailColour)
                                .attr("r",1)
                                .attr("cx",x)
                                .attr("cy",y);
                        }
                    }
                }
            }
        }else if(type == 3){ // DnD grid
            for(let y = Math.floor(backgroundBox.y1-10); y < backgroundBox.y2+10;y++){
                if(y%lineSpacing==0){
                    for(let x = Math.floor(backgroundBox.x1-10); x < backgroundBox.x2+10;x++){
                        if(x%(lineSpacing*5)==0 && y%(lineSpacing*5)==0){
                            svg.background.append("circle")
                                .attr("fill",backgroundDetailColour)
                                .attr("r",2)
                                .attr("cx",x)
                                .attr("cy",y);
                        
                        }else if(x%lineSpacing==0){
                            svg.background.append("circle")
                                .attr("fill",backgroundDetailColour)
                                .attr("r",1)
                                .attr("cx",x)
                                .attr("cy",y);
                        }
                    }
                }
            }
        }
    }


    // #endregion

    

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
        keyManager.newEvent(80,0,function(){setTool(0,true)}); // pen
        keyManager.newEvent(72,0,function(){setTool(1,true)}); // Hand
        keyManager.newEvent(69,0,function(){setTool(2,true)}); // eraser
        keyManager.newEvent(76,0,function(){setTool(3,true)}); // line
        keyManager.newEvent(82,0,function(){setTool(4,true)}); // rect
        keyManager.newEvent(77,0,function(){setTool(8,true)}); // move
        keyManager.newEvent(84,0,function(){setTool(6,true)}); // text

        keyManager.newEvent(16,3,function(){if(!holdShift.isHeld) holdShift.isHeld = true;});
        keyManager.newUpEvent(16,function(){holdShift = {isHeld:false,x:null,y:null}});

    }


    return{
        init:init,
        getSVGSize:getSVGSize,
        setTool:setTool,
        save:save,
        getPens:getPens,
        changecolor:changecolor,
        generateBackground:generateBackground // for testing
    }
}();