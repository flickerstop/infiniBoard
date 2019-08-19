mainMenu = function(){

    let loadedBoxes = null;

    /**
     * Does nothing atm
     */
    function init(){

    }

    /**
     * Button function for when selecting "new boardbox"
     */
    function createBoardBox(){
        popup.newBoardBox((boardBoxName,boardName,bgcolor)=>{
            //NOTE color can't be set correctly ATM
            console.log({
                boxName: boardBoxName,
                boardName: boardName,
                bgColor: bgcolor
            });
            whiteboard.newBoardBox(boardBoxName,boardName,bgcolor);
            switchToWhiteboard();
            whiteboard.init();
        });
    }

    /**
     * Hides the menu to show the whiteboard
     */
    function switchToWhiteboard(){
        d3.select("#mainMenu").style("display","none");
        d3.select("#loadBox").style("display","none");
        d3.select("#whiteboard").style("display",null);
    }

    /**
     * Menu option to load a previous box
     */
    function loadMenu(){
        // Hide the main menu but show the loading boxes screen
        d3.select("#mainMenu").style("display","none");
        d3.select("#loadBox").style("display",null);

        // For each box that was has been previously saved
        for(let box of loadedBoxes){
            let numberOfLines = 0;
            // Calculate number of lines
            for(let board of box.boards){
                numberOfLines += board.lines.length;
            }

            let tableRow = d3.select("#loadBox-table").append("tr");
            tableRow.append("td").html(box.saveName);
            tableRow.append("td").html(box.lastUsed); //TODO convert to date
            tableRow.append("td").html(box.boardCount);
            tableRow.append("td").html(numberOfLines);
            let svg = tableRow.append("td").append("svg");
            svg.attr("viewBox",`0,0,1000,1000`).style("background-color","#"+box.boards[0].bgColour).attr("class","loadBox-preview");

            for(let line of box.boards[0].lines){
                drawLine(svg,line.dots,line.stroke,line.color);
            }

            tableRow.on("click",()=>{
                return loadBox(box);
            });

            // Draw the preview

        }

        function drawLine(svg,buffer,stroke,colour){
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
    }

    /**
     * Loads the passed boardbox, loads up the first inifiboard by default
     * @param {object} box Box object to load up
     */
    function loadBox(box){
        console.log(box);
        whiteboard.setBoardBox(box);
        switchToWhiteboard();
        whiteboard.init();
    }

    /**
     * Sets the loaded boxes to the passed object
     * @param {object} boxes Array of all saved boxes
     */
    function setLoadBoxes(boxes){
        loadedBoxes=boxes;
    }

    /**
     * Checks to see if this name is good to use. True = Already used
     * @param {String} newName Name of the box to Check
     */
    function checkBoxNameUsed(newName){
        if (loadedBoxes != null){
            for(let box of loadedBoxes){
                if(box.saveName == newName){
                    return true;
                }
            }
        }
        return false;
    }

    return {
        init:init,
        createBoardBox:createBoardBox,
        loadMenu:loadMenu,
        setLoadBoxes:setLoadBoxes,
        checkBoxNameUsed:checkBoxNameUsed
    }
}();