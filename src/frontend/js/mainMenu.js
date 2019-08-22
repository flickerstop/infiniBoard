mainMenu = function(){

    /**
     * Does nothing atm
     */
    function init(){
        comm.sendMessage('getBoxes');
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
     * Function for UI button
     */
    function createNewBox(){
        boxManager.createBox((id)=>{
            switchToWhiteboard();
            whiteboard.init(id);
        });
    }

    function loadMyBoxes(){
        for(let box of boxManager.getShelf()){
            
            let boxesArea = d3.select("#myBoxes");
            let boxItem = boxesArea.append("div").attr("class","myBoxes-boxItem").style("background-color","#"+box.boards[0].bgcolor);
            // tableRow.append("td").html(new Date(box.lastUsed).toLocaleString());

            let svg = boxItem.append("svg").attr("viewBox",`0,0,1000,1000`).attr("class","myBoxes-boxItem-svg-preview");
            for(let line of box.boards[0].lines){
                drawLine(svg,line);
            }
            

            boxItem.append("div").attr("class","myBoxes-boxItem-svg-dimmer");
           
           
            let boxInfo = boxItem.append("div").attr("class","myBoxes-boxItem-Info");
            boxInfo.append("div").attr("class","myBoxes-boxItem-Info-Name").append("span")
                .html(box.saveName);
            let numberOfLines = 0;
            box.boards.forEach(board => numberOfLines += board.lines.length)
            boxInfo.append("div").attr("class","myBoxes-boxItem-Info-Details").append("span")
                .html(numberOfLines + ` Line${numberOfLines > 1 ? "s" : ""}` + "<br />"
                    + box.boardCount + ` Board${box.boardCount > 1 ? "s" : ""}`);
            boxInfo.append("div").attr("class","myBoxes-boxItem-Info-Date").append("span")
                .html(new Date(box.lastUsed).toLocaleString());  


            // tableRow.on("click",()=>{
            //     boxManager.setBox(box);
            //     switchToWhiteboard();
            //     whiteboard.init(0);
            // });

            // Draw the preview

        }
    }

    function drawLine(svg,line){
        svg = svg.append("g");
        if(line.type == 0){
            let drawLine = d3.line().curve(d3.curveCardinal);
            drawLine.x((d)=>{
                return d.x;
            });
            drawLine.y((d)=>{
                return d.y;
            });
            let svgLine = svg.append("path")
                .attr("d", drawLine(line.dots))
                .attr("stroke", line.color)
                .attr("stroke-width", line.stroke)
                .attr("fill", "none")
                .attr("id",`object${line.id}`);

        }else if(line.type == 1){
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
            svg.append("rect")
                .attr("x",rectX)
                .attr("y",rectY)
                .attr("height",height)
                .attr("width",width)
                .attr("fill", line.color)
                .attr("id",`object${line.id}`);
        }else if(line.type == 2){
            let drawLine = d3.line().curve(d3.curveCardinal);
            drawLine.x((d)=>{
                return d.x;
            });
            drawLine.y((d)=>{
                return d.y;
            });
            svg.append("path")
                .attr("d", drawLine(line.dots))
                .attr("stroke", line.color)
                .attr("stroke-width", line.stroke)
                .attr("fill", line.color)
                .attr("fill-opacity",0.3)
                .attr("id",`object${line.id}`)
                .attr("class","whiteboard-link");
        }else if(line.type == 3){
            let fontSize = 12 + (line.stroke*2);
            let textGroup = svg.append("g").attr("id",`object${line.id}`);
            let lines = 0;
            for(let textLine of line.dots.text.split("\n")){
                textGroup.append("text")
                    .attr("x",line.dots.x)
                    .style("font-size",`${fontSize}px`)
                    .attr("y",line.dots.y+(lines*fontSize))
                    .style("fill",line.color)
                    .html(textLine);
                lines++;
            }
        }
        svg.attr("transform",`translate(${line.transform.x} ${line.transform.y})`);
    }
    /**
     * Menu option to load a previous box
     */
    function loadMenu(){
        // Hide the main menu but show the loading boxes screen
        d3.select("#mainMenu").style("display","none");
        d3.select("#loadBox").style("display",null);

        // For each box that was has been previously saved
        for(let box of boxManager.getShelf()){
            let numberOfLines = 0;
            // Calculate number of lines
            for(let board of box.boards){
                numberOfLines += board.lines.length;
            }

            let tableRow = d3.select("#loadBox-table").append("tr");
            tableRow.append("td").html(box.saveName);
            tableRow.append("td").html(new Date(box.lastUsed).toLocaleString());
            tableRow.append("td").html(box.boardCount);
            tableRow.append("td").html(numberOfLines);
            let svg = tableRow.append("td").append("svg");
            svg.attr("viewBox",`0,0,1000,1000`).style("background-color","#"+box.boards[0].bgColour).attr("class","loadBox-preview");

            for(let line of box.boards[0].lines){
                drawLine(svg,line.dots,line.stroke,line.color);
            }

            tableRow.on("click",()=>{
                boxManager.setBox(box);
                switchToWhiteboard();
                whiteboard.init(0);
            });

            // Draw the preview

        }

        
    }

    return {
        init:init,
        createNewBox:createNewBox,
        loadMenu:loadMenu,
        loadMyBoxes:loadMyBoxes
    }
}();