popup = function(){
    /**
     * Creates a popup to ask for box name and color
     * @param {function} callback Function to callback to when popup is submitted
     */
    function newBoardBox(callback){
        keyManager.newEvent(13,0,submit);
        // Add the ability to click the background to close the popup
        d3.select("#popup-blackout").on("click",closePopup);

        // Add the title
        d3.select("#popup-box").append("div").html("Create an Infiniboard Box").attr("class","popup-title");

        // Add the row to name the box
        let boxNameRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        boxNameRow.append("div").html("Box Name:").attr("class","popup-inputInfo");
        boxNameRow.append("input").attr("id","popup-boardBoxName").attr("class","popup-input");

        // Add the row to name the first board
        let boardNameRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        boardNameRow.append("div").html("First Board Name:").attr("class","popup-inputInfo");
        boardNameRow.append("input").attr("id","popup-boardName").attr("class","popup-input");

        // Add the row to get the color for the first board
        let colorRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        colorRow.append("div").html("First board bg color:").attr("class","popup-inputInfo");
        colorRow.append("input").attr("id","popup-colorPicker").attr("class",`popup-input jscolor`).attr("value","202020");
        

        var input = document.getElementById('popup-colorPicker');
        var picker = new jscolor(input);

        picker.backgroundColor = "var(--main)";
        picker.borderColor = "var(--highlight)";

        // Add the submit button
        let submitButton = d3.select("#popup-box").append("div");
        submitButton.html("Submit").attr("class","popup-submit");

        // Add the error message
        d3.select("#popup-box").append("div").attr("id","popup-error");

        // Setup the onClick for the submit button
        submitButton.on("click",submit);

        // Unhide the popup
        d3.select("#popup").style("display",null);

        function submit(){
            let boxName = util.getValueId("popup-boardBoxName");
            let boardName = util.getValueId("popup-boardName");
            let bgcolor = util.getValueId("popup-colorPicker");
            // Make sure they wrote a name
            if(boxName == ""){
                d3.select("#popup-boardBoxName").style("background-color","#c0392b");
                d3.select("#popup-error").html("Please Write a Name for this Infiniboard Box!");
                return;
            }
            if(boardName == ""){
                d3.select("#popup-boardName").style("background-color","#c0392b");
                d3.select("#popup-error").html("Please Write a Name for the first Infiniboard!");
                return;
            }
            // Check if the name is already used
            //FIXME UNCOMMENT THIS AFTER MOE FIXES HIS CODE
            // if(boxManager.checkBoxNameUsed(boxName)){ 
            //     d3.select("#popup-boardBoxName").style("background-color","#c0392b");
            //     d3.select("#popup-error").html("This name is already in use!");
            //     return;
            // }

            keyManager.clearEvent(13,0);
            d3.select("#popup").style("display","none");
            d3.select("#popup-box").html(null);
            callback(boxName,boardName,bgcolor);
        }

        function closePopup(){
            d3.select("#popup-box").html(null);
            d3.select("#popup").style("display","none");
            keyManager.clearEvent(13,0);
        }
    }

    function newBoard(lineBuffer,callback){
        keyManager.newEvent(13,0,submit);
        // Add the ability to click the background to close the popup
        d3.select("#popup-blackout").on("click",closePopup);

        // Add the title
        d3.select("#popup-box").append("div").html("Create a New Infiniboard").attr("class","popup-title");

        // Add the row to show the dropdown list of previous boards
        let pastBoardsRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        pastBoardsRow.append("div").html("Select A Board:").attr("class","popup-inputInfo");
        let dropdown = pastBoardsRow.append("select").attr("id","popup-selectBoard").attr("class","popup-select");

        dropdown.append("option").attr("value",-1).html("(+) Add a new Infiniboard");
        for(let board of boxManager.getBox().boards){
            dropdown.append("option").attr("value",board.id).html(board.name);
        }

        // Add the row to name the board
        let boardNameRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        boardNameRow.append("div").html("Board Name:").attr("class","popup-inputInfo");
        let boardNameInput = boardNameRow.append("input").attr("id","popup-boardName").attr("class","popup-input");

        // Add the row to get the color for the first board
        let colorRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        colorRow.append("div").html("First board bg color:").attr("class","popup-inputInfo");
        let colorInput = colorRow.append("input").attr("id","popup-colorPicker").attr("class",`popup-input jscolor`).attr("value","202020");

        // Add the submit button
        let submitButton = d3.select("#popup-box").append("div");
        submitButton.html("Submit").attr("class","popup-submit");

        // Add the error message
        d3.select("#popup-box").append("div").attr("id","popup-error");

        // Setup the onClick for the submit button
        submitButton.on("click",submit);

        var input = document.getElementById('popup-colorPicker');
        var picker = new jscolor(input);

        picker.backgroundColor = "var(--main)";
        picker.borderColor = "var(--highlight)";

        dropdown.on("change",()=>{
            let value = util.getValueId("popup-selectBoard");

            if(value >= 0){
                let board = boxManager.getBoard(value);

                // Disable the rows 
                colorRow.attr("class","popup-row disabled");
                boardNameRow.attr("class","popup-row disabled");

                // Disable the inputs
                colorInput.property("disabled", true);
                boardNameInput.property("disabled", true);

                // Change the values to reflect the selected board
                boardNameInput.property("value",board.name);
                picker.fromString(board.bgcolor);
                //d3.select("#popup-colorPicker").property("value",board.bgcolor).style("background-color",board.bgcolor);
            }else{
                // Enable the rows 
                colorRow.attr("class","popup-row");
                boardNameRow.attr("class","popup-row");

                // Enable the inputs
                colorInput.property("disabled", false);
                boardNameInput.property("disabled", false);

                // Set back to default inputs
                boardNameInput.property("value","");
                picker.fromString("202020");
            }

        });



        // Unhide the popup
        d3.select("#popup").style("display",null);

        function submit(){
            let boardName = util.getValueId("popup-boardName");
            let bgcolor = util.getValueId("popup-colorPicker");
            let id = util.getValueId("popup-selectBoard");

            if(id == -1){
                // Make sure they wrote a name
                if(boardName == ""){
                    d3.select("#popup-boardName").style("background-color","#c0392b");
                    d3.select("#popup-error").html("Please Write a Name for the Infiniboard!");
                    return;
                }
                // Check if the name is already used
                if(boxManager.checkBoardNameUsed(boardName)){ 
                    d3.select("#popup-boardName").style("background-color","#c0392b");
                    d3.select("#popup-error").html("This name is already in use!");
                    return;
                }
            }
            
            keyManager.clearEvent(13,0);
            d3.select("#popup").style("display","none");
            d3.select("#popup-box").html(null);
            callback(id,boardName,bgcolor,lineBuffer);
        }

        function closePopup(){
            d3.select("#popup-box").html(null);
            d3.select("#popup").style("display","none");
            keyManager.clearEvent(13,0);
        }
    }

    

    return{
        newBoardBox:newBoardBox,
        newBoard:newBoard
    }
}();