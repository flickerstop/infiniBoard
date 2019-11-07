class ToolManager{
    constructor(){
        this._isDrawing = false;
        this._isErasing = false;
        this._currentTool = 0;
        this._currentToolAltCode = 0;
    }


    /**
     * Changes the current tool to the passed number
     * @param {Number} toolID number for the tool
     */
    setTool(toolID,altCode = 0){
        whiteboard.closeMenus();

        d3.select("#toolbar-icon-"+this._currentTool).attr("class","toolbar-icon");
        this._currentTool = toolID;
        this._currentToolAltCode = altCode;
        d3.select("#toolbar-icon-"+this._currentTool).attr("class","toolbar-icon selected");

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

        d3.select("#toolbar-icon-"+this._currentTool).attr("class","toolbar-icon");
        this._currentTool = toolID;
        d3.select("#toolbar-icon-"+this._currentTool).attr("class","toolbar-icon selected");
    }

    isPen(){return this._currentTool==0?true:false;}
    isHand(){return this._currentTool==1?true:false;}
    isEraser(){return this._currentTool==2?true:false;}
    isLine(){return this._currentTool==3?true:false;}
    isRect(){return this._currentTool==4?true:false;}
    isLink(){return this._currentTool==5?true:false;}
    isText(){return this._currentTool==6?true:false;}
    isMouse(){return this._currentTool==7?true:false;}
    isMove(){return this._currentTool==7?true:false;} // Was changed to be the same as mouse
    isImage(){return this._currentTool==9?true:false;}
    isCustomShape(){return this._currentTool==11?true:false;}
    isRotate(){return this._currentTool==12?true:false;}

    // SETTERS & GETTERS
    //#region
    set isDrawing(isNowDrawing){
        this._isDrawing = isNowDrawing;
    }
    get isDrawing(){
        return this._isDrawing;
    }
    
    set isErasing(isNowErasing){
        this._isErasing = isNowErasing;
    }
    get isErasing(){
        return this._isErasing;
    }

    set urrentTool(newTool){
        this._currentTool = newTool;
    }
    get currentTool(){
        return this._currentTool;
    }

    set currentToolAltCode(newAltCode){
        this._currentToolAltCode = newAltCode;
    }
    get currentToolAltCode(){
        return this._currentToolAltCode;
    }

    //#endregion
}