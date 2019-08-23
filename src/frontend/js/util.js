util = function(){
    function getValueId(id){
        return d3.select("#"+id).property("value");
    }

    function clearValueId(id){
        return d3.select("#"+id).property("value","");
    }

    return{
        getValueId:getValueId,
        clearValueId:clearValueId
    }
}();