class keyboardManager{

    constructor(){
        this.events = [];

        d3.select("body").on("keydown", ()=>{
            if(this.events.length != 0){
                for(let event of this.events){
                    event.event(d3.event);
                }
            }
        });
    }

    /**
     * Registers a new event that will run a function on a keypress
     * @param {number} key Character to wait for
     * @param {Number} altCode Alt key also required
     * @param {Function} callback function to run when key pressed
     */
    newEvent(key,altCode,callback){
        this.events.push({
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
     * Clears the specific key event with the given alt code
     * @param {Number} key Event to clear
     * @param {Number} altCode Alt code to look for
     */
    clearEvent(key,altCode){
        this.events.splice((this.events.findIndex(x=>x.key == key && x.altCode == altCode)),1);
    }

    /**
     * Gets all the current key events
     */
    getAllEvents(){
        return this.events;
    }
};