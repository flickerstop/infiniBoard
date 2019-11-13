class ToolManager{
    constructor(){
        this.isDrawing = false;
        this.isErasing = false;
        this.currentTool = 0;
        this.currentToolAltCode = 0;
        this.lastPointTime = 0;
        this.holdShift = {isHeld:false};
        this.buffer = [];
        this.currentColor = "FFFFFF";
        this.currentStroke = "5";
        this.overTextArea = false;
        this.textDrawArea = null;
        this.previousTextArea = null; // Used to store the text area in it's pre-edited state
    }


    /**
     * Changes the current tool to the passed number
     * @param {Number} toolID number for the tool
     */
    setTool(toolID,altCode = 0){
        whiteboard.closeMenus();

        d3.select("#toolbar-icon-"+this.currentTool).attr("class","toolbar-icon");
        this.currentTool = toolID;
        this.currentToolAltCode = altCode;
        d3.select("#toolbar-icon-"+this.currentTool).attr("class","toolbar-icon selected");

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

    toolShortcut(toolID){
        // If they're typing and a keyboard shortcut is clicked
        if(isTyping()){
            // Ignore it
            return;
        }

        closeMenus();

        d3.select("#toolbar-icon-"+this.currentTool).attr("class","toolbar-icon");
        this.currentTool = toolID;
        d3.select("#toolbar-icon-"+this.currentTool).attr("class","toolbar-icon selected");
    }

    isPen(){return this.currentTool==0?true:false;}
    isHand(){return this.currentTool==1?true:false;}
    isEraser(){return this.currentTool==2?true:false;}
    isLine(){return this.currentTool==3?true:false;}
    isRect(){return this.currentTool==4?true:false;}
    isLink(){return this.currentTool==5?true:false;}
    isText(){return this.currentTool==6?true:false;}
    isMouse(){return this.currentTool==7?true:false;}
    isMove(){return this.currentTool==7?true:false;} // Was changed to be the same as mouse
    isImage(){return this.currentTool==9?true:false;}
    isCustomShape(){return this.currentTool==11?true:false;}
    isRotate(){return this.currentTool==12?true:false;}



    setMouseStart(){
        let coordinates= d3.mouse(d3.select("#drawingBoard-svg").node());
        this.mouseDownPoint = {
            x:coordinates[0],
            y:coordinates[1],
            vx: whiteboard.getViewbox().x,
            vy: whiteboard.getViewbox().y,
            button: d3.event.button
        };
    }

    getMousePos(){
        // Get the current mouse coordinates
        this.mouse = {
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
    penStart(){
        this.isDrawing = true;


        //TODO every tool should check if the colour is new!
        let isNewPen = true;
        // check if this line is a new color
        for(let pen of whiteboard.getWhiteboard().pens){
            if(pen == currentColor){
                isNewPen = false;
            }
        }
        if(isNewPen){
            colorBar.addPen(currentColor);
        }
    }
    penMove(tempSVG){
        this.getMousePos();

        let currentTime = Date.now();


        let s = this.holdShift;
        let m = {x:this.mouse.x,y:this.mouse.y};
            
        // if the user is drawing, add the x,y to the buffer
        if(this.isDrawing){
            // if it has been x milliseconds since the last coordinate saved
            if(currentTime>=this.lastPointTime+10){
                if(s.isHeld){
                    // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                    if(Math.abs(m.x-s.x)>Math.abs(m.y-s.y)){
                        this.lastPointTime = currentTime;
                        tempSVG.append("circle")
                            .attr("fill",this.currentColor)
                            .attr("r",this.currentStroke/2)
                            .attr("cx",m.x)
                            .attr("cy",m.y);

                        this.buffer.push({x:m.x,y:s.y});

                    }else if(Math.abs(m.x-s.x)<Math.abs(m.y-s.y)){
                        this.lastPointTime = currentTime;
                        tempSVG.append("circle")
                            .attr("fill",this.currentColor)
                            .attr("r",this.currentStroke/2)
                            .attr("cx",s.x)
                            .attr("cy",m.y);
                        
                        this.buffer.push({x:s.x,y:m.y});
                    }
                }else{
                    this.lastPointTime = currentTime;
                    tempSVG.append("circle")
                        .attr("fill",this.currentColor)
                        .attr("r",this.currentStroke/2)
                        .attr("cx",m.x)
                        .attr("cy",m.y);
                    
                    this.buffer.push({x:m.x,y:m.y});
                }
            }
        }
    }
    penEnd(){
        let line = whiteboard.newLine(this.buffer,0,this.currentColor,this.currentStroke,null);
        whiteboard.drawLine(line);
        
        // clear the buffer
        buffer = [];
        this.isDrawing = false;
        this.mouseDownPoint = null;
    }
    //#endregion
    ///////////////////////
    // Eraser
    //#region
    eraserStart(){
        this.setMouseStart();
        this.isDrawing = true;
    }
    // eraserMove(tempSVG){
    // Handled on the objects
    // }
    eraserEnd(){
        this.isDrawing = false;
        this.mouseDownPoint = null;
    }
    //#endregion
    ///////////////////////
    // Pan Tool
    //#region
    // panStart(){

    // }
    panMove(){ //FIXME wont work since viewbox is not accessable atm
        viewbox.x = viewbox.x - (this.mouse.gx-this.mouse.lgx)*viewbox.scale;
        viewbox.y = viewbox.y - (this.mouse.gy-this.mouse.lgy)*viewbox.scale;

        //generateBackground();
        updateViewbox();
    }
    panEnd(){
        this.mouseDownPoint = null;
        whiteboard.generateBackground();
    }
    //#endregion
    ///////////////////////
    // Line Tool
    //#region
    lineStart(){
        this.setMouseStart();
        this.isDrawing = true;
    }
    lineMove(){
        this.getMousePos();

        let s = this.holdShift;
        let m = {x:this.mouse.x,y:this.mouse.y};
        let mdp = this.mouseDownPoint;

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
        svg.temp.html(null);

        if(this.currentToolAltCode != 3){ // If the line isn't dashed
            svg.temp.append("line")
                .attr("x1",coords.x1)
                .attr("y1",coords.y1)
                .attr("x2",coords.x2)
                .attr("y2",coords.y2)
                .attr("stroke", this.currentColor)
                .attr("stroke-width", this.currentStroke)
                .attr("stroke-linecap","round");
        }else{ // If the line is dashed
            svg.temp.append("line")
                .attr("x1",coords.x1)
                .attr("y1",coords.y1)
                .attr("x2",coords.x2)
                .attr("y2",coords.y2)
                .attr("stroke", this.currentColor)
                .attr("stroke-width", this.currentStroke)
                .attr("stroke-dasharray",`${this.currentStroke*10} ${this.currentStroke*10}`)
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
        if(this.currentToolAltCode == 1 || this.currentToolAltCode == 2){
            svg.temp.append("line")
                .attr("x1",coords.x2)
                .attr("y1",coords.y2)
                .attr("x2",coords.x2+x3Change)
                .attr("y2",coords.y2+y3Change)
                .attr("stroke", this.currentColor)
                .attr("stroke-width", this.currentStroke)
                .attr("stroke-linecap","round");

            svg.temp.append("line")
                .attr("x1",coords.x2)
                .attr("y1",coords.y2)
                .attr("x2",coords.x2+x4Change)
                .attr("y2",coords.y2+y4Change)
                .attr("stroke", this.currentColor)
                .attr("stroke-width", this.currentStroke)
                .attr("stroke-linecap","round");
        }
        if(this.currentToolAltCode == 2){
            svg.temp.append("line")
                .attr("x1",coords.x1)
                .attr("y1",coords.y1)
                .attr("x2",coords.x1-x3Change)
                .attr("y2",coords.y1-y3Change)
                .attr("stroke", this.currentColor)
                .attr("stroke-width", this.currentStroke)
                .attr("stroke-linecap","round");

            svg.temp.append("line")
                .attr("x1",coords.x1)
                .attr("y1",coords.y1)
                .attr("x2",coords.x1-x4Change)
                .attr("y2",coords.y1-y4Change)
                .attr("stroke", this.currentColor)
                .attr("stroke-width", this.currentStroke)
                .attr("stroke-linecap","round");
        }

        // Filled end arrows
        if(this.currentToolAltCode == 4 || this.currentToolAltCode == 5){
            svg.temp.append("polygon")
                .attr("points",`${coords.x2} ${coords.y2}, ${coords.x2+x3Change} ${coords.y2+y3Change}, ${coords.x2+x4Change} ${coords.y2+y4Change}`)
                .style("fill",this.currentColor)
                .attr("stroke", this.currentColor)
                .attr("stroke-width", this.currentStroke)
                .attr("stroke-linecap","round");
        }
        if(this.currentToolAltCode == 5){
            svg.temp.append("polygon")
                .attr("points",`${coords.x1} ${coords.y1}, ${coords.x1-x3Change} ${coords.y1-y3Change}, ${coords.x1-x4Change} ${coords.y1-y4Change}`)
                .style("fill",this.currentColor)
                .attr("stroke", this.currentColor)
                .attr("stroke-width", this.currentStroke)
                .attr("stroke-linecap","round");
        }

    }
    lineEnd(){
        this.buffer = [{x:this.mouseDownPoint.x,y:this.mouseDownPoint.y},{x:this.mouse.x,y:this.mouse.y}];
        // Check if the height and width is 0
        if((this.buffer[0].x - this.buffer[1].x) != 0 || (this.buffer[0].y - this.buffer[1].y) != 0){
            if(this.holdShift.isHeld){
                // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                if(Math.abs(this.mouse.x-this.holdShift.x)>Math.abs(this.mouse.y-this.holdShift.y)){

                    this.buffer = [{x:this.mouseDownPoint.x,y:this.mouseDownPoint.y},{x:this.mouse.x,y:this.mouseDownPoint.y}];
                    let line = newLine(this.buffer,6,this.currentColor,this.currentStroke,null,this.currentToolAltCode);
                    whiteboard.drawLine(line);
                }else if(Math.abs(this.mouse.x-this.holdShift.x)<Math.abs(this.mouse.y-this.holdShift.y)){

                    this.buffer = [{x:this.mouseDownPoint.x,y:this.mouseDownPoint.y},{x:this.mouseDownPoint.x,y:this.mouse.y}];
                    let line = newLine(this.buffer,6,this.currentColor,this.currentStroke,null,this.currentToolAltCode);
                    whiteboard.drawLine(line);
                }
            }else{
                let line = newLine(this.buffer,6,this.currentColor,this.currentStroke,null,this.currentToolAltCode);
                whiteboard.drawLine(line);
            }
            
        }
    }
    //#endregion
    ///////////////////////
    // Rect Tool
    //#region
    rectStart(){
        this.setMouseStart();
        this.isDrawing = true;
    }
    rectMove(tempSVG){
        this.getMousePos();

        //let s = this.holdShift;
        let m = {x:this.mouse.x,y:this.mouse.y};
        let mdp = this.mouseDownPoint;

        if(toolManager.isDrawing){
            let height = mdp.y>=m.y?mdp.y-m.y:m.y-mdp.y;
            let width = mdp.x>=m.x?mdp.x-m.x:m.x-mdp.x;

            let rectX = mdp.x>=m.x?m.x:mdp.x;
            let rectY = mdp.y>=m.y?m.y:mdp.y;

            tempSVG.html(null);

            if(this.currentToolAltCode == 0){
                tempSVGappend("rect")
                    .attr("x",rectX)
                    .attr("y",rectY)
                    .attr("height",height)
                    .attr("width",width)
                    .attr("fill", this.currentFill)
                    .attr("stroke", this.currentColor)
                    .attr("stroke-width", this.currentStroke);
            }else if(this.currentToolAltCode == 1){
                tempSVG.append("rect")
                    .attr("x",rectX)
                    .attr("y",rectY)
                    .attr("height",height)
                    .attr("width",width)
                    .attr("fill", this.currentFill);
            }else if(this.currentToolAltCode == 2){
                tempSVG.append("rect")
                    .attr("x",rectX)
                    .attr("y",rectY)
                    .attr("height",height)
                    .attr("width",width)
                    .attr("fill", "none")
                    .attr("stroke", this.currentColor)
                    .attr("stroke-width", this.currentStroke);
            }
            
        }
    }
    rectEnd(){
        this.buffer = [{x:this.mouseDownPoint.x,y:this.mouseDownPoint.y},{x:this.mouse.x,y:this.mouse.y}];

        // Check if the height or width is 0
        if((this.buffer[0].x - this.buffer[1].x) != 0 || (this.buffer[0].y - this.buffer[1].y) != 0){
            let line = null;
            if(this.currentToolAltCode == 0){
                line = whiteboard.newLine(this.buffer,1,this.currentColor,this.currentStroke,this.currentFill);
            }else if(this.currentToolAltCode == 1){
                line = whiteboard.newLine(this.buffer,1,"none",this.currentStroke,this.currentFill);
            }else if(this.currentToolAltCode == 2){
                line = whiteboard.newLine(this.buffer,1,this.currentColor,this.currentStroke,"none");
            }
            whiteboard.drawLine(line);
        }
    }
    //#endregion
    ///////////////////////
    // Custom Shape Tool
    //#region
    customShapeStart(){
        this.setMouseStart();
        this.isDrawing = true;
    }
    customShapeMove(tempSVG){
        let currentTime = Date.now();
            
        this.getMousePos();

        let s = this.holdShift;
        let m = {x:this.mouse.x,y:this.mouse.y};
        let mdp = this.mouseDownPoint;

        // if it has been x milliseconds since the last coordinate saved
        if(currentTime>=this.lastPointTime+10){
            if(s.isHeld){
                // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                if(Math.abs(m.x-s.x)>Math.abs(m.y-s.y)){
                    lastPointTime = currentTime;
                    this.buffer.push({x:m.x,y:s.y});
                }else if(Math.abs(m.x-s.x)<Math.abs(m.y-s.y)){
                    lastPointTime = currentTime;
                    this.buffer.push({x:s.x,y:m.y});
                }
            }else{
                lastPointTime = currentTime;
                this.buffer.push({x:m.x,y:m.y});
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

            if(this.currentToolAltCode == 0){
                tempSVG.append("path")
                    .attr("d", drawLine(this.buffer))
                    .attr("stroke", this.currentColor)
                    .attr("stroke-width", this.currentStroke)
                    .attr("fill", this.currentFill)
                    .attr("stroke-linecap","round");
            }else if(this.currentToolAltCode == 1){
                tempSVG.append("path")
                    .attr("d", drawLine(this.buffer))
                    .attr("fill", this.currentFill)
                    .attr("stroke-linecap","round");
            }else if(this.currentToolAltCode == 2){
                tempSVG.append("path")
                    .attr("d", drawLine(this.buffer))
                    .attr("stroke", this.currentColor)
                    .attr("stroke-width", this.currentStroke)
                    .attr("fill", "none")
                    .attr("stroke-linecap","round");
            }
        }
    }
    customShapeEnd(){
        // Make sure the line goes back to the start
        this.buffer.push({x:this.buffer[0].x,y:this.buffer[0].y});

        let line = null;
        if(this.currentToolAltCode == 0){
            line = newLine(this.buffer,5,this.currentColor,this.currentStroke,this.currentFill);
        }else if(this.currentToolAltCode == 1){
            line = newLine(this.buffer,5,"none",this.currentStroke,this.currentFill);
        }else if(this.currentToolAltCode == 2){
            line = newLine(this.buffer,5,this.currentColor,this.currentStroke,"none");
        }

        drawLine(line);

        // clear the this.buffer
        this.buffer = [];
    }
    //#endregion
    ///////////////////////
    // Link Tool
    //#region
    linkStart(){
        this.setMouseStart();
        this.isDrawing = true;
    }
    linkMove(){
        this.getMousePos();

        let currentTime = Date.now();


        let s = this.holdShift;
        let m = {x:this.mouse.x,y:this.mouse.y};
            
        // if it has been x milliseconds since the last coordinate saved
        if(currentTime>=this.lastPointTime+10){
            if(s.isHeld){
                // if the x distance from the lastX is greater than the y, draw a line only on the x axis
                if(Math.abs(m.x-s.x)>Math.abs(m.y-s.y)){
                    this.lastPointTime = currentTime;
                    tempSVG.append("circle")
                        .attr("fill",this.currentColor)
                        .attr("r",this.currentStroke/2)
                        .attr("cx",m.x)
                        .attr("cy",m.y);

                    this.buffer.push({x:m.x,y:s.y});

                }else if(Math.abs(m.x-s.x)<Math.abs(m.y-s.y)){
                    this.lastPointTime = currentTime;
                    tempSVG.append("circle")
                        .attr("fill",this.currentColor)
                        .attr("r",this.currentStroke/2)
                        .attr("cx",s.x)
                        .attr("cy",m.y);
                    
                    this.buffer.push({x:s.x,y:m.y});
                }
            }else{
                this.lastPointTime = currentTime;
                tempSVG.append("circle")
                    .attr("fill",this.currentColor)
                    .attr("r",this.currentStroke/2)
                    .attr("cx",m.x)
                    .attr("cy",m.y);
                
                this.buffer.push({x:m.x,y:m.y});
            }
        }
    }
    linkEnd(){
        // Make sure the line goes back to the start
        this.buffer.push({x:this.buffer[0].x,y:this.buffer[0].y});

        // Create a new popup getting what board to link to
        popup.newBoard((isNewBoard,boardData)=>{
            if(isNewBoard){ // If a new board is to be created
                let newBoardID = boxManager.newBoard(boardData);
                
                let line = whiteboard.newLine(this.buffer,2,this.currentColor,this.currentStroke,null,newBoardID);
                whiteboard.drawLine(line);
            }else{ // If no new board is created
                if(boardData != null){ // If they didn't close the popup
                    let line = whiteboard.newLine(this.buffer,2,this.currentColor,this.currentStroke,null,boardData.id);
                    whiteboard.drawLine(line);
                }else{ // If they closed the popup
                    console.log("popup closed");
                }
            }
            // clear the this.buffer
            this.buffer = [];
        });
    }
    //#endregion
    ///////////////////////
    // Text Tool
    //#region
    textStart(tempSVG){
        this.setMouseStart();
        if(!isTyping()){ // If the user isn't currently typing

            if(this.overTextArea == null){ // If the user isn't currently hovering over a text area
                // Setup the data for the text input area
                this.textDrawArea = {
                    x:this.mouseDownPoint.x,
                    y:this.mouseDownPoint.y,
                    w: 215,
                    h: 115,
                    isMouseDownForMoving: false,
                    isDraggable:true
                };

                // Set the font size
                let fontSize = 12 + (this.currentStroke*2);

                // Build the foreign Object that holds the text area in the svg
                tempSVG.append("foreignObject")
                    .attr("id","whiteboard-textInputArea-container")
                    .attr("x",this.textDrawArea.x)
                    .attr("y",this.textDrawArea.y)
                    .attr("width","100000px") // Technically the text area can't be bigger than 1000x1000
                    .attr("height","100000px")// But that shouldn't ever happen
                // Build the div that borders the text area and allows for dragging
                .append("xhtml:div")
                    .attr("id","whiteboard-textInputArea-moveBorder")
                    .style("width",this.textDrawArea.w+20)
                    .style("height",this.textDrawArea.h+20)
                    .on("mouseenter",()=>{
                        // Set the flag that says the mouse is over the text input area
                        this.textDrawArea.isMouseOver = true;
                    }).on("mouseleave",()=>{
                        // Clear the flag
                        this.textDrawArea.isMouseOver = false;
                    })
                    .on("mousedown",()=>{
                        // Only allow the "isMouseDownForMoving" flag to only be set if the mouse isn't over the text area
                        /*
                            This solves the issue of when dragging starting from inside the text box and the mouse
                            moves outside the box, it triggers the move event
                        */
                        if(this.textDrawArea.isDraggable){
                            // Set the flag that says the mouse is held down to move the text area
                            this.textDrawArea.isMouseDownForMoving = true;
                            // Set the offset that makes it so the text area's origin isn't exactly at the mouse
                            this.textDrawArea.offsetX = d3.mouse(d3.select("#whiteboard-textInputArea-moveBorder").node())[0];
                            this.textDrawArea.offsetY = d3.mouse(d3.select("#whiteboard-textInputArea-moveBorder").node())[1];
                        }
                    }).on("mouseup",()=>{
                        // Remove the flag
                        this.textDrawArea.isMouseDownForMoving = false;
                    })
                // Build the textarea
                .append("xhtml:textarea")
                    .attr("id","whiteboard-textInputArea")
                    .style("font-size",`${fontSize}px`)
                    .style("line-height",`${fontSize}px`)
                    .style("color",currentColor)
                    .style("width",this.textDrawArea.w)
                    .style("height",this.textDrawArea.h)
                    .on("input",()=>{
                        updateTextArea();
                        closeRightClickMenu();
                    })
                    .on("mouseenter",()=>{
                        // Flag for saying the mouse is over the text area container AND over the textarea
                        this.textDrawArea.isDraggable = false;
                    }).on("mouseleave",()=>{
                        // Remove the flag
                        this.textDrawArea.isDraggable = true;
                    })

                // After 10 milliseconds, select focus on the textarea
                setTimeout(()=>{document.getElementById("whiteboard-textInputArea").focus()},10);
            }
            else{ // If the user is currently hovering over a text area
                let fontSize = 12 + (this.overTextArea.stroke*2);

                // Setup the data for the text input area
                this.textDrawArea = {
                    x: this.overTextArea.dots.x-13 + this.overTextArea.transform.x,
                    y: this.overTextArea.dots.y-13-fontSize+(2+Math.floor(this.overTextArea.stroke/5))+this.overTextArea.transform.y,
                    w: 215,
                    h: 115,
                    isMouseDownForMoving: false,
                    isDraggable:true
                };

                // Build the foreign Object that holds the text area in the svg
                tempSVG.append("foreignObject")
                    .attr("id","whiteboard-textInputArea-container")
                    .attr("x",this.textDrawArea.x)
                    .attr("y",this.textDrawArea.y)
                    .attr("width","100000px") // Technically the text area can't be bigger than 1000x1000
                    .attr("height","100000px")// But that shouldn't ever happen
                // Build the div that borders the text area and allows for dragging
                .append("xhtml:div")
                    .attr("id","whiteboard-textInputArea-moveBorder")
                    .style("width",this.textDrawArea.w+20)
                    .style("height",this.textDrawArea.h+20)
                    .on("mouseenter",()=>{
                        // Set the flag that says the mouse is over the text input area
                        this.textDrawArea.isMouseOver = true;
                    }).on("mouseleave",()=>{
                        // Clear the flag
                        this.textDrawArea.isMouseOver = false;
                    })
                    .on("mousedown",()=>{
                        // Only allow the "isMouseDownForMoving" flag to only be set if the mouse isn't over the text area
                        /*
                            This solves the issue of when dragging starting from inside the text box and the mouse
                            moves outside the box, it triggers the move event
                        */
                        if(this.textDrawArea.isDraggable){
                            // Set the flag that says the mouse is held down to move the text area
                            this.textDrawArea.isMouseDownForMoving = true;
                            // Set the offset that makes it so the text area's origin isn't exactly at the mouse
                            this.textDrawArea.offsetX = d3.mouse(d3.select("#whiteboard-textInputArea-moveBorder").node())[0];
                            this.textDrawArea.offsetY = d3.mouse(d3.select("#whiteboard-textInputArea-moveBorder").node())[1];
                        }
                    }).on("mouseup",()=>{
                        // Remove the flag
                        this.textDrawArea.isMouseDownForMoving = false;
                    })
                // Build the textarea
                .append("xhtml:textarea")
                    .attr("id","whiteboard-textInputArea")
                    .style("font-size",`${fontSize}px`)
                    .style("line-height",`${fontSize}px`)
                    .style("color",this.overTextArea.color)
                    .style("width",this.textDrawArea.w)
                    .style("height",this.textDrawArea.h)
                    .property("value",this.overTextArea.dots.text)
                    .on("input",()=>{
                        updateTextArea();
                        closeRightClickMenu();
                    })
                    .on("mouseenter",()=>{
                        // Flag for saying the mouse is over the text area container AND over the textarea
                        this.textDrawArea.isDraggable = false;
                    }).on("mouseleave",()=>{
                        // Remove the flag
                        this.textDrawArea.isDraggable = true;
                    });

                    
                // Set the stroke and colour to match
                this.currentColor = this.overTextArea.color;
                this.currentStroke = this.overTextArea.stroke;
                d3.select("#colorBar-stroke-line").attr("stroke-width", this.currentStroke);
                d3.select("#rightClickMenu-stroke-input").attr("value",this.currentStroke);
                colorBar.changecolor(this.currentColor);
                colorBar.strokeSizeLine.attr("stroke", this.currentColor);
                initRightClickMenu();

                // Save the previous text area
                previousTextArea = this.overTextArea;

                deleteLine(this.overTextArea.id);

                // After 10 milliseconds, select focus on the textarea
                setTimeout(()=>{document.getElementById("whiteboard-textInputArea").focus()},10);
            }
            
        }else{ // If they are currently using a textarea
            // And they click anyone not over the text area
            if(!this.textDrawArea.isMouseOver){
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
    imageStart(){
        popup.imageSelector(this.mouse,(image)=>{
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
    moveStart(){

    }
    moveMove(){
        let obj = layerManager.getObject(selectedElement);

        whiteboard.changeTempTransform(this.mouse.x-this.mouseDownPoint.x+obj.transform.x,this.mouse.y-this.mouseDownPoint.y+obj.transform.y)
        whiteboard.updateLine(obj);
        whiteboard.autoSaveTimeout();
    }
    moveEnd(){

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

}


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
        ToolManager.overTextArea = null;
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