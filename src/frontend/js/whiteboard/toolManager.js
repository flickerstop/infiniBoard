
ToolManager = function(){
    let isDrawing = false;
    let isErasing = false;
    let currentTool = {
        id:0,
        onDown:nothing,
        onMove:nothing,
        onUp:nothing
    };
    let currentToolAltCode = 0;
    let lastPointTime = 0;
    let holdShift = {isHeld:false};
    let buffer = [];

    let currentColor = "#FFFFFF";
    let currentStroke = "5";
    let currentFill = "#BADA55"

    let overTextArea = false;
    let textDrawArea = null;
    let previousTextArea = null; // Used to store the text area in it's pre-edited state
    let mouse = {
        x:0,
        y:0
    };


    /**
     * Changes the current tool to the passed number
     * @param {Number} toolID number for the tool
     */
    function setTool(toolID,altCode = 0){
        whiteboard.closeMenus();

        d3.select("#toolbar-icon-"+currentTool.id).attr("class","toolbar-icon");
        currentTool.id = toolID;
        currentToolAltCode = altCode;
        d3.select("#toolbar-icon-"+currentTool.id).attr("class","toolbar-icon selected");

        // Check if the new tool should be shown in the toolbar
        if(isPen()){
            currentTool.onDown = penStart;
            currentTool.onMove = penMove;
            currentTool.onUp = penEnd;
        }else if(isPan()){
            currentTool.onDown = nothing;
            currentTool.onMove = panMove;
            currentTool.onUp = panEnd;
        }else if(isEraser()){
            currentTool.onDown = eraserStart;
            currentTool.onMove = nothing;
            currentTool.onUp = eraserEnd;
        }else if(isLine()){
            currentTool.onDown = lineStart;
            currentTool.onMove = lineMove;
            currentTool.onUp = lineEnd;
            d3.select("#toolbar-icon-3")
                .style("background-image",d3.select("#toolbar-line-"+altCode).style("background-image"))
                .attr("onclick",null)
                .on("click",()=>{setTool(3,altCode)})
        }else if(isRect()){
            currentTool.onDown = rectStart;
            currentTool.onMove = rectMove;
            currentTool.onUp = rectEnd;
            d3.select("#toolbar-icon-4")
                .style("background-image",d3.select("#toolbar-rect-"+altCode).style("background-image"))
                .attr("onclick",null)
                .on("click",()=>{setTool(4,altCode)})
        }else if(isLink()){
            currentTool.onDown = linkStart;
            currentTool.onMove = linkMove;
            currentTool.onUp = linkEnd;
        }else if(isText()){
            currentTool.onDown = textStart;
            currentTool.onMove = nothing;
            currentTool.onUp = nothing;
        }else if(isMouse()){
            currentTool.onDown = nothing;
            currentTool.onMove = nothing;
            currentTool.onUp = nothing;
            d3.select("#toolbar-icon-7")
                .style("background-image","url(./images/mouse_white.png)")
                .attr("onclick",null)
                .on("click",()=>{setTool(7)})
        }else if(isMove()){
            currentTool.onDown = moveStart;
            currentTool.onMove = moveMove;
            currentTool.onUp = nothing;
        }else if(isImage()){
            currentTool.onDown = imageStart;
            currentTool.onMove = nothing;
            currentTool.onUp = nothing;
        }else if(isCustomShape()){
            currentTool.onDown = customShapeStart;
            currentTool.onMove = customShapeMove;
            currentTool.onUp = customShapeEnd;
            d3.select("#toolbar-icon-11")
                .style("background-image",d3.select("#toolbar-customShape-"+altCode).style("background-image"))
                .attr("onclick",null)
                .on("click",()=>{setTool(11,altCode)})
        }else if(isRotate()){
            currentTool.onDown = nothing;
            currentTool.onMove = nothing;
            currentTool.onUp = nothing;
            d3.select("#toolbar-icon-7")
                .style("background-image","url(./images/mouse_rotate_white.png)")
                .attr("onclick",null)
                .on("click",()=>{setTool(12)})
        }
    }

    function toolShortcut(toolID){
        // If they're typing and a keyboard shortcut is clicked
        if(isTyping()){
            // Ignore it
            return;
        }

        closeMenus();

        d3.select("#toolbar-icon-"+currentTool.id).attr("class","toolbar-icon");
        currentTool.id = toolID;
        d3.select("#toolbar-icon-"+currentTool.id).attr("class","toolbar-icon selected");
    }

    function isPen(){return currentTool.id==0?true:false;}
    function isPan(){return currentTool.id==1?true:false;}
    function isEraser(){return currentTool.id==2?true:false;}
    function isLine(){return currentTool.id==3?true:false;}
    function isRect(){return currentTool.id==4?true:false;}
    function isLink(){return currentTool.id==5?true:false;}
    function isText(){return currentTool.id==6?true:false;}
    function isMouse(){return currentTool.id==7?true:false;}
    function isMove(){return currentTool.id==7?true:false;} // Was changed to be the same as mouse
    function isImage(){return currentTool.id==9?true:false;}
    function isCustomShape(){return currentTool.id==11?true:false;}
    function isRotate(){return currentTool.id==12?true:false;}

    function isEditingText(){return previousTextArea!=null?true:false}


    function toolDown(){
        currentTool.onDown();
    }
    function toolMove(param){
        currentTool.onMove(param);
    }
    function toolUp(){
        currentTool.onUp();
    }

    function nothing(){

    }


    function setMouseStart(){
        let coordinates= d3.mouse(d3.select("#drawingBoard-svg").node());
        mouseDownPoint = {
            x:coordinates[0],
            y:coordinates[1],
            vx: whiteboard.getViewbox().x,
            vy: whiteboard.getViewbox().y,
            button: d3.event.button
        };
    }

    function getMousePos(){
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
    }
    ///////////////////////
    // Pen Tool
    //#region
    function penStart(){
        isDrawing = true;


        //TODO every tool should check if the colour is new!
        let isNewPen = true;
        // check if this line is a new color
        for(let pen of whiteboard.getWhiteboard().pens){
            if(pen == currentColor){
                isNewPen = false;
            }
        }
        if(isNewPen){
            whiteboard.getColorBar().addPen(currentColor);
        }
    }
    function penMove(tempSVG){
        getMousePos();

        let currentTime = Date.now();


        let s = holdShift;
        let m = {x:mouse.x,y:mouse.y};
            
        // if the user is drawing, add the x,y to the buffer
        if(isDrawing){
            // if it has been x milliseconds since the last coordinate saved
            if(currentTime>=lastPointTime+10){
                if(s.isHeld){
                    // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                    if(Math.abs(m.x-s.x)>Math.abs(m.y-s.y)){
                        lastPointTime = currentTime;
                        tempSVG.append("circle")
                            .attr("fill",currentColor)
                            .attr("r",currentStroke/2)
                            .attr("cx",m.x)
                            .attr("cy",m.y);

                        buffer.push({x:m.x,y:s.y});

                    }else if(Math.abs(m.x-s.x)<Math.abs(m.y-s.y)){
                        lastPointTime = currentTime;
                        tempSVG.append("circle")
                            .attr("fill",currentColor)
                            .attr("r",currentStroke/2)
                            .attr("cx",s.x)
                            .attr("cy",m.y);
                        
                        buffer.push({x:s.x,y:m.y});
                    }
                }else{
                    lastPointTime = currentTime;
                    tempSVG.append("circle")
                        .attr("fill",currentColor)
                        .attr("r",currentStroke/2)
                        .attr("cx",m.x)
                        .attr("cy",m.y);
                    
                    buffer.push({x:m.x,y:m.y});
                }
            }
        }
    }
    function penEnd(){
        let line = whiteboard.newLine(buffer,0,currentColor,currentStroke,null);
        whiteboard.drawLine(line);
        
        // clear the buffer
        buffer = [];
        isDrawing = false;
        mouseDownPoint = null;
    }
    //#endregion
    ///////////////////////
    // Eraser
    //#region
    function eraserStart(){
        setMouseStart();
        isDrawing = true;
    }
    // eraserMove(tempSVG){
    // Handled on the objects
    // }
    function eraserEnd(){
        isDrawing = false;
        mouseDownPoint = null;
    }
    //#endregion
    ///////////////////////
    // Pan Tool
    //#region
    // panStart(){

    // }
    function panMove(){ //FIXME wont work since viewbox is not accessable atm
        viewbox.x = viewbox.x - (mouse.gx-mouse.lgx)*viewbox.scale;
        viewbox.y = viewbox.y - (mouse.gy-mouse.lgy)*viewbox.scale;

        //generateBackground();
        updateViewbox();
    }
    function panEnd(){
        mouseDownPoint = null;
        whiteboard.generateBackground();
    }
    //#endregion
    ///////////////////////
    // Line Tool
    //#region
    function lineStart(){
        setMouseStart();
        isDrawing = true;
    }
    function lineMove(tempSVG){
        if(isDrawing){
            getMousePos();

            let s = holdShift;
            let m = {x:mouse.x,y:mouse.y};
            let mdp = mouseDownPoint;

            let coords = {};

            if(s.isHeld){
                // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                if(Math.abs(m.x-s.x)>Math.abs(m.y-s.y)){
                    coords.x1 = mdp.x;
                    coords.x2 = m.x;
                    coords.y1 = mdp.y;
                    coords.y2 = mdp.y;
                }else if(Math.abs(m.x-s.x)<Math.abs(m.y-s.y)){
                    coords.x1 = mdp.x;
                    coords.x2 = mdp.x;
                    coords.y1 = mdp.y;
                    coords.y2 = m.y;   
                }
            }else{
                coords.x2 = m.x;
                coords.x1 = mdp.x;
                coords.y2 = m.y;
                coords.y1 = mdp.y; 
            }
            tempSVG.html(null);

            if(currentToolAltCode != 3){ // If the line isn't dashed
            tempSVG.append("line")
                    .attr("x1",coords.x1)
                    .attr("y1",coords.y1)
                    .attr("x2",coords.x2)
                    .attr("y2",coords.y2)
                    .attr("stroke", currentColor)
                    .attr("stroke-width", currentStroke)
                    .attr("stroke-linecap","round");
            }else{ // If the line is dashed
                tempSVG.append("line")
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
                tempSVG.append("line")
                    .attr("x1",coords.x2)
                    .attr("y1",coords.y2)
                    .attr("x2",coords.x2+x3Change)
                    .attr("y2",coords.y2+y3Change)
                    .attr("stroke", currentColor)
                    .attr("stroke-width", currentStroke)
                    .attr("stroke-linecap","round");

                tempSVG.append("line")
                    .attr("x1",coords.x2)
                    .attr("y1",coords.y2)
                    .attr("x2",coords.x2+x4Change)
                    .attr("y2",coords.y2+y4Change)
                    .attr("stroke", currentColor)
                    .attr("stroke-width", currentStroke)
                    .attr("stroke-linecap","round");
            }
            if(currentToolAltCode == 2){
                tempSVG.append("line")
                    .attr("x1",coords.x1)
                    .attr("y1",coords.y1)
                    .attr("x2",coords.x1-x3Change)
                    .attr("y2",coords.y1-y3Change)
                    .attr("stroke", currentColor)
                    .attr("stroke-width", currentStroke)
                    .attr("stroke-linecap","round");

                tempSVG.append("line")
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
                tempSVG.append("polygon")
                    .attr("points",`${coords.x2} ${coords.y2}, ${coords.x2+x3Change} ${coords.y2+y3Change}, ${coords.x2+x4Change} ${coords.y2+y4Change}`)
                    .style("fill",currentColor)
                    .attr("stroke", currentColor)
                    .attr("stroke-width", currentStroke)
                    .attr("stroke-linecap","round");
            }
            if(currentToolAltCode == 5){
                tempSVG.append("polygon")
                    .attr("points",`${coords.x1} ${coords.y1}, ${coords.x1-x3Change} ${coords.y1-y3Change}, ${coords.x1-x4Change} ${coords.y1-y4Change}`)
                    .style("fill",currentColor)
                    .attr("stroke", currentColor)
                    .attr("stroke-width", currentStroke)
                    .attr("stroke-linecap","round");
            }
        }
    }
    function lineEnd(){
        buffer = [{x:mouseDownPoint.x,y:mouseDownPoint.y},{x:mouse.x,y:mouse.y}];
        // Check if the height and width is 0
        if((buffer[0].x - buffer[1].x) != 0 || (buffer[0].y - buffer[1].y) != 0){
            if(holdShift.isHeld){
                // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                if(Math.abs(mouse.x-holdShift.x)>Math.abs(mouse.y-holdShift.y)){

                    buffer = [{x:mouseDownPoint.x,y:mouseDownPoint.y},{x:mouse.x,y:mouseDownPoint.y}];
                    let line = whiteboard.newLine(buffer,6,currentColor,currentStroke,null,currentToolAltCode);
                    whiteboard.drawLine(line);
                }else if(Math.abs(mouse.x-holdShift.x)<Math.abs(mouse.y-holdShift.y)){

                    buffer = [{x:mouseDownPoint.x,y:mouseDownPoint.y},{x:mouseDownPoint.x,y:mouse.y}];
                    let line = whiteboard.newLine(buffer,6,currentColor,currentStroke,null,currentToolAltCode);
                    whiteboard.drawLine(line);
                }
            }else{
                let line = whiteboard.newLine(buffer,6,currentColor,currentStroke,null,currentToolAltCode);
                whiteboard.drawLine(line);
            }
            
        }
        isDrawing = false;
    }
    //#endregion
    ///////////////////////
    // Rect Tool
    //#region
    function rectStart(){
        setMouseStart();
        isDrawing = true;
    }
    function rectMove(tempSVG){
        if(isDrawing){
            getMousePos();

            //let s = holdShift;
            let m = {x:mouse.x,y:mouse.y};
            let mdp = mouseDownPoint;

            let height = mdp.y>=m.y?mdp.y-m.y:m.y-mdp.y;
            let width = mdp.x>=m.x?mdp.x-m.x:m.x-mdp.x;

            let rectX = mdp.x>=m.x?m.x:mdp.x;
            let rectY = mdp.y>=m.y?m.y:mdp.y;

            tempSVG.html(null);

            if(currentToolAltCode == 0){
                tempSVG.append("rect")
                    .attr("x",rectX)
                    .attr("y",rectY)
                    .attr("height",height)
                    .attr("width",width)
                    .attr("fill", currentFill)
                    .attr("stroke", currentColor)
                    .attr("stroke-width", currentStroke);
            }else if(currentToolAltCode == 1){
                tempSVG.append("rect")
                    .attr("x",rectX)
                    .attr("y",rectY)
                    .attr("height",height)
                    .attr("width",width)
                    .attr("fill", currentFill);
            }else if(currentToolAltCode == 2){
                tempSVG.append("rect")
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
    function rectEnd(){
        buffer = [{x:mouseDownPoint.x,y:mouseDownPoint.y},{x:mouse.x,y:mouse.y}];

        // Check if the height or width is 0
        if((buffer[0].x - buffer[1].x) != 0 || (buffer[0].y - buffer[1].y) != 0){
            let line = null;
            if(currentToolAltCode == 0){
                line = whiteboard.newLine(buffer,1,currentColor,currentStroke,currentFill);
            }else if(currentToolAltCode == 1){
                line = whiteboard.newLine(buffer,1,"none",currentStroke,currentFill);
            }else if(currentToolAltCode == 2){
                line = whiteboard.newLine(buffer,1,currentColor,currentStroke,"none");
            }
            whiteboard.drawLine(line);
        }
        isDrawing = false;
    }
    //#endregion
    ///////////////////////
    // Custom Shape Tool
    //#region
    function customShapeStart(){
        setMouseStart();
        isDrawing = true;
    }
    function customShapeMove(tempSVG){
        if(isDrawing){
            let currentTime = Date.now();
                
            getMousePos();

            let s = holdShift;
            let m = {x:mouse.x,y:mouse.y};
            let mdp = mouseDownPoint;

            // if it has been x milliseconds since the last coordinate saved
            if(currentTime>=lastPointTime+10){
                if(s.isHeld){
                    // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                    if(Math.abs(m.x-s.x)>Math.abs(m.y-s.y)){
                        lastPointTime = currentTime;
                        buffer.push({x:m.x,y:s.y});
                    }else if(Math.abs(m.x-s.x)<Math.abs(m.y-s.y)){
                        lastPointTime = currentTime;
                        buffer.push({x:s.x,y:m.y});
                    }
                }else{
                    lastPointTime = currentTime;
                    buffer.push({x:m.x,y:m.y});
                }

                // Draw the new shape
                tempSVG.html(null);

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
                    tempSVG.append("path")
                        .attr("d", drawLine(buffer))
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("fill", currentFill)
                        .attr("stroke-linecap","round");
                }else if(currentToolAltCode == 1){
                    tempSVG.append("path")
                        .attr("d", drawLine(buffer))
                        .attr("fill", currentFill)
                        .attr("stroke-linecap","round");
                }else if(currentToolAltCode == 2){
                    tempSVG.append("path")
                        .attr("d", drawLine(buffer))
                        .attr("stroke", currentColor)
                        .attr("stroke-width", currentStroke)
                        .attr("fill", "none")
                        .attr("stroke-linecap","round");
                }
            }
        }
    }
    function customShapeEnd(){
        // Make sure the line goes back to the start
        buffer.push({x:buffer[0].x,y:buffer[0].y});

        let line = null;
        if(currentToolAltCode == 0){
            line = whiteboard.newLine(buffer,5,currentColor,currentStroke,currentFill);
        }else if(currentToolAltCode == 1){
            line = whiteboard.newLine(buffer,5,"none",currentStroke,currentFill);
        }else if(currentToolAltCode == 2){
            line = whiteboard.newLine(buffer,5,currentColor,currentStroke,"none");
        }

        whiteboard.drawLine(line);

        // clear the buffer
        buffer = [];

        isDrawing = false;
    }
    //#endregion
    ///////////////////////
    // Link Tool
    //#region
    function linkStart(){
        setMouseStart();
        isDrawing = true;
    }
    function linkMove(){
        getMousePos();

        let currentTime = Date.now();


        let s = holdShift;
        let m = {x:mouse.x,y:mouse.y};
            
        // if it has been x milliseconds since the last coordinate saved
        if(currentTime>=lastPointTime+10){
            if(s.isHeld){
                // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                if(Math.abs(m.x-s.x)>Math.abs(m.y-s.y)){
                    lastPointTime = currentTime;
                    tempSVG.append("circle")
                        .attr("fill",currentColor)
                        .attr("r",currentStroke/2)
                        .attr("cx",m.x)
                        .attr("cy",m.y);

                    buffer.push({x:m.x,y:s.y});

                }else if(Math.abs(m.x-s.x)<Math.abs(m.y-s.y)){
                    lastPointTime = currentTime;
                    tempSVG.append("circle")
                        .attr("fill",currentColor)
                        .attr("r",currentStroke/2)
                        .attr("cx",s.x)
                        .attr("cy",m.y);
                    
                    buffer.push({x:s.x,y:m.y});
                }
            }else{
                lastPointTime = currentTime;
                tempSVG.append("circle")
                    .attr("fill",currentColor)
                    .attr("r",currentStroke/2)
                    .attr("cx",m.x)
                    .attr("cy",m.y);
                
                buffer.push({x:m.x,y:m.y});
            }
        }
    }
    function linkEnd(){
        // Make sure the line goes back to the start
        buffer.push({x:buffer[0].x,y:buffer[0].y});

        // Create a new popup getting what board to link to
        popup.newBoard((isNewBoard,boardData)=>{
            if(isNewBoard){ // If a new board is to be created
                let newBoardID = boxManager.newBoard(boardData);
                
                let line = whiteboard.newLine(buffer,2,currentColor,currentStroke,null,newBoardID);
                whiteboard.drawLine(line);
            }else{ // If no new board is created
                if(boardData != null){ // If they didn't close the popup
                    let line = whiteboard.newLine(buffer,2,currentColor,currentStroke,null,boardData.id);
                    whiteboard.drawLine(line);
                }else{ // If they closed the popup
                    console.log("popup closed");
                }
            }
            // clear the buffer
            buffer = [];
        });
    }
    //#endregion
    ///////////////////////
    // Text Tool
    //#region
    function textStart(tempSVG){
        setMouseStart();
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
                tempSVG.append("foreignObject")
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
                tempSVG.append("foreignObject")
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
    // textMove(){

    // }
    // textEnd(){

    // }
    //#endregion
    ///////////////////////
    // Image Tool
    //#region
    function imageStart(){
        popup.imageSelector(mouse,(image)=>{
            let data = {
                x: image.x,
                y: image.y,
                w: image.width,
                h: image.height
            }
            let line = whiteboard.newLine(data,4,null,null,null,image.path);
            whiteboard.drawLine(line);
        });
    }
    //#endregion
    ///////////////////////
    // Move Tool
    //#region
    function moveStart(){

    }
    function moveMove(){
        let obj = layerManager.getObject(selectedElement);

        whiteboard.changeTempTransform(mouse.x-mouseDownPoint.x+obj.transform.x,mouse.y-mouseDownPoint.y+obj.transform.y)
        whiteboard.updateLine(obj);
        whiteboard.autoSaveTimeout();
    }
    function moveEnd(){

    }
    //#endregion
    ///////////////////////
    // Rotate Tool
    //#region
    //#endregion
    ///////////////////////
    // Resize Tool
    //#region
    //#endregion


    return{
        setTool,
        toolShortcut,
        toolDown,
        toolMove,
        toolUp,
        isMove,
        isMouse,
        isEraser,
        isRotate,
        isEditingText
    }
}();


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
        textDrawArea.h += (element.scrollHeight-element.clientHeight);
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
        tempSVG.selectAll("*").remove();
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
        ToolManager.overTextArea = null;
    }

    // clear the buffer
    buffer = [];
    textDrawArea = null;
    // clear the temp line
    d3.select("#whiteboard-textInputArea").on("input",null);
    tempSVG.selectAll("*").remove();

    // Save in x seconds
    autoSaveTimeout();
}
// #endregion