whiteboard = function(){

    /**
     * Mouse enter vs mouse over
     * http://jsfiddle.net/ZCWvJ/7/
     * 
     * mouse leave vs mouse out
     * https://www.w3schools.com/jquery/tryit.asp?filename=tryjquery_event_mouseleave_mouseout
     */

    let svg = null; // hold d3 object of the svg
    let isDrawing = false; // Is the user currently drawing
    let buffer = []; // Buffer for the currently drawing ling
    let lastPointTime = 0; // Time of the last drawing point
    
    let thisBoard = null; // The current infiniboard that's being drawn on

    let currentTool = 0; // Current tool being used
    let currentToolAltCode = 0; // Used to set different versions of tools
    let currentStroke = 2; // Current selected stroke
    let currentColor = "white"; // Current selected color
    let currentLayer = 0; // Current Selected Layer
    let currentFill = "#fffff"; // Current Selected fill

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
    let selectedElement = null; // element that is currently being moved
    let tempTransform = {x:null,y:null};
    let mouse = {x:0,y:0};

    let imageResize = null;
    let attachedImage = null; // If the user selected an image from the nav bar

    let overTextArea = null; // Used to see if the mouse is over a text area to allow for editing 
    let previousTextArea = null; // Used to store the text area in it's pre-edited state

    /**
     * Function that runs to initialize the whiteboard and load the current board
     */
    function init(id){

        // Clear the svg properly
        d3.select("#drawingBoard-svg").selectAll("*").remove();

        // Clear all elements we're about to use (for reloading)
        d3.select("#drawingBoard")
            .html(null)
            .on("dragenter",()=>{
                inputBox.style("display",null);
            })

        // Create the drag an drop input area
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

                    for(let file of files){
                        let data = {
                            x: mouse.x,
                            y: mouse.y,
                            w: file.width,
                            h: file.height
                        }
                        let line = newLine(data,4,null,null,null,file.path);
                        drawLine(line);

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

        

        // Create the svg
        svg.parent = d3.select("#drawingBoard").append("svg")
            .attr("id","drawingBoard-svg")
            .attr("width", "100%")
            .attr("height", "100%");

        
        
        // Set the groups where to draw the objects
        svg.background = svg.parent.append("g").attr("id","drawingBoard-svg-background");
        svg.layerGroup = svg.parent.append("g");
        svg.temp = svg.parent.append("g").attr("id","temp-line");
        svg.layers = [];

        svg.parent.on("mousedown",mouseDown);
        svg.parent.on("mouseup",mouseUp)
        svg.parent.on("mousemove", mouseMove);

        
        // Look through all the layers
        for(let layer of thisBoard.layers){
            let svgLayer = svg.layerGroup.append("g").attr("id","svg-layer-"+layer.id);
            // draw all the objects in the current whiteboard
            for(let object of layer.objects){
                drawLine(object,svgLayer);
            }

            // Check if the layer is hidden
            if(!layer.isVisible){
                svgLayer.style("display","none");
            }

            svg.layers.push({
                svg:svgLayer,
                id:layer.id
            });
        }

        // Load the previous layer/stroke/colour
        if(thisBoard.currentColor != undefined){
            currentColor = thisBoard.currentColor;
        }else{
            currentColor = thisBoard.pens[0];
        }

        // if(thisBoard.currentLayer != undefined){
        //     currentLayer = thisBoard.currentLayer;
        // }else{
            currentLayer = thisBoard.layers[0];
        // }
        
        if(thisBoard.currentStroke != undefined){
            currentStroke = thisBoard.currentStroke;
        }else{
            currentStroke = 2;
        }

        if(thisBoard.currentFill != undefined){
            currentFill = thisBoard.currentFill;
        }else{
            currentFill = thisBoard.pens[0];
        }
        
        // If the type of board is DnD
        if(thisBoard.type == 1){
            // d3.select("#toolbar-dndIcons").append("div")
            //     .attr("id","toolbar-icon-10")
            //     .attr("class","toolbar-icon")
            //     .style("background-image","url('./images/check_white.png')")
            //     .attr("onclick","whiteboard.setTool(10)")
            //     .html("b");

            let textureGroup = svg.parent.append("g").append("defs");

            

            d3.select("#navBar-Titles").append("div")
                .attr("id","navBar-titles-textures")
                .attr("class","navBar-titles-containers")
                .append("div")
                .attr("class","navBar-titles-text")
                .html("Textures");

            for(let texture of textures){
                textureGroup.append("pattern")
                    .attr("id",texture.id)
                    .attr("patternUnits","userSpaceOnUse")
                    .attr("width",texture.dimensions)
                    .attr("height",texture.dimensions)
                    .append("image")
                    .attr("xlink:href",texture.path)
                    .attr("x",0)
                    .attr("y",0)
                    .attr("width",texture.dimensions)
                    .attr("height",texture.dimensions);
            }
        }
        
        
        // Set the background colour
        svg.parent.style("background-color",thisBoard.bgcolor);

        // Update the viewbox html with the viewbox object
        updateViewbox();

        // Init the colour/nav bar
        initColorBar();
        initNavBar();

        // Auto select the layer
        d3.select("#navBar-layers-container-"+currentLayer.id).attr("class","navBar-layers-container selected");

        // Draw the background if needs it
        generateBackground();

        // Setup the keyboard shortcuts
        setupKeyboardShortcuts();

        // Setup the right click menu
        initRightClickMenu();

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
    function drawLine(line,drawOnSvg = null){
        // https://www.d3indepth.com/shapes/#line-generator
        // https://github.com/d3/d3-shape/blob/v1.3.4/README.md#line
        // https://www.dashingd3js.com/svg-paths-and-d3js

        if(drawOnSvg == null){
            drawOnSvg = svg.layers.find(x=>x.id == currentLayer.id).svg;
        }

        // Append a new group for the draw object
        drawOnSvg = drawOnSvg.append("g").attr("id",`object${line.id}`);

        if(line.type == 0){ // Pen Tool
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
            drawOnSvg.append("path")
                .attr("d", drawLine(line.dots))
                .attr("stroke", line.color)
                .attr("stroke-width", line.stroke)
                .attr("fill", "none")
                .attr("stroke-linecap","round");

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
            drawOnSvg.append("rect")
                .attr("x",rectX)
                .attr("y",rectY)
                .attr("height",height)
                .attr("width",width)
                .attr("fill", line.fill)
                .attr("stroke-width", line.stroke)
                .attr("stroke", line.color);


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
            let svgLine = drawOnSvg.append("path")
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
            let textGroup = drawOnSvg.append("g")
                .on("mouseenter",()=>{
                    if(isCurrentLayer(line.id)){
                        overTextArea = line;
                    }
                    //TODO set cursor to the I
                })
                .on("mouseleave",()=>{
                    if(isCurrentLayer(line.id)){
                        overTextArea = null;
                    }
                    //TODO set cursor back to default
                });

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
            drawOnSvg.append("image")
                .attr("xlink:href", `file://${line.linkID}`)
                .attr("x",line.dots.x)
                .attr("y",line.dots.y)
                .attr("width",line.dots.w)
                .attr("height",line.dots.h)
                .attr("id",`image${line.id}`)
                .on("mousedown",()=>{
                    if((isMouse() || isRotate()) && isCurrentLayer(line.id)){
                        setTimeout(()=>{drawResize(line)},10);
                    }
                })
        }else if(line.type == 5){ // Custom Shape
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
            drawOnSvg.append("path")
                .attr("d", drawLine(line.dots))
                .attr("stroke", line.color)
                .attr("stroke-width", line.stroke)
                .attr("fill", line.fill)
                .attr("stroke-linecap","round");
                
        }else if(line.type == 6){ // Line Tool
            let coords = {
                x1: line.dots[0].x,
                y1: line.dots[0].y,
                x2: line.dots[1].x,
                y2: line.dots[1].y
            }

            if(line.linkID != 3){ // If the line isn't dashed
                drawOnSvg.append("line")
                    .attr("x1",coords.x1)
                    .attr("y1",coords.y1)
                    .attr("x2",coords.x2)
                    .attr("y2",coords.y2)
                    .attr("stroke", line.color)
                    .attr("stroke-width", line.stroke)
                    .attr("stroke-linecap","round");
            }else{ // If the line is dashed
                drawOnSvg.append("line")
                    .attr("x1",coords.x1)
                    .attr("y1",coords.y1)
                    .attr("x2",coords.x2)
                    .attr("y2",coords.y2)
                    .attr("stroke", line.color)
                    .attr("stroke-width", line.stroke)
                    .attr("stroke-dasharray",`${line.stroke*10} ${line.stroke*10}`)
                    .attr("stroke-linecap","round");
            }

            // Calculate the length of the line and arrow
            let lineLength = (coords.x2-coords.x1)!=0?(coords.x2-coords.x1):(coords.y2-coords.y1);
            let arrowLength = (lineLength/4);

            // https://math.stackexchange.com/questions/1314006/drawing-an-arrow
            let x3Change = (arrowLength/lineLength)*((coords.x1-coords.x2)*Math.cos(30* Math.PI/180)+(coords.y1-coords.y2)*Math.sin(30* Math.PI/180));
            let y3Change = (arrowLength/lineLength)*((coords.y1-coords.y2)*Math.cos(30* Math.PI/180)-(coords.x1-coords.x2)*Math.sin(30* Math.PI/180));
            let x4Change = (arrowLength/lineLength)*((coords.x1-coords.x2)*Math.cos(30* Math.PI/180)-(coords.y1-coords.y2)*Math.sin(30* Math.PI/180));
            let y4Change = (arrowLength/lineLength)*((coords.y1-coords.y2)*Math.cos(30* Math.PI/180)+(coords.x1-coords.x2)*Math.sin(30* Math.PI/180));

            // Opened end arrows
            if(line.linkID == 1 || line.linkID == 2){
                drawOnSvg.append("line")
                    .attr("x1",coords.x2)
                    .attr("y1",coords.y2)
                    .attr("x2",coords.x2+x3Change)
                    .attr("y2",coords.y2+y3Change)
                    .attr("stroke", line.color)
                    .attr("stroke-width", line.stroke)
                    .attr("stroke-linecap","round");

                drawOnSvg.append("line")
                    .attr("x1",coords.x2)
                    .attr("y1",coords.y2)
                    .attr("x2",coords.x2+x4Change)
                    .attr("y2",coords.y2+y4Change)
                    .attr("stroke", line.color)
                    .attr("stroke-width", line.stroke)
                    .attr("stroke-linecap","round");
            }
            if(line.linkID == 2){
                drawOnSvg.append("line")
                    .attr("x1",coords.x1)
                    .attr("y1",coords.y1)
                    .attr("x2",coords.x1-x3Change)
                    .attr("y2",coords.y1-y3Change)
                    .attr("stroke", line.color)
                    .attr("stroke-width", line.stroke)
                    .attr("stroke-linecap","round");

                drawOnSvg.append("line")
                    .attr("x1",coords.x1)
                    .attr("y1",coords.y1)
                    .attr("x2",coords.x1-x4Change)
                    .attr("y2",coords.y1-y4Change)
                    .attr("stroke", line.color)
                    .attr("stroke-width", line.stroke)
                    .attr("stroke-linecap","round");
            }

            // Filled end arrows
            if(line.linkID == 4 || line.linkID == 5){
                drawOnSvg.append("polygon")
                    .attr("points",`${coords.x2} ${coords.y2}, ${coords.x2+x3Change} ${coords.y2+y3Change}, ${coords.x2+x4Change} ${coords.y2+y4Change}`)
                    .style("fill",line.color)
                    .attr("stroke", line.color)
                    .attr("stroke-width", line.stroke)
                    .attr("stroke-linecap","round");
            }
            if(line.linkID == 5){
                drawOnSvg.append("polygon")
                    .attr("points",`${coords.x1} ${coords.y1}, ${coords.x1-x3Change} ${coords.y1-y3Change}, ${coords.x1-x4Change} ${coords.y1-y4Change}`)
                    .style("fill",line.color)
                    .attr("stroke", line.color)
                    .attr("stroke-width", line.stroke)
                    .attr("stroke-linecap","round");
            }
        }

        // If the tool is the move tool, set the selected element to this one
        drawOnSvg.on("mousedown",()=>{
            if(isMove() && d3.event.button==0 && isCurrentLayer(line.id)){ // if is move & left click & object is on the current layer
                selectedElement = line.id;
            }
        });

        // if the mouse moves over this line
        drawOnSvg.on("mousemove",()=>{
            // if the tools is set to erasers and is drawing (mouse down)
            if(isEraser() && isDrawing && isCurrentLayer(line.id)){
                // Delete the line from the array
                deleteLine(line.id);
                // set the save timeout
                autoSaveTimeout();
                selectedElement = null;
                overTextArea = null;
            }
        });

        // If this element is currently being moved
        if(isMove() && line.id == selectedElement){
            // Use the temp transform
            drawOnSvg.attr("transform",`translate(${tempTransform.x} ${tempTransform.y})`);
        }else{
            // Use the transform for this object
            drawOnSvg.attr("transform",`translate(${line.transform.x} ${line.transform.y})`);
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

        if(isRightClick()){
            openRightClickMenu();
        }else{
            closeRightClickMenu();
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

        if(attachedImage != null){ // If there is an image attached to the mouse
            attachedImage.dots.x = mouseDownPoint.x-(attachedImage.dots.w/2);
            attachedImage.dots.y = mouseDownPoint.y-(attachedImage.dots.h/2);
            selectedElement = null;
            updateLine(attachedImage);
            attachedImage = null;
            autoSaveTimeout();
        }

        if((isPen()||isCustomShape()) && isLeftClick()){
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
            if(!isTyping()){ // If the user isn't currently typing

                if(overTextArea == null){ // If the user isn't currently hovering over a text area
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
                        .on("input",()=>{
                            updateTextArea();
                            closeRightClickMenu();
                        })
                        .on("mouseenter",()=>{
                            // Flag for saying the mouse is over the text area container AND over the textarea
                            textDrawArea.isDraggable = false;
                        }).on("mouseleave",()=>{
                            // Remove the flag
                            textDrawArea.isDraggable = true;
                        })

                    // After 10 milliseconds, select focus on the textarea
                    setTimeout(()=>{document.getElementById("whiteboard-textInputArea").focus()},10);
                }
                else{ // If the user is currently hovering over a text area
                    let fontSize = 12 + (overTextArea.stroke*2);

                    // Setup the data for the text input area
                    textDrawArea = {
                        x: overTextArea.dots.x-13 + overTextArea.transform.x,
                        y: overTextArea.dots.y-13-fontSize+(2+Math.floor(overTextArea.stroke/5))+overTextArea.transform.y,
                        w: 215,
                        h: 115,
                        isMouseDownForMoving: false,
                        isDraggable:true
                    };

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
                        .style("color",overTextArea.color)
                        .style("width",textDrawArea.w)
                        .style("height",textDrawArea.h)
                        .property("value",overTextArea.dots.text)
                        .on("input",()=>{
                            updateTextArea();
                            closeRightClickMenu();
                        })
                        .on("mouseenter",()=>{
                            // Flag for saying the mouse is over the text area container AND over the textarea
                            textDrawArea.isDraggable = false;
                        }).on("mouseleave",()=>{
                            // Remove the flag
                            textDrawArea.isDraggable = true;
                        });

                        
                    // Set the stroke and colour to match
                    currentColor = overTextArea.color;
                    currentStroke = overTextArea.stroke;
                    d3.select("#colorBar-stroke-line").attr("stroke-width", currentStroke);
                    d3.select("#rightClickMenu-stroke-input").attr("value",currentStroke);
                    colorBar.changecolor(currentColor);
                    colorBar.strokeSizeLine.attr("stroke", currentColor);
                    initRightClickMenu();

                    // Save the previous text area
                    previousTextArea = overTextArea;

                    deleteLine(overTextArea.id);

                    // After 10 milliseconds, select focus on the textarea
                    setTimeout(()=>{document.getElementById("whiteboard-textInputArea").focus()},10);
                }
                
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
                let line = newLine(data,4,null,null,null,image.path);
                drawLine(line);

                autoSaveTimeout();
            });
        }
        else if(isHand() || isMiddleClick()){
            //clearBackground();
        }else if(isMouse() || isRotate()){
            if(imageResize == null){
                closeMenus();
            }
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
        if(isPen() || isLink() || isCustomShape()){
            if(buffer.length > 1){
                // Draw the line in the buffer

                if(isPen()){
                    let line = newLine(buffer,0,currentColor,currentStroke,null);
                    drawLine(line);
                    
                    // clear the buffer
                    buffer = [];
                }else if(isLink()){
                    // Make sure the line goes back to the start
                    buffer.push({x:buffer[0].x,y:buffer[0].y});

                    // Create a new popup getting what board to link to
                    popup.newBoard((isNewBoard,boardData)=>{
                        if(isNewBoard){ // If a new board is to be created
                            let newBoardID = boxManager.newBoard(boardData);
                            
                            let line = newLine(buffer,2,currentColor,currentStroke,null,newBoardID);
                            drawLine(line);
                            save();
                        }else{ // If no new board is created
                            if(boardData != null){ // If they didn't close the popup
                                let line = newLine(buffer,2,currentColor,currentStroke,null,boardData.id);
                                drawLine(line);
                                
                                save();
                            }else{ // If they closed the popup
                                console.log("popup closed");
                            }
                        }
                        // clear the buffer
                        buffer = [];
                    });
                }else if(isCustomShape()){
                    // Make sure the line goes back to the start
                    buffer.push({x:buffer[0].x,y:buffer[0].y});

                    let line = null;
                    if(currentToolAltCode == 0){
                        line = newLine(buffer,5,currentColor,currentStroke,currentFill);
                    }else if(currentToolAltCode == 1){
                        line = newLine(buffer,5,"none",currentStroke,currentFill);
                    }else if(currentToolAltCode == 2){
                        line = newLine(buffer,5,currentColor,currentStroke,"none");
                    }

                    drawLine(line);
                    
                    // clear the buffer
                    buffer = [];
                }


                autoSaveTimeout();
            }
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
            if(mouseDownPoint != null){
                buffer = [{x:mouseDownPoint.x,y:mouseDownPoint.y},{x:mouse.x,y:mouse.y}];

                // Draw the line in the buffer

                if(isLine()){
                    // Check if the height and width is 0
                    if((buffer[0].x - buffer[1].x) != 0 || (buffer[0].y - buffer[1].y) != 0){
                        if(holdShift.isHeld){
                            svg.temp.html(null);
        
                            // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                            if(Math.abs(mouse.x-holdShift.x)>Math.abs(mouse.y-holdShift.y)){
        
                                svg.temp.append("line")
                                    .attr("x1",mouse.x)
                                    .attr("y1",mouseDownPoint.y)
                                    .attr("x2",mouseDownPoint.x)
                                    .attr("y2",mouseDownPoint.y)
                                    .attr("stroke", currentColor)
                                    .attr("stroke-width", currentStroke);
        
                                buffer = [{x:mouseDownPoint.x,y:mouseDownPoint.y},{x:mouse.x,y:mouseDownPoint.y}];
                                let line = newLine(buffer,6,currentColor,currentStroke,null,currentToolAltCode);
                                drawLine(line);
                            }else if(Math.abs(mouse.x-holdShift.x)<Math.abs(mouse.y-holdShift.y)){
        

                                buffer = [{x:mouseDownPoint.x,y:mouseDownPoint.y},{x:mouseDownPoint.x,y:mouse.y}];
                                let line = newLine(buffer,6,currentColor,currentStroke,null,currentToolAltCode);
                                drawLine(line);
                            }
                        }else{
                            let line = newLine(buffer,6,currentColor,currentStroke,null,currentToolAltCode);
                            drawLine(line);
                        }
                        
                    }
                }else if(isRect()){
                    // Check if the height or width is 0
                    if((buffer[0].x - buffer[1].x) != 0 || (buffer[0].y - buffer[1].y) != 0){
                        let line = null;
                        if(currentToolAltCode == 0){
                            line = newLine(buffer,1,currentColor,currentStroke,currentFill);
                        }else if(currentToolAltCode == 1){
                            line = newLine(buffer,1,"none",currentStroke,currentFill);
                        }else if(currentToolAltCode == 2){
                            line = newLine(buffer,1,currentColor,currentStroke,"none");
                        }
                        drawLine(line);
                    }
                }
                

                // clear the buffer
                buffer = [];
                // clear the temp line
                d3.select("#temp-line").html(null);

                // Save in x seconds
                autoSaveTimeout();
            }
        }
        if(isMove() && selectedElement != null && imageResize == null){ // If the object was just moved
            if(tempTransform.x != null || tempTransform.y != null){ // Make sure something was moved
            
                let line = getLine(selectedElement);

                let oldLine = JSON.parse(JSON.stringify(line));

                
                line.transform.x = tempTransform.x;
                line.transform.y = tempTransform.y;

                addToHistory("move",JSON.parse(JSON.stringify(line)),oldLine);

                updateLine(line);
                autoSaveTimeout();
            }
            tempTransform = {x:null,y:null};
            selectedElement = null;
        }
        if(textDrawArea != null && textDrawArea.isMouseDownForMoving){
            textDrawArea.isMouseDownForMoving = false;
        }

        isDrawing = false;        
        mouseDownPoint = null;

        if(imageResize != null){ // If they were adjusting an image size
            let image = getLine(imageResize.id);
            let oldLine = JSON.parse(JSON.stringify(image));

            if(imageResize.tx == undefined||imageResize.ty == undefined||imageResize.tw == undefined ||imageResize.th == undefined){

                imageResize = null;
                selectedElement = null;
            }else{
                // Apply the temp dimensions 
                image.dots.x = imageResize.tx;
                image.dots.y = imageResize.ty;
                image.dots.w = imageResize.tw;
                image.dots.h = imageResize.th;

                imageResize = null;
                selectedElement = null;

                addToHistory("resize",JSON.parse(JSON.stringify(image)),oldLine);

                updateLine(image);
                autoSaveTimeout();
            }

        }

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


        if(attachedImage != null){ // If there is an image attached to the mouse
            attachedImage.dots.x = mouse.x-(attachedImage.dots.w/2);
            attachedImage.dots.y = mouse.y-(attachedImage.dots.h/2);
            updateLine(attachedImage);
        }

        if(mouseDownPoint != null){ // If the mouse has been pressed down
            if(isHand() || mouseDownPoint.button == 1){
                viewbox.x = viewbox.x - (mouse.gx-mouse.lgx)*viewbox.scale;
                viewbox.y = viewbox.y - (mouse.gy-mouse.lgy)*viewbox.scale;

                //generateBackground();
                updateViewbox();
            }

            if(holdShift.isHeld){
                if(holdShift.x == null && holdShift.y == null){
                    holdShift.x = mouse.x;
                    holdShift.y = mouse.y;
                }
            }
        }
        if(isPen() || isLink()){
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
                let coords = {};
                if(holdShift.isHeld){
                    // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                    if(Math.abs(mouse.x-holdShift.x)>Math.abs(mouse.y-holdShift.y)){
                        coords.x1 = mouseDownPoint.x;
                        coords.x2 = mouse.x;
                        coords.y1 = mouseDownPoint.y;
                        coords.y2 = mouseDownPoint.y;
                    }else if(Math.abs(mouse.x-holdShift.x)<Math.abs(mouse.y-holdShift.y)){
                        coords.x1 = mouseDownPoint.x;
                        coords.x2 = mouseDownPoint.x;
                        coords.y1 = mouseDownPoint.y;
                        coords.y2 = mouse.y;   
                    }
                }else{
                    coords.x2 = mouse.x;
                    coords.x1 = mouseDownPoint.x;
                    coords.y2 = mouse.y;
                    coords.y1 = mouseDownPoint.y; 
                }
                svg.temp.html(null);

                if(currentToolAltCode != 3){ // If the line isn't dashed
                    svg.temp.append("line")
                        .attr("x1",coords.x1)
                        .attr("y1",coords.y1)
                        .attr("x2",coords.x2)
                        .attr("y2",coords.y2)
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("stroke-linecap","round");
                }else{ // If the line is dashed
                    svg.temp.append("line")
                        .attr("x1",coords.x1)
                        .attr("y1",coords.y1)
                        .attr("x2",coords.x2)
                        .attr("y2",coords.y2)
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("stroke-dasharray",`${currentStroke*10} ${currentStroke*10}`)
                        .attr("stroke-linecap","round");
                }
                

                // Calculate the length of the line and arrow
                let lineLength = (coords.x2-coords.x1)!=0?(coords.x2-coords.x1):(coords.y2-coords.y1);
                let arrowLength = (lineLength/4);
                
                if(lineLength == 0){// Line is just a dot
                    return;
                }

                // https://math.stackexchange.com/questions/1314006/drawing-an-arrow
                let x3Change = (arrowLength/lineLength)*((coords.x1-coords.x2)*Math.cos(30* Math.PI/180)+(coords.y1-coords.y2)*Math.sin(30* Math.PI/180));
                let y3Change = (arrowLength/lineLength)*((coords.y1-coords.y2)*Math.cos(30* Math.PI/180)-(coords.x1-coords.x2)*Math.sin(30* Math.PI/180));
                let x4Change = (arrowLength/lineLength)*((coords.x1-coords.x2)*Math.cos(30* Math.PI/180)-(coords.y1-coords.y2)*Math.sin(30* Math.PI/180));
                let y4Change = (arrowLength/lineLength)*((coords.y1-coords.y2)*Math.cos(30* Math.PI/180)+(coords.x1-coords.x2)*Math.sin(30* Math.PI/180));

                // Opened end arrows
                if(currentToolAltCode == 1 || currentToolAltCode == 2){
                    svg.temp.append("line")
                        .attr("x1",coords.x2)
                        .attr("y1",coords.y2)
                        .attr("x2",coords.x2+x3Change)
                        .attr("y2",coords.y2+y3Change)
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("stroke-linecap","round");

                    svg.temp.append("line")
                        .attr("x1",coords.x2)
                        .attr("y1",coords.y2)
                        .attr("x2",coords.x2+x4Change)
                        .attr("y2",coords.y2+y4Change)
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("stroke-linecap","round");
                }
                if(currentToolAltCode == 2){
                    svg.temp.append("line")
                        .attr("x1",coords.x1)
                        .attr("y1",coords.y1)
                        .attr("x2",coords.x1-x3Change)
                        .attr("y2",coords.y1-y3Change)
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("stroke-linecap","round");

                    svg.temp.append("line")
                        .attr("x1",coords.x1)
                        .attr("y1",coords.y1)
                        .attr("x2",coords.x1-x4Change)
                        .attr("y2",coords.y1-y4Change)
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("stroke-linecap","round");
                }

                // Filled end arrows
                if(currentToolAltCode == 4 || currentToolAltCode == 5){
                    svg.temp.append("polygon")
                        .attr("points",`${coords.x2} ${coords.y2}, ${coords.x2+x3Change} ${coords.y2+y3Change}, ${coords.x2+x4Change} ${coords.y2+y4Change}`)
                        .style("fill",currentColor)
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("stroke-linecap","round");
                }
                if(currentToolAltCode == 5){
                    svg.temp.append("polygon")
                        .attr("points",`${coords.x1} ${coords.y1}, ${coords.x1-x3Change} ${coords.y1-y3Change}, ${coords.x1-x4Change} ${coords.y1-y4Change}`)
                        .style("fill",currentColor)
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("stroke-linecap","round");
                }

            }
        }
        if(isRect()){
            if(isDrawing){
                let height = mouseDownPoint.y>=mouse.y?mouseDownPoint.y-mouse.y:mouse.y-mouseDownPoint.y;
                let width = mouseDownPoint.x>=mouse.x?mouseDownPoint.x-mouse.x:mouse.x-mouseDownPoint.x;

                let rectX = mouseDownPoint.x>=mouse.x?mouse.x:mouseDownPoint.x;
                let rectY = mouseDownPoint.y>=mouse.y?mouse.y:mouseDownPoint.y;

                svg.temp.html(null);

                if(currentToolAltCode == 0){
                    svg.temp.append("rect")
                        .attr("x",rectX)
                        .attr("y",rectY)
                        .attr("height",height)
                        .attr("width",width)
                        .attr("fill", currentFill)
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke);
                }else if(currentToolAltCode == 1){
                    svg.temp.append("rect")
                        .attr("x",rectX)
                        .attr("y",rectY)
                        .attr("height",height)
                        .attr("width",width)
                        .attr("fill", currentFill);
                }else if(currentToolAltCode == 2){
                    svg.temp.append("rect")
                        .attr("x",rectX)
                        .attr("y",rectY)
                        .attr("height",height)
                        .attr("width",width)
                        .attr("fill", "none")
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke);
                }
                
            }
        }
        if(isMove() && selectedElement != null && imageResize == null){
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
        if(isMouse()){
            if(imageResize != null){
                if(imageResize.point == "tl"){
                    // If dragging from top left, make the mouse x,y the new image x,y
                    // Then calculate the new width+height by finding the difference between the new x,y and the old
                    // Apply adjustments for the transform that may or may not have been added
                    let newHeight = imageResize.h + ((imageResize.y + imageResize.img.transform.y) - mouse.y);
                    let newWidth = imageResize.w + ((imageResize.x + imageResize.img.transform.x) - mouse.x);

                    imageResize.tx = mouse.x - imageResize.img.transform.x;
                    imageResize.ty = mouse.y - imageResize.img.transform.y;
                    imageResize.tw = newWidth;
                    imageResize.th = newHeight;
                }else if(imageResize.point == "tr"){
                    // If dragging from the top right, y changes but x doesn't
                    let newHeight = imageResize.h + ((imageResize.y + imageResize.img.transform.y) - mouse.y);
                    let newWidth = (mouse.x-imageResize.x) - imageResize.img.transform.x;

                    imageResize.tx = imageResize.x;
                    imageResize.ty = mouse.y - imageResize.img.transform.y;
                    imageResize.tw = newWidth;
                    imageResize.th = newHeight;
                }else if(imageResize.point == "bl"){
                    let newHeight = (mouse.y-imageResize.y) - imageResize.img.transform.y;
                    let newWidth = imageResize.w + ((imageResize.x + imageResize.img.transform.x) - mouse.x);

                    imageResize.tx = mouse.x - imageResize.img.transform.x;
                    imageResize.ty = imageResize.y;
                    imageResize.tw = newWidth;
                    imageResize.th = newHeight;
                }else if(imageResize.point == "br"){
                    // If dragging from the top right, y changes but x doesn't
                    let newHeight = (mouse.y-imageResize.y)- imageResize.img.transform.y;
                    let newWidth = (mouse.x-imageResize.x)- imageResize.img.transform.x;

                    imageResize.tx = imageResize.x;
                    imageResize.ty = imageResize.y;
                    imageResize.tw = newWidth;
                    imageResize.th = newHeight;
                }

                // Check if the new height/width is less than 10
                if(imageResize.tw < 25){
                    imageResize.tw = 25;
                }
                if(imageResize.th < 25){
                    imageResize.th = 25;
                }

                // Update the image
                d3.select("#image"+imageResize.id)
                    .attr("x",imageResize.tx)
                    .attr("y",imageResize.ty)
                    .attr("width",imageResize.tw)
                    .attr("height",imageResize.th);

                // Update the resizer balls
                d3.select("#imageResizeCircle-tl")
                    .attr("cx",imageResize.tx)
                    .attr("cy",imageResize.ty);

                d3.select("#imageResizeCircle-tr")
                    .attr("cx",imageResize.tx+imageResize.tw)
                    .attr("cy",imageResize.ty);

                d3.select("#imageResizeCircle-bl")
                    .attr("cx",imageResize.tx)
                    .attr("cy",imageResize.ty+imageResize.th);

                d3.select("#imageResizeCircle-br")
                    .attr("cx",imageResize.tx+imageResize.tw)
                    .attr("cy",imageResize.ty+imageResize.th);
            }
        }
        if(isCustomShape()){
            let currentTime = Date.now();
            
            // if the user is drawing, add the x,y to the buffer
            if(isDrawing){
                // if it has been x milliseconds since the last coordinate saved
                if(currentTime>=lastPointTime+10){
                    if(holdShift.isHeld){
                        // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                        if(Math.abs(mouse.x-holdShift.x)>Math.abs(mouse.y-holdShift.y)){
                            lastPointTime = currentTime;
                            buffer.push({x:mouse.x,y:holdShift.y});
                        }else if(Math.abs(mouse.x-holdShift.x)<Math.abs(mouse.y-holdShift.y)){
                            lastPointTime = currentTime;
                            buffer.push({x:holdShift.x,y:mouse.y});
                        }
                    }else{
                        lastPointTime = currentTime;
                        buffer.push({x:mouse.x,y:mouse.y});
                    }

                    // Draw the new shape
                    svg.temp.html(null);

                    // Create the line
                    let drawLine = d3.line().curve(d3.curveCardinal);

                    // for every x and y, set the value to (object passed).x
                    drawLine.x((d)=>{
                        return d.x;
                    });
                    drawLine.y((d)=>{
                        return d.y;
                    });

                    if(currentToolAltCode == 0){
                        svg.temp.append("path")
                            .attr("d", drawLine(buffer))
                            .attr("stroke", currentColor)
                            .attr("stroke-width", currentStroke)
                            .attr("fill", currentFill)
                            .attr("stroke-linecap","round");
                    }else if(currentToolAltCode == 1){
                        svg.temp.append("path")
                            .attr("d", drawLine(buffer))
                            .attr("fill", currentFill)
                            .attr("stroke-linecap","round");
                    }else if(currentToolAltCode == 2){
                        svg.temp.append("path")
                            .attr("d", drawLine(buffer))
                            .attr("stroke", currentColor)
                            .attr("stroke-width", currentStroke)
                            .attr("fill", "none")
                            .attr("stroke-linecap","round");
                    }
                }
            }
        }
    }


    // #endregion
    //==//==//==//==//==//==//
    // saving
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

        // Save current pen/layer/stroke
        thisBoard.currentColor = currentColor;
        thisBoard.currentLayer = currentLayer;
        thisBoard.currentStroke = currentStroke;
        thisBoard.currentFill = currentFill;

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
    // new lines
    // #region

    /**
     * Saves the line to the current board
     * @param {Array} buffer Array of dots for the line
     * @param {Number} type type of line
     * @param {String} color color of the line
     * @param {Number} stroke Stroke size of the line
     * @param {String} fill fill colour
     * @param {?String} link id to link to
     */
    function newLine(buffer,type,color,stroke,fill,link=null){
        let obj = {
            id: thisBoard.idCounter++,
            type:type,
            color:color,
            stroke:stroke,
            fill:fill,
            linkID:link,
            dots:buffer,
            transform: {
                x:0,
                y:0
            }
        };
        // Add the object to the current layer
        currentLayer.objects.push(obj);

        if(previousTextArea == null){ // If we're editing a text area, don't add this to history
            addToHistory("add",obj);
        }
        
        initNavBar();
        return obj;
    }


    function deleteLine(id,isUndo = false){
        let location = currentLayer.objects.findIndex(x=>x.id == id);

        if(location == -1){ // 2 eraser events fired resulting in no id
            return;
        }
        // Add the object to the history
        if(previousTextArea == null && isUndo == false){ // If we're editing a text area, don't add this to history
            addToHistory("delete",null,getLine(id));
        }

        let deleted = currentLayer.objects.splice(location,1)[0];

        

        d3.selectAll(`#object${deleted.id}`).on("click",null).remove();
    }

    function getLine(id){

        for(let layer of thisBoard.layers){
            for(let object of layer.objects){
                if(object.id == id){
                    return object;
                }
            }
        }

        return null;
    }

    function updateLine(line){
        d3.select(`#object${line.id}`).remove();

        if(line.type == 4){ // image
            drawLine(line);
            drawResize(line);
        }else{
            drawLine(line);
        }
    }

    // #endregion
    //==//==//==//==//==//==//
    // tools
    // #region

    /**
     * Changes the current tool to the passed number
     * @param {Number} toolID number for the tool
     */
    function setTool(toolID,altCode = 0){
        closeMenus();

        d3.select("#toolbar-icon-"+currentTool).attr("class","toolbar-icon");
        currentTool = toolID;
        currentToolAltCode = altCode;
        d3.select("#toolbar-icon-"+currentTool).attr("class","toolbar-icon selected");

        // Check if the new tool should be shown in the toolbar
        if(toolID == 3){// if line
            d3.select("#toolbar-icon-3")
                .style("background-image",d3.select("#toolbar-line-"+altCode).style("background-image"))
                .attr("onclick",null)
                .on("click",()=>{setTool(3,altCode)})

        }else if(toolID == 4){// if rect
            d3.select("#toolbar-icon-4")
                .style("background-image",d3.select("#toolbar-rect-"+altCode).style("background-image"))
                .attr("onclick",null)
                .on("click",()=>{setTool(4,altCode)})
        }else if(toolID == 7){
            d3.select("#toolbar-icon-7")
                .style("background-image","url(./images/mouse_white.png)")
                .attr("onclick",null)
                .on("click",()=>{setTool(7)})
        }else if(toolID == 11){// if rect
            d3.select("#toolbar-icon-11")
                .style("background-image",d3.select("#toolbar-customShape-"+altCode).style("background-image"))
                .attr("onclick",null)
                .on("click",()=>{setTool(11,altCode)})
        }else if(toolID == 12){
            d3.select("#toolbar-icon-7")
                .style("background-image","url(./images/mouse_rotate_white.png)")
                .attr("onclick",null)
                .on("click",()=>{setTool(12)})
        }
    }

    function toolShortcut(toolID){
        // If they're typing and a keyboard shortcut is clicked
        if(isTyping() && isKeyboardShortcut){
            // Ignore it
            return;
        }

        closeMenus();

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
    function isMove(){return currentTool==7?true:false;} // Was changed to be the same as mouse
    function isImage(){return currentTool==9?true:false;}
    function isCustomShape(){return currentTool==11?true:false;}
    function isRotate(){return currentTool==12?true:false;}

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
            closeRightClickMenu();
            currentColor = newcolor;
            currentPenTip.attr("fill",newcolor);
            currentPenShaft.attr("fill",newcolor);
            colorBar.strokeSizeLine.attr("stroke", newcolor);
            currentFillBox.attr("stroke", newcolor);
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

        x+=45
        // Draw the fill colour
        let currentFillGroup = colorBar.svg.append("g");

        let currentFillBox = currentFillGroup.append("rect")
            .attr("x",x)
            .attr("width",34)
            .attr("y",3)
            .attr("height",30)
            .attr("fill",currentFill)
            .attr("stroke-width", 2)
            .attr("rx",5)
            .attr("stroke", currentColor);

        colorBar.changeFill = function(newcolor){
            closeRightClickMenu();
            currentFill = newcolor;
            currentFillBox.attr("fill", newcolor);
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

            group.on("contextmenu",()=>{
                colorBar.changeFill(colorBar.pens[i].getcolor());
            })

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
            closeRightClickMenu();
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
            .attr("id","colorBar-stroke-line")
            .attr("stroke-width", currentStroke)
            .attr("fill", "none");

        x+= 110;     

        let strokeIncreaseGroup = colorBar.svg.append("g")
        .attr("id","colorBar-strokeIncreaseButton");

        strokeIncreaseGroup.on("click",()=>{
            closeRightClickMenu();
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

    function changeFill(){
        let newcolor = "#"+d3.select("#colorBar-newFill").html();
        // Check if there's a # before
        currentFill = newcolor;
        colorBar.changeFill(newcolor);
    }
    // #endregion
    //==//==//==//==//==//==//
    // Nav bar
    // #region 

    function initNavBar(){

        
        d3.select("#navBar-content-boards").html(null);
        d3.select("#navBar-content-history").html(null);
        d3.select("#navBar-content-textures").html(null);
        d3.select("#navBar-side").on("click",()=>{
            openNavBar();
        });

        //#region draw tabs on left side
        d3.select("#navBar-titles-history").on("click",()=>{
            resetTabs();
            d3.select("#navBar-content-history").style("display",null);
            d3.select("#navBar-titles-history").attr("class","navBar-titles-containers selected");
        });

        
        d3.select("#navBar-titles-boards").on("click",()=>{
            resetTabs();
            d3.select("#navBar-content-boards").style("display",null);
            d3.select("#navBar-titles-boards").attr("class","navBar-titles-containers selected");
        });

        d3.select("#navBar-titles-layers").on("click",()=>{
            resetTabs();
            d3.select("#navBar-content-layers").style("display",null);
            d3.select("#navBar-titles-layers").attr("class","navBar-titles-containers selected");
        });

        d3.select("#navBar-titles-images").on("click",()=>{
            resetTabs();
            d3.select("#navBar-content-images").style("display",null);
            d3.select("#navBar-titles-images").attr("class","navBar-titles-containers selected");
            d3.select("#navBar-content-images").style("background-image","url('./images/loading_white.gif')");
            initNavBarImages()
        });

        // if a dnd board
        if(thisBoard.type == 1){
            d3.select("#navBar-titles-textures").on("click",()=>{
                resetTabs();
                d3.select("#navBar-content-textures").style("display",null);
                d3.select("#navBar-titles-textures").attr("class","navBar-titles-containers selected");
                initNavBarImages()
            });
        }
        //#endregion
        
        //#region Draw the boards panel
        let boardsPanel = d3.select("#navBar-content-boards");
        let boards = boxManager.getBox().boards;
        for(let board of boards){
            let selector = boardsPanel.append("div").html(board.name).attr("class","navBar-content-board");
            if(board.name == thisBoard.name){
                selector.attr("class","navBar-content-board current");
            }
            selector.on("click",()=>{
                init(board.id)
            });
        }

        //#endregion

        //#region Draw the history panel
        let historyPanel = d3.select("#navBar-content-history");

        let undoCount = 1;
        let redoCount = thisBoard.history.filter(x=>x.undone == true && x.overwritten != true).length;

        for(let event of thisBoard.history){
            // if this event has been overwritten, skip it
            if(event.overwritten == true){
                continue;
            }

            let objType = event.new != null?event.new.type:event.old.type;
            let objTypeString = "";
            let bgColor = "";
            let objTitle = "";
            switch(objType){
                case 0: objTypeString = "Pen Line";break;
                case 1: objTypeString = "Rectangle";break;
                case 2: objTypeString = "Link";break;
                case 3: objTypeString = "Text";break;
                case 4: objTypeString = "Image";break;
                default: objTypeString = "default";break;
            }
            switch(event.type){
                case "move":bgColor="#9b59b6";objTitle="Moved";break;
                case "add":bgColor="#2ecc71";objTitle="Added";break;
                case "delete":bgColor="#e74c3c";objTitle="Deleted";break;
                case "edit":bgColor="#f1c40f";objTitle="Edited";break;
                case "resize":bgColor="#9b59b6";objTitle="Resized";break;
                default: bgColor="#ffffff";objTitle="????";break;
            }
            let container = historyPanel.append("div")
                .attr("class","navBar-content-history-container")

            if(event.undone == true){
                container.append("div")
                    .attr("class","navBar-content-history-title-undone")
                    .html(`${objTitle} ${objTypeString}`);

                container.on("click",function(x){return function(){return redoX(x)}}(redoCount))
                redoCount--;
            }else{
                container.append("div")
                    .attr("class","navBar-content-history-title")
                    .style("border",`1px solid ${bgColor}`)
                    .style("color",bgColor)
                    .html(`${objTitle} ${objTypeString}`);

                container.on("click",function(x){return function(){return undoX(x)}}(undoCount))
                undoCount++;
            }
            

        }

        //#endregion

        //#region Draw the layers
        let layerPanel = d3.select("#navBar-content-layers").html("");
        layerPanel.append("div").html("Add new layer")
            .on("click",()=>{
                let id = boxManager.newLayer(thisBoard.id);
                svg.layers.push({
                    svg: svg.layerGroup.append("g").attr("id","svg-layer-"+id),
                    id: id
                });
                initNavBar();
            })

        for(let layer of thisBoard.layers){
            let layerContainer = layerPanel.append("div")
                .attr("class","navBar-layers-container")
                .attr("id","navBar-layers-container-"+layer.id);
                

            let visibleArea = layerContainer.append("div")
                .attr("class","navBar-layers-visible")
                .attr("id","navBar-layers-visible-"+layer.id)
                .style("background-image","url('./images/check_white.png')")
                .on("click",()=>{
                    // If the checkmark is clicked, turn off this layer
                    layer.isVisible = !layer.isVisible;
                    // Hide it in the svg
                    if(layer.isVisible){
                        d3.select(`#svg-layer-${layer.id}`).style("display",null);
                        d3.select("#navBar-layers-visible-"+layer.id).style("background-image","url('./images/check_white.png')")
                    }else{
                        d3.select(`#svg-layer-${layer.id}`).style("display","none");
                        d3.select("#navBar-layers-visible-"+layer.id).style("background-image","url('./images/x_white.png')")
                    }
                    
                });

            let textArea = layerContainer.append("div")
                .on("click",()=>{
                    // Check if the current layer isnt this layer
                    if(currentLayer != layer){
                        d3.select("#navBar-layers-container-"+currentLayer.id).attr("class","navBar-layers-container");
                        console.log(`Change layer: ${layer.name}`);
                        currentLayer = layer;
                        d3.select("#navBar-layers-container-"+currentLayer.id).attr("class","navBar-layers-container selected");
                    }else{
                        // Draw a text area where the name goes to change the name
                        util.setValueId("navBar-layers-rename-"+layer.id,layer.name);
                        d3.select("#navBar-layers-name-"+layer.id).style("display","none");
                        d3.select("#navBar-layers-rename-"+layer.id).style("display",null);
                        document.getElementById("navBar-layers-rename-"+layer.id).focus();

                        // When the user unfocuses from the text area
                        d3.select("#navBar-layers-rename-"+layer.id).on("focusout",()=>{
                            // save the new layer name
                            layer.name = util.getValueId("navBar-layers-rename-"+layer.id);
                            d3.select("#navBar-layers-name-"+layer.id).style("display",null).html(layer.name);
                            d3.select("#navBar-layers-rename-"+layer.id).style("display","none").on("focusout",null);
                        })
                    }
                });

            textArea.append("div").attr("class","navBar-layers-name").attr("id","navBar-layers-name-"+layer.id).html(layer.name);
            textArea.append("input").attr("class","navBar-layers-rename").attr("id","navBar-layers-rename-"+layer.id).attr("type","text").style("display","none");
            textArea.append("div").attr("class","navBar-layers-info").html(`${layer.objects.length} Objects`);

            if(layer.isVisible){
                d3.select(`#svg-layer-${layer.id}`).style("display",null);
                visibleArea.style("background-image","url('./images/check_white.png')")
            }else{
                d3.select(`#svg-layer-${layer.id}`).style("display","none");
                visibleArea.style("background-image","url('./images/x_white.png')")
            }
            d3.select("#navBar-layers-container-"+currentLayer.id).attr("class","navBar-layers-container selected");
        }

        //#endregion

        //#region Draw the textures
        let texturePanel = d3.select("#navBar-content-textures");

        for(let texture of textures){
            texturePanel.append("div")
                .attr("class","navBar-content-textures-card")
                .style("background-image",`url("${texture.path}")`)
                .on("click",()=>{
                    colorBar.changeFill(`url(#${texture.id})`)
                    
                    console.log(currentFill);
                })
        }
        //#endregion

        /**
         * Runs the undo function x amount of times
         * @param {Number} amount Number of times to undo
         */
        function undoX(amount){
            for(let i = 0; i<amount;i++){
                undo();
            }
        }

        /**
         * Runs the redo function x amount of times
         * @param {Number} amount Number of times to redo
         */
        function redoX(amount){
            console.log(amount);
            for(let i = 0; i<amount;i++){
                redo();
            }
        }

        /**
         * Resets the navbar tabs
         */
        function resetTabs(){
            d3.select("#navBar-content-boards").style("display","none");
            d3.select("#navBar-content-history").style("display","none");
            d3.select("#navBar-content-layers").style("display","none");
            d3.select("#navBar-content-images").style("display","none");

            d3.select("#navBar-titles-boards").attr("class","navBar-titles-containers");
            d3.select("#navBar-titles-history").attr("class","navBar-titles-containers");
            d3.select("#navBar-titles-layers").attr("class","navBar-titles-containers");
            d3.select("#navBar-titles-images").attr("class","navBar-titles-containers");

            if(thisBoard.type == 1){
                d3.select("#navBar-content-textures").style("display","none");
                d3.select("#navBar-titles-textures").attr("class","navBar-titles-containers");
            }
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
        d3.select("#navBar").transition().duration(100).style("right","-230px");
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

        // If it is an empty text box
        if(util.getValueId("whiteboard-textInputArea") == ""){
            // clear the buffer
            buffer = [];
            textDrawArea = null;
            // clear the temp line
            d3.select("#whiteboard-textInputArea").on("input",null);
            svg.temp.selectAll("*").remove();
            return;
        }

        let data = {
            text: util.getValueId("whiteboard-textInputArea"),
            x: textDrawArea.x+13,
            y: textDrawArea.y+13+fontSize-(2+Math.floor(currentStroke/5)) // All this math adjusts the generated text to align the text area
        };

        let line = newLine(data,3,currentColor,currentStroke,null);

        // Draw the new text area
        drawLine(line);

        // If they were just editing a text area
        if(previousTextArea != null){
            addToHistory("edit",line,previousTextArea);
            previousTextArea = null;
            overTextArea = null;
        }

        // clear the buffer
        buffer = [];
        textDrawArea = null;
        // clear the temp line
        d3.select("#whiteboard-textInputArea").on("input",null);
        svg.temp.selectAll("*").remove();

        // Save in x seconds
        autoSaveTimeout();
    }
    // #endregion
    //==//==//==//==//==//==//
    // Background
    // #region
    function clearBackground(){
        svg.background.selectAll("*").remove();
    }

    function generateBackground(type = thisBoard.bgType){
        clearBackground();

        //TODO maybe instead of redrawing the board on a pan, just transform the board?
        // Prevents massive lag from filling in a huge viewbox
        if(viewbox.scale > 5 || type == 0){
            return;
        }

        let backgroundBox = {
            x1: viewbox.x,
            y1: viewbox.y,
            x2: viewbox.x+viewbox.w,
            y2: viewbox.y+viewbox.h
        }

        let lineSpacing = thisBoard.bgSpacing;
        let backgroundDetailColour = thisBoard.fgcolor;

        let lineThickness = thisBoard.bgThickness;


        let startingY = Math.floor(Math.floor(backgroundBox.y1-viewbox.h)/lineSpacing)*lineSpacing;
        let startingX = Math.floor(Math.floor(backgroundBox.x1-viewbox.w)/lineSpacing)*lineSpacing;

        let endingY = backgroundBox.y2+viewbox.h;
        let endingX = backgroundBox.x2+viewbox.w;

        if(type == 1){ // square dots
            for(let y = startingY; y < endingY;y+=lineSpacing){
                svg.background.append("line")
                    .attr("x1",startingX)
                    .attr("x2",endingX)
                    .attr("y1",y)
                    .attr("y2",y)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`0 ${lineSpacing}`)
                    .attr("stroke-linecap","round");

            }
        }else if(type == 2){ // triangle dots

            // Calculate the height of the triangle
            let lineHeight = (lineSpacing/2)*Math.sqrt(3);


            // Find the new starting lines with the new line height
            startingY = Math.floor(Math.floor(backgroundBox.y1)/(lineHeight*2))*(lineHeight*2); // Why do you *2? No idea, it just fixes a bug
            startingX = Math.floor(Math.floor(backgroundBox.x1)/lineSpacing)*lineSpacing;


            endingY = backgroundBox.y2;
            
            // Here it is... using trig outside of school
            let opp = Math.tan(30 * Math.PI/180) * (endingY-startingY);         
            for(let x = startingX; x < endingX;x+=lineSpacing){

                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x-opp)
                    .attr("y1",startingY)
                    .attr("y2",endingY)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`0 ${lineSpacing}`)
                    .attr("stroke-linecap","round");

            }

        }else if(type == 3){ // Hexagon dots

            // NOTE diagonal lines cause more lag than straight lines

            // Find the new starting lines with the new line height
            // Why 45? I legit have no idea, somehow I did some math and got that answer so they don't move...
            // It's something about how far apart they are
            startingY = Math.floor(Math.floor(backgroundBox.y1)/(lineSpacing*45))*(lineSpacing*45);
            startingX = Math.floor(Math.floor(backgroundBox.x1)/(lineSpacing*45))*(lineSpacing*45);

            endingY = backgroundBox.y2;

            // Here it is... using trig outside of school
            let opp = Math.tan(30 * Math.PI/180) * (endingY-startingY);

            for(let x = startingX; x < endingX;x+=lineSpacing){
                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x-opp)
                    .attr("y1",startingY)
                    .attr("y2",endingY)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`0 ${lineSpacing} 0 ${(lineSpacing)*2}`)
                    .attr("stroke-linecap","round");

                x+=lineSpacing

                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x-opp)
                    .attr("y1",startingY)
                    .attr("y2",endingY)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`0 ${lineSpacing} 0 ${(lineSpacing)*2}`)
                    .attr("stroke-linecap","round")
                    .attr("stroke-dashoffset",lineSpacing);

                    x+=lineSpacing

                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x-opp)
                    .attr("y1",startingY)
                    .attr("y2",endingY)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`0 ${lineSpacing} 0 ${(lineSpacing)*2}`)
                    .attr("stroke-linecap","round")
                    .attr("stroke-dashoffset",lineSpacing*2);
            }
        }else if(type == 4){ // horizontal lines
            for(let y = startingY; y < endingY;y+=lineSpacing){
                svg.background.append("line")
                    .attr("x1",startingX)
                    .attr("x2",endingX)
                    .attr("y1",y)
                    .attr("y2",y)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none");
            }
        }else if(type == 5){ // vertical lines
            for(let x = startingX; x < endingX;x+=lineSpacing){
                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x)
                    .attr("y1",startingY)
                    .attr("y2",endingY)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none");
            }
        }else if(type == 6){ // square line grid
            for(let x = startingX; x < endingX;x+=lineSpacing){
                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x)
                    .attr("y1",startingY)
                    .attr("y2",endingY)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none");
            }
            for(let y = startingY; y < endingY;y+=lineSpacing){
                svg.background.append("line")
                    .attr("x1",startingX)
                    .attr("x2",endingX)
                    .attr("y1",y)
                    .attr("y2",y)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none");
            }
        }else if(type == 7){ // triangle line grid

            // Calculate the height of the triangle
            let lineHeight = (lineSpacing/2)*Math.sqrt(3);


            // Find the new starting lines with the new line height
            startingY = Math.floor(Math.floor(backgroundBox.y1-viewbox.h)/(lineHeight*2))*(lineHeight*2); // Why do you *2? No idea, it just fixes a bug
            startingX = Math.floor(Math.floor(backgroundBox.x1-viewbox.w)/lineSpacing)*lineSpacing;

            let width = Math.floor((backgroundBox.x2-backgroundBox.x1)/lineSpacing)*lineSpacing;
            let height = (endingY-startingY);

            // Here it is... using trig outside of school
            let opp = Math.tan(30 * Math.PI/180) * height;         

            for(let y = startingY; y < endingY;y+=lineHeight){
                svg.background.append("line")
                    .attr("x1",startingX)
                    .attr("x2",endingX)
                    .attr("y1",y)
                    .attr("y2",y)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none");
            }

            for(let x = startingX-width; x < endingX+width;x+=lineSpacing){

                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x-opp)
                    .attr("y1",startingY)
                    .attr("y2",startingY+height)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none");

                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x+opp)
                    .attr("y1",startingY)
                    .attr("y2",startingY+height)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none");
            }

        }else if(type == 8){ // Hexagon grid

            /**
             * Reason for the *2 or *6 and things
             * This makes the lines start being drawn on the 2nd or 6th or whatever multiple of that number
             * So if there's like 2 different line types, it ensures that line 1 will always be on the same line
             * Same for *6, 6 different types of lines, so always make sure they're on the same lines
             * */

            // Calculate the height of the triangle
            let lineHeight = (lineSpacing/2)*Math.sqrt(3);
            
            // Find the new starting lines with the new line height
            startingY = Math.floor(Math.floor(backgroundBox.y1-viewbox.h)/(lineHeight*2))*(lineHeight*2);
            startingX = Math.floor(Math.floor(backgroundBox.x1-viewbox.w)/(lineSpacing*6))*(lineSpacing*6);

            for(let y = startingY; y < endingY;y+=lineHeight){
                svg.background.append("line")
                    .attr("x1",startingX)
                    .attr("x2",endingX)
                    .attr("y1",y)
                    .attr("y2",y)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`${lineSpacing} ${lineSpacing*2}`);

                y+=lineHeight;

                svg.background.append("line")
                    .attr("x1",startingX)
                    .attr("x2",endingX)
                    .attr("y1",y)
                    .attr("y2",y)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`${lineSpacing} ${lineSpacing*2}`)
                    .attr("stroke-dashoffset",lineSpacing/2*3);

            }

            
            startingY = Math.floor(Math.floor(backgroundBox.y1-viewbox.h)/(lineHeight*2))*(lineHeight*2);
            startingX = Math.floor(Math.floor(backgroundBox.x1-viewbox.w)/(lineSpacing*3))*(lineSpacing*3);

            let height = (endingY-startingY);

            // Here it is... using trig outside of school
            let opp = Math.tan(30 * Math.PI/180) * height; 

            let offset = 3;
            for(let x = startingX-(lineSpacing*60); x < endingX+(lineSpacing*60);x+=lineSpacing){
                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x+opp)
                    .attr("y1",startingY)
                    .attr("y2",startingY+height)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`${lineSpacing} ${lineSpacing*2}`)
                    .attr("stroke-dashoffset",lineSpacing*offset)

                offset += 2;

                if(offset > 10){
                    offset = 0;
                }
            }

            ///////////////////////////
            offset = 0;
            for(let x = startingX-(lineSpacing*60); x < endingX+(lineSpacing*60);x+=lineSpacing){
                svg.background.append("line")
                    .attr("x1",x)
                    .attr("x2",x-opp)
                    .attr("y1",startingY)
                    .attr("y2",startingY+height)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`${lineSpacing} ${lineSpacing*2}`)
                    .attr("stroke-dashoffset",lineSpacing*offset)

                offset += 1;

                if(offset > 2){
                    offset = 0;
                }
            }

            ////////////////////

        }else if(type == 9){ // music lines
            startingY = Math.floor(Math.floor(backgroundBox.y1-viewbox.h)/(lineSpacing*10))*(lineSpacing*10);
            for(let y = startingY; y < endingY;y+=lineSpacing*10){
                // Draw 5 lines
                for(let set = 0; set < 5;set++){
                    svg.background.append("line")
                        .attr("x1",startingX)
                        .attr("x2",endingX)
                        .attr("y1",y+(set*lineSpacing))
                        .attr("y2",y+(set*lineSpacing))
                        .attr("stroke", backgroundDetailColour)
                        .attr("stroke-width", lineThickness)
                        .attr("fill", "none");
                }
                
            }
        }else if(type == 10){ // DnD grid

            let offset = startingX%(lineSpacing*5);
            for(let y = startingY; y < endingY;y+=lineSpacing){
                svg.background.append("line")
                    .attr("x1",startingX)
                    .attr("x2",endingX)
                    .attr("y1",y)
                    .attr("y2",y)
                    .attr("stroke", backgroundDetailColour)
                    .attr("stroke-width", lineThickness)
                    .attr("fill", "none")
                    .attr("stroke-dasharray",`0 ${lineSpacing}`)
                    .attr("stroke-linecap","round");

                if(y%(lineSpacing*5) == 0){
                    svg.background.append("line")
                        .attr("x1",startingX)
                        .attr("x2",endingX)
                        .attr("y1",y)
                        .attr("y2",y)
                        .attr("stroke", backgroundDetailColour)
                        .attr("stroke-width", lineThickness*6)
                        .attr("fill", "none")
                        .attr("stroke-dasharray",`0 ${lineSpacing*5}`)
                        .attr("stroke-linecap","round")
                        .attr("stroke-dashoffset",offset);
                }
                    
            }
        }else if(type == 11){ // square line grid
            for(let x = startingX; x < endingX;x+=lineSpacing){
                if(x%(lineSpacing*5)==0){
                    svg.background.append("line")
                        .attr("x1",x)
                        .attr("x2",x)
                        .attr("y1",startingY)
                        .attr("y2",endingY)
                        .attr("stroke", backgroundDetailColour)
                        .attr("stroke-width", lineThickness*3)
                        .attr("fill", "none");
                }else{
                    svg.background.append("line")
                        .attr("x1",x)
                        .attr("x2",x)
                        .attr("y1",startingY)
                        .attr("y2",endingY)
                        .attr("stroke", backgroundDetailColour)
                        .attr("stroke-width", lineThickness)
                        .attr("fill", "none");
                }
            }
            for(let y = startingY; y < endingY;y+=lineSpacing){
                if(y%(lineSpacing*5)==0){
                    svg.background.append("line")
                        .attr("x1",startingX)
                        .attr("x2",endingX)
                        .attr("y1",y)
                        .attr("y2",y)
                        .attr("stroke", backgroundDetailColour)
                        .attr("stroke-width", lineThickness*3)
                        .attr("fill", "none");
                }else{
                    svg.background.append("line")
                        .attr("x1",startingX)
                        .attr("x2",endingX)
                        .attr("y1",y)
                        .attr("y2",y)
                        .attr("stroke", backgroundDetailColour)
                        .attr("stroke-width", lineThickness)
                        .attr("fill", "none");
                }
            }
        }
    }


    // #endregion
    //==//==//==//==//==//==//
    // Image Resizer
    // #region
    function drawResize(img){
        d3.selectAll(".imageResizeCircle").remove();
        let svg = d3.select(`#object${img.id}`);

        // Top Left
        svg.append("circle")
            .attr("fill","var(--blue)")
            .attr("r",5)
            .attr("cx",img.dots.x)
            .attr("cy",img.dots.y)
            .attr("id","imageResizeCircle-tl")
            .attr("class","imageResizeCircle")
            .on("mousedown",()=>{
                imageResize = {x:img.dots.x,y:img.dots.y,w:img.dots.w,h:img.dots.h};
                imageResize.point = "tl";
                imageResize.id = img.id;
                imageResize.img = img;
            })
        // Top Right
        svg.append("circle")
            .attr("fill","var(--blue)")
            .attr("r",5)
            .attr("cx",img.dots.x+img.dots.w)
            .attr("cy",img.dots.y)
            .attr("id","imageResizeCircle-tr")
            .attr("class","imageResizeCircle")
            .on("mousedown",()=>{
                imageResize = {x:img.dots.x,y:img.dots.y,w:img.dots.w,h:img.dots.h};
                imageResize.point = "tr";
                imageResize.id = img.id;
                imageResize.img = img;
            })
        // Bottom Left
        svg.append("circle")
            .attr("fill","var(--blue)")
            .attr("r",5)
            .attr("cx",img.dots.x)
            .attr("cy",img.dots.y+img.dots.h)
            .attr("id","imageResizeCircle-bl")
            .attr("class","imageResizeCircle")
            .on("mousedown",()=>{
                imageResize = {x:img.dots.x,y:img.dots.y,w:img.dots.w,h:img.dots.h};
                imageResize.point = "bl";
                imageResize.id = img.id;
                imageResize.img = img;
            })
        // Bottom Right
        svg.append("circle")
            .attr("fill","var(--blue)")
            .attr("r",5)
            .attr("cx",img.dots.x+img.dots.w)
            .attr("cy",img.dots.y+img.dots.h)
            .attr("id","imageResizeCircle-br")
            .attr("class","imageResizeCircle")
            .on("mousedown",()=>{
                imageResize = {x:img.dots.x,y:img.dots.y,w:img.dots.w,h:img.dots.h};
                imageResize.point = "br";
                imageResize.id = img.id;
                imageResize.img = img;
            })
    }

    function removeResize(){
        d3.select("#imageResizeCircle-tl").remove();
        d3.select("#imageResizeCircle-tr").remove();
        d3.select("#imageResizeCircle-bl").remove();
        d3.select("#imageResizeCircle-br").remove();
    }
    // #endregion
    //==//==//==//==//==//==//
    // Right click menu
    // #region 
    function initRightClickMenu(){
        let strokeTitleRow = d3.select("#rightClickMenu-svg")
            .html("")
            .append("div") // Row
            .attr("class","rightClickMenu-row")

        strokeTitleRow.append("div") // "Stroke Size" title
            .attr("class","rightClickMenu-title")
            .html("Stroke Size");

        strokeTitleRow.append("input")
            .attr("id","rightClickMenu-stroke-input")
            .attr("class","rightClickMenu-input")
            .attr("type","number")
            .attr("value",currentStroke)
            .on("change",()=>{
                let value = util.getValueId("rightClickMenu-stroke-input");
                currentStroke = value;
                d3.select("#colorBar-stroke-line").attr("stroke-width", currentStroke);
                d3.select("#rightClickMenu-stroke-input").attr("value",currentStroke);
                d3.select("#rightClickMenu-stroke-slider").property("value",currentStroke);
                if(isTyping()){
                    updateTextArea();
                }
            });

        let strokeRow = d3.select("#rightClickMenu-svg")
            .append("div") // Row
            .attr("class","rightClickMenu-row");

        let inputSlider = strokeRow.append("input")
            .attr("type","range")
            .attr("min","1")
            .attr("max","50")
            .attr("value",currentStroke)
            .attr("step","1")
            .attr("class","rightClickMenu-slider")
            .attr("id","rightClickMenu-stroke-slider")
            .on("input",()=>{
                let value = util.getValueId("rightClickMenu-stroke-slider");
                currentStroke = value;
                d3.select("#colorBar-stroke-line").attr("stroke-width", currentStroke);
                d3.select("#rightClickMenu-stroke-input").attr("value",currentStroke);
                if(isTyping()){
                    updateTextArea();
                }
            });

        // Colours
        let colours = d3.select("#rightClickMenu-svg")
            .append("div")
            .attr("id","rightClickMenu-svg-colours")

        for(let pen of thisBoard.pens){
            colours.append("div")
                .attr("class","rightClickMenu-svg-colourBox")
                .style("background-color",pen)
                .on("click",()=>{
                    currentColor = pen;
                    colorBar.changecolor(pen);
                    colorBar.strokeSizeLine.attr("stroke", pen);
                    if(isTyping()){
                        updateTextArea();
                    }
                })
                .on("contextmenu",()=>{
                    colorBar.changeFill(pen);
                })

        }
    }

    function openRightClickMenu(){
        d3.select("#rightClickMenu-svg")
            .style("display",null)
            .style("top",mouse.gy)
            .style("left",mouse.gx);
    }

    function closeRightClickMenu(){
        d3.select("#rightClickMenu-svg")
            .style("display","none")
            .style("top",null)
            .style("left",null);

        d3.selectAll(".toolbar-rightClickMenu").style("display","none");
    }

    function openAltTools(id){
        closeRightClickMenu();
        d3.select(id).style("display",null);
    }
    // #endregion
    //==//==//==//==//==//==//
    // History
    // #region

    /**
     * Types:
     * "add" - New object was added to the board
     * "delete" - Object was removed from the board
     * "move" - Object was moved on the board
     * "edit" - Text was changed
     * "resize" - Image was resized
     * 
     * @param {String} type Type of action that was done
     * @param {Object} newObject Data for the new version of the object
     * @param {Object} oldObject Data 
     */
    function addToHistory(type,newObject,oldObject = null){
        console.log(type);
        // Create the event
        let newHistory = {
            type: type,
            time: Date.now(),
            new: newObject,
            old: oldObject,
            undone: false,
            overwritten: false,
            layer: currentLayer.id
        }
        // check if the last event was undone
        if(thisBoard.history[0] != undefined && thisBoard.history[0].undone == true){
            // check for any old events that were undone but not overwritten
            for(let event of thisBoard.history){
                // if this event was not undone, skip the rest
                if(event.undone == false){
                    break;
                }else{ // if it was undone, flag as overwritten
                    event.overwritten = true;
                }
            }
        }


        thisBoard.history.unshift(newHistory);
        initNavBar();
    }


    /**
     * Undoes the last action that has not been already undone
     */
    function undo(){
        console.log("undo")
        let lastEvent = null;
        // find the newest event with the undone = false
        for(let event of thisBoard.history){
            if(event.undone == false && event.overwritten != true){
                lastEvent = event;
                break;
            }
        }
        // if no event was found, return
        if(lastEvent == null){
            return;
        }

        // All these events are doing opposite they did
        if(lastEvent.type == "add"){ // Undoing an add is deleting
            // Delete the line
            deleteLine(lastEvent.new.id,true);

        }else if(lastEvent.type == "delete"){ // Opposite of delete is adding back
            // Add the line back
            thisBoard.layers.find(x=>x.id == lastEvent.layer).objects.push(lastEvent.old);
            updateLine(lastEvent.old);

        }else if(lastEvent.type == "move"){ // Move back to the old position
            let obj = getLine(lastEvent.new.id);
            obj.transform = lastEvent.old.transform;
            updateLine(obj);

        }else if(lastEvent.type == "edit"){ // Change the text back to the old text
            let obj = getLine(lastEvent.new.id);
            obj.dots = lastEvent.old.dots;
            obj.color = lastEvent.old.color;
            obj.stroke = lastEvent.old.stroke;
            updateLine(obj);

        }else if(lastEvent.type == "resize"){ // Set the size/transform to the old one
            let obj = getLine(lastEvent.old.id);
            obj.dots = lastEvent.old.dots;
            updateLine(obj);
        }

        lastEvent.undone = true;
        initNavBar();
    }

    function redo(){
        console.log("redo");
        let lastEvent = null;
        // find the oldest event with undone=false
        for(let event of thisBoard.history.reverse()){
            if(event.undone == true && event.overwritten != true){
                lastEvent = event;
                break;
            }
        }
        // Flip the array back
        thisBoard.history.reverse();
        // if no event was found, return
        if(lastEvent == null){
            return;
        }

        // All these events are doing what they originally did
        if(lastEvent.type == "add"){ 
            thisBoard.layers.find(x=>x.id == lastEvent.layer).objects.push(lastEvent.new);
            updateLine(lastEvent.new);

        }else if(lastEvent.type == "delete"){
            deleteLine(lastEvent.old.id,true);

        }else if(lastEvent.type == "move"){
            let obj = getLine(lastEvent.new.id);
            obj.transform = lastEvent.new.transform;
            updateLine(obj);

        }else if(lastEvent.type == "edit"){ // Change the text back to the old text
            let obj = getLine(lastEvent.new.id);
            obj.dots = lastEvent.new.dots;
            obj.color = lastEvent.new.color;
            obj.stroke = lastEvent.new.stroke;
            updateLine(obj);

        }else if(lastEvent.type == "resize"){
            let obj = getLine(lastEvent.old.id);
            obj.dots = lastEvent.new.dots;
            updateLine(obj);
            
        }

        lastEvent.undone = false;
        initNavBar();
    }

    // #endregion
    //==//==//==//==//==//==//
    // Layers
    // #region
    function isCurrentLayer(objID){
        return currentLayer.objects.find(x=>x.id == objID) != undefined?true:false;
    }
    // #endregion
    //==//==//==//==//==//==//
    // Nav Bar Images
    // #region
    function initNavBarImages(){
        // Load the images
        comm.sendSync("getImages","please").then((images)=>{
            let boardImages = images.find(x=>x.boxName == boxManager.getBox().saveName);
            // Check to see if any images were returned
            if(boardImages == undefined || boardImages.images.length == 0){
                // If no images were found
                console.log("no Images");
                d3.select("#navBar-content-images").style("background-image",null);
                d3.select("#navBar-content-images").append("div").html("No Images Found...");
            }else{
                // If images were found
                let imageBoard = d3.select("#navBar-content-images").style("background-image",null).html("");

                // Go through all images and draw them out
                for(let image of boardImages.images){
                    imageBoard.append("div")
                        .attr("class","navBar-content-images-card")
                        .append("div")
                        .style("background-image","url('../../"+image.path+"')")
                        .attr("class","navBar-content-images-card-image")
                        .on("click",()=>{
                            console.log("attached image");
                            let data = {
                                x: 0,
                                y: 0,
                                w: image.width,
                                h: image.height
                            }
                            let line = newLine(data,4,null,null,null,image.absolutePath);
                            drawLine(line);
                            attachedImage = line;
                        })
                }
            }

        });
    }
    // #endregion


    /**
     * Clears the whiteboard and returns home
     */
    function closeWhiteboard(){
        // Clear the svg properly
        d3.select("#drawingBoard-svg-background").selectAll("*").remove();
        d3.select("#drawingBoard-svg-images").selectAll("*").remove();
        d3.select("#drawingBoard-svg-main").selectAll("*").remove();
        d3.select("#drawingBoard-svg-links").selectAll("*").remove();
        d3.select("#drawingBoard-svg").selectAll("*").remove();

        // Clear all elements we're about to use (for reloading)
        d3.select("#drawingBoard").html(null);

        mainMenu.changeState('home');
    }


    function closeMenus(){
        removeResize();
        closeRightClickMenu();
        if(isTyping()){
            submitTextArea();
        }
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
        keyManager.newEvent(80,0,function(){toolShortcut(0)}); // pen
        keyManager.newEvent(72,0,function(){toolShortcut(1)}); // Hand
        keyManager.newEvent(69,0,function(){toolShortcut(2)}); // eraser
        keyManager.newEvent(76,0,function(){toolShortcut(3)}); // line
        keyManager.newEvent(82,0,function(){toolShortcut(4)}); // rect
        keyManager.newEvent(77,0,function(){toolShortcut(7)}); // move
        keyManager.newEvent(84,0,function(){toolShortcut(6)}); // text

        keyManager.newEvent(89,1,redo); // Redo
        keyManager.newEvent(90,1,undo); // Undo

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
        changeFill:changeFill,
        closeWhiteboard:closeWhiteboard,
        generateBackground:generateBackground,
        openAltTools:openAltTools
    }
}();