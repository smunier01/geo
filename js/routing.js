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
	    that.data[field.target] = [field.x2, field.y2];
            that.graph.addNode(field.source);
	    that.graph.addNode(field.target);
	    that.graph.addEdge(field.source, field.target, field.length);
	    that.graph.addEdge(field.target, field.source, field.length);
	});

	d.resolve();

    });

    return d;
};

Routing.prototype.dijkstra = function (start, stop) {
    var validatedNodes = [];
    var visitedNodes = [];
    visitedNodes[start] = {
	"dst" : 0,
	"father" : null
    };
    do {
	if( Object.keys(visitedNodes).length == 0){
	    return [];
	}
	var selectedNode;
	var dst = Infinity;

	for (node in visitedNodes) {
	    if (visitedNodes[node].dst < dst) {
		selectedNode = node;
		dst = visitedNodes[node].dst;
	    }
	}

	var neighbors = this.graph.getNode(selectedNode)._outEdges;

	for (neighbor in neighbors) {
	    
	    if (neighbor in validatedNodes) {
		continue;
	    }
	    
	    dst = visitedNodes[selectedNode].dst + neighbors[neighbor].weight;
	    
	    if (!(neighbor in visitedNodes)) {
		
		visitedNodes[neighbor] = {
		    "dst" : dst,
		    "father" : selectedNode
		};
	    } else if (visitedNodes[neighbor].dst > dst) {
		visitedNodes[neighbor] = {
		    "dst" : dst,
		    "father" : selectedNode
		};
	    }

	}
	validatedNodes[selectedNode] = visitedNodes[selectedNode];
	delete visitedNodes[selectedNode];

    } while (selectedNode != stop);

    var path = [];
    selectedNode = stop;
    
    do{
	path.unshift(selectedNode);
	selectedNode = validatedNodes[selectedNode].father;
    } while(selectedNode != null);
    
    return path;
};

Routing.prototype.getRouteFromNodes = function(nodes) {

    var features = [];

    for (var i = 0; i < (nodes.length - 1); i++) {

	x1 = this.data[nodes[i+0]][0];
	y1 = this.data[nodes[i+0]][1];
	x2 = this.data[nodes[i+1]][0];
	y2 = this.data[nodes[i+1]][1];

	features.push(new ol.Feature({
	    'geometry': new ol.geom.Point(
		ol.proj.transform([x1, y1], 'EPSG:4326', 'EPSG:3857'))
	}));
	
	features.push(new ol.Feature({
	    'geometry': new ol.geom.LineString(
		[ol.proj.transform([x1, y1], 'EPSG:4326', 'EPSG:3857'),
		 ol.proj.transform([x2, y2], 'EPSG:4326', 'EPSG:3857')]
	    )
	}));
    }

    return features;
}





