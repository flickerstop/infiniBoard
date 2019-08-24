class keyboardManager{

    constructor(){
        this.keyDownEvents = [];
        this.keyUpEvents = [];

        d3.select("body").on("keydown", ()=>{
            if(this.keyDownEvents.length != 0){
                for(let event of this.keyDownEvents){
                    event.event(d3.event);
                }
            }
        });

        d3.select("body").on("keyup", ()=>{
            if(this.keyUpEvents.length != 0){
                for(let event of this.keyUpEvents){
                    event.event(d3.event);
                }
            }
        });
    }

    /**
     * Registers a new event that will run a function on a keypress
     * @param {number} key Character to wait for
     * @param {Number} altCode Alt key also required (1=ctrl,2=alt,3=shift)
     * @param {Function} callback function to run when key pressed
     */
    newEvent(key,altCode,callback){
        this.keyDownEvents.push({
            key:key,
            altCode:altCode,
            event: function(event){
                // If the proper key is pressed
                if(event.keyCode == this.key){
                    // key the altCode for this event
                    // if ctrl, return 1, if not(if alt, return 2, if not(if shift, return 3, if not (return 0)));
                    let eventAltCode = event.ctrlKey?1:(event.altKey?2:(event.shiftKey?3:(0)));

                    // If no alt code required
                    if(this.altCode == eventAltCode){
                        callback();
                    }
                }
            }
        });
    }

    /**
     * Registers a new event that will run a function on a keypress
     * @param {number} key Character to wait for
     * @param {Number} altCode Alt key also required (1=ctrl,2=alt,3=shift)
     * @param {Function} callback function to run when key pressed
     */
    newUpEvent(key,callback){
        this.keyUpEvents.push({
            key:key,
            event: function(event){
                // If the proper key is pressed
                if(event.keyCode == this.key){
                    callback();
                }
            }
        });
    }

    /**
     * Clears the specific key event with the given alt code
     * @param {Number} key Event to clear
     * @param {Number} altCode Alt code to look for
     */
    clearEvent(key,altCode){
        this.keyDownEvents.splice((this.keyDownEvents.findIndex(x=>x.key == key && x.altCode == altCode)),1);
    }

    /**
     * Clears the specific key event with the given alt code
     * @param {Number} key Event to clear
     * @param {Number} altCode Alt code to look for
     */
    clearUpEvent(key,altCode){
        this.keyUpEvents.splice((this.keyDownEvents.findIndex(x=>x.key == key && x.altCode == altCode)),1);
    }

    /**
     * Gets all the current key keyDownEvents
     */
    getAllEvents(){
        return {down:this.keyDownEvents,up:this.keyUpEvents};
    }
};