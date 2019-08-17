popup = function(){


    /**
     * Creates a popup to ask for box name and colour
     * @param {function} callback Function to callback to when popup is submitted
     */
    function newBoardBox(callback){

        // Add the title
        d3.select("#popup-box").append("div").html("Create an Infiniboard Box").attr("class","popup-title");

        // Add the row to name the box
        let nameRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        nameRow.append("div").html("Box Name:").attr("class","popup-inputInfo");
        nameRow.append("input").attr("id","popup-boardBoxName").attr("class","popup-input");

        // Add the row to get the colour for the first board
        let colorRow = d3.select("#popup-box").append("div").attr("class","popup-row");
        colorRow.append("div").html("First board bg color:").attr("class","popup-inputInfo");
        colorRow.append("input").attr("id","popup-input").attr("class","popup-input");

        // Add the submit button
        let submit = d3.select("#popup-box").append("div");
        submit.html("submit").attr("class","popup-submit");

        // Add the error message
        d3.select("#popup-box").append("div").attr("id","popup-error");

        // Setup the onClick for the submit button
        submit.on("click",()=>{
            let boxName = d3.select("#popup-boardBoxName").property("value");
            // Make sure they wrote a name
            if(boxName == ""){
                d3.select("#popup-boardBoxName").style("background-color","#c0392b");
                d3.select("#popup-error").html("Please Write a Name for this Infiniboard Box!");
                return;
            }
            // Check if the name is already used
            else if(mainMenu.checkBoxNameUsed(boxName)){ 
                d3.select("#popup-boardBoxName").style("background-color","#c0392b");
                d3.select("#popup-error").html("This name is already in use!");
                return;
            }
            d3.select("#popup").style("display","none");
            d3.select("#popup-box").html(null);
            callback(boxName,"white");
        })

        // Unhide the popup
        d3.select("#popup").style("display",null);

    }

    return{
        newBoardBox:newBoardBox
    }
}();