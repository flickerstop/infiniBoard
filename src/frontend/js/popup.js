popup = function(){
    /**
     * Creates a popup to ask for box name and colour
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

        // Add the row to get the colour for the first board
        let colorRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        colorRow.append("div").html("First board bg color:").attr("class","popup-inputInfo");
        colorRow.append("input").attr("id","popup-colorPicker").attr("class",`popup-input jscolor`).attr("value","202020");
        

        var input = document.getElementById('popup-colorPicker');
        var picker = new jscolor(input);

        picker.backgroundColor = "var(--main)";
        picker.borderColor = "var(--highlight)";

        // Add the submit button
        let submitButton = d3.select("#popup-box").append("div");
        submitButton.html("submit").attr("class","popup-submit");

        // Add the error message
        d3.select("#popup-box").append("div").attr("id","popup-error");

        // Setup the onClick for the submit button
        submitButton.on("click",submit);

        // Unhide the popup
        d3.select("#popup").style("display",null);

        function submit(){
            let boxName = util.getValueId("popup-boardBoxName");
            let boardName = util.getValueId("popup-boardName");
            let bgColour = util.getValueId("popup-colorPicker");
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
            callback(boxName,boardName,bgColour);
        }
    }

    function closePopup(){
        d3.select("#popup-box").html(null);
        d3.select("#popup").style("display","none");
        keyManager.clearEvent(13,0);
    }

    return{
        newBoardBox:newBoardBox
    }
}();