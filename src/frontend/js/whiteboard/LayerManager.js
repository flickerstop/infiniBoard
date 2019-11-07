class LayerManager{
    constructor(){
        this.svgLayers = [];
        this._layers = null;
        this._currentLayer = null;
    }



    /**
     * Creates SVGs for all the layers inside the passed parent svg
     * @param {Object} parentSVG d3 selected group element
     */
    createSVGLayers(parentSVG){
        // Create the svgs for all the layers
        for(let layer of this._layers){
            let svgLayer = parentSVG.append("g").attr("id","svg-layer-"+layer.id);
            // draw all the objects in the current whiteboard
            for(let object of layer.objects){
                whiteboard.drawLine(object,svgLayer);
            }

            // Check if the layer is hidden
            if(!layer.isVisible){
                svgLayer.style("display","none");
            }

            this.svgLayers.push({
                svg:svgLayer,
                id:layer.id
            });
        }
    }

    /**
     * Gets a specific SVG layer
     * @param {Number} layerID Id of the layer
     */
    getSVGLayer(layerID){
        return this.svgLayers.find(x=>x.id == layerID).svg;
    }
    
    /**
     * Gets the current SVG layer
     */
    getCurrentSVGLayer(){
        return this.svgLayers.find(x=>x.id == this._currentLayer.id).svg;
    }

    /**
     * Trys to find an object on any layer
     * @param {Number} objectID ID for the object to get
     */
    getObject(objectID){
        for(let layer of this._layers){
            for(let object of layer.objects){
                if(object.id == objectID){
                    return object;
                }
            }
        }
        return null;
    }

    /**
     * Gets the Index of the object on the current layer
     * @param {Number} objectID ID of the Object
     */
    getObjectIndex(objectID){
        return this._currentLayer.objects.findIndex(x=>x.id == objectID);
    }

    /**
     * Deletes an object from the current layer
     * @param {Number} objectIndex ID of the Object
     */
    deleteObject(objectIndex){
        return this._currentLayer.objects.splice(objectIndex,1)[0];
    }

    /**
     * Creates a new layer under the passed parent svg
     * @param {Number} id ID for the new layer
     * @param {Object} parentSVG d3 selected SVG to append the child to
     */
    newSVGLayer(id,parentSVG){
        this.svgLayers.push({
            svg: parentSVG.append("g").attr("id","svg-layer-"+id),
            id: id
        });
    }

    /**
     * Checks to see if the given object ID is on the current layer
     * @param {Number} objID The ID of the object to check
     */
    onCurrentLayer(objID){
        return this._currentLayer.objects.find(x=>x.id == objID) != undefined?true:false;
    }

    /**
     * Saves a newly created object to the current SVG layer
     * @param {Object} object Object with data for the new object
     */
    addNewObject(object){
        this._currentLayer.objects.push(object);
    }

    /**
     * Saves a newly created object to a specific layer
     * @param {Number} layerID ID of the layer
     * @param {Object} object Object with the data for the new object
     */
    addNewObjectSpecificLayer(layerID,object){
        this._layers.find(x=>x.id == layerID).objects.push(object);
    }

    // SETTERS & GETTERS
    //#region
    /**
     * Sets the Layers
     */
    set layers(newLayers){
        // Set the list of all layers
        this._layers = newLayers;
        // Set the current layer
        this._currentLayer = this.layers[0];
    }

    /**
     * Gets the Layers
     */
    get layers(){
        return this._layers;
    }

    set currentLayer(num){
        this._currentLayer = this._layers[num];
    }

    get currentLayer(){
        return this._currentLayer;
    }
    //#endregion
}