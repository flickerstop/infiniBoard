util = function(){
    function getValueId(id){
        return d3.select("#"+id).property("value");
    }

    function clearValueId(id){
        return d3.select("#"+id).property("value","");
    }

    function setValueId(id,value){
        d3.select("#"+id).property("value",value);
    }

    return{
        getValueId:getValueId,
        clearValueId:clearValueId,
        setValueId:setValueId
    }
}();