touchInput = function(){

    /**
     * 
     * @param {String} elementID Name of the element
     * @param {*} functions 
     */
    function setup(elementID,functions){
        // get the element
        let element = document.getElementById(elementID);

        // What happens when drawing
        element.onpointermove = function(event){
            // Check if pen input && pen is down
            if(event.pointerType == "pen" && event.pressure > 0){
                if(event.buttons == 1){ // If pen tip
                    if(typeof functions.onPenMove !== "undefined"){
                        functions.onPenMove(event);
                    }
                }else if(event.buttons == 32){ // If eraser
                    if(typeof functions.onEraserMove !== "undefined"){
                        functions.onEraserMove(event);
                    }
                }
            }else if(event.pointerType == "touch"){
                functions.onTouchDraw(event);
            }
        };

        // Touch down events
        element.onpointerdown = function(event){
            // If the type of pointer is a pen
            if(event.pointerType == "pen"){
                if(event.buttons == 1){ // If pen tip
                    if(typeof functions.onPenDown !== "undefined"){
                        functions.onPenDown(event);
                    }
                }else if(event.buttons == 32){ // If eraser
                    if(typeof functions.onEraserDown !== "undefined"){
                        functions.onEraserDown(event);
                    }
                }
                
            } // if the type of pointer is touch
            else if(event.pointerType == "touch"){
                // if the user setup touch down events
                if(typeof functions.onTouchDown !== "undefined"){
                    functions.onTouchDown(event);
                }
            }
        }

        // Touch up events
        element.onpointerup = function(event){
            // If the type of pointer is a pen
            if(event.pointerType == "pen"){
                //console.log(event);
                if(event.button == 0){ // If pen tip
                    if(typeof functions.onPenUp !== "undefined"){
                        functions.onPenUp(event);
                    }
                }else if(event.button == 5){ // If eraser
                    if(typeof functions.onEraserUp !== "undefined"){
                        functions.onEraserUp(event);
                    }
                }
            } // if the type of pointer is touch
            else if(event.pointerType == "touch"){
                // if the user setup touch up events
                if(typeof functions.onTouchUp !== "undefined"){
                    functions.onTouchUp(event);
                }
            }
        }
    }


    return{
        setup:setup
    }
}();