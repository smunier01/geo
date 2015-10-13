var Routing = function() {

    var graph = undefined;
    
};

Routing.prototype.init = function(file) {

    this.graph = new Graph;

    var d = jQuery.Deferred();

    that = this;
    
    $.getJSON(file, function(result){
	
	$.each(result, function(i, field){
            that.graph.addNode(field.source);
	    that.graph.addNode(field.target);
	    that.graph.addEdge(field.source, field.target, field.length);
	});

	d.resolve();

    });

    return d;
};

Routing.prototype.dijkstra = function(from, to) {
    // ?
};


