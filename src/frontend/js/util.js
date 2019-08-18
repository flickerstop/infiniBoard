util = function(){
    function getValueId(id){
        return d3.select("#"+id).property("value");
    }

    return{
        getValueId:getValueId
    }
}();