var Routing = function() {

    this.graph = undefined;
    this.data = [];
    
};

Routing.prototype.init = function(file) {

    this.graph = new Graph;

    var d = jQuery.Deferred();

    that = this;
    
    $.getJSON(file, function(result){
	
	$.each(result, function(i, field){
	    that.data[field.source] = [field.x1, field.y1];
            that.graph.addNode(field.source);
	    that.graph.addNode(field.target);
	    that.graph.addEdge(field.source, field.target, field.length);
	});

	d.resolve();

    });

    return d;
};

Routing.prototype.dijkstra = function(from, to) {
    return [from, to];
};

Routing.prototype.getRouteFromNodes = function(nodes) {

    var features = [];

    for (var i = 0; i < (nodes.length - 1); i++) {
	x1 = this.data[nodes[i+0]][0];
	y1 = this.data[nodes[i+0]][1];
	x2 = this.data[nodes[i+1]][0];
	y2 = this.data[nodes[i+1]][1];

	features.push(new ol.Feature({
	    'geometry': new ol.geom.LineString(
		[ol.proj.transform([x1, y1], 'EPSG:4326', 'EPSG:3857'),
		 ol.proj.transform([x2, y2], 'EPSG:4326', 'EPSG:3857')]
	    )
	}));
    }

    return features;
}





