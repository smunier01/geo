var Routing = function() {

    this.graph = undefined;
    this.geomNodes = [];
    this.geomRoutes = [];
};

Routing.prototype.init = function(file) {

    this.graph = new Graph;

    var d = jQuery.Deferred();

    that = this;
    
    $.getJSON(file, function(result){
	
	$.each(result, function(i, field){

	    // On remplis notre graph pour appliquer les differents algorithmes nécessaire
	    that.graph.addNode(field.source);
	    that.graph.addNode(field.target);
	    // Le graph est orienté, mais nos routes ne le sont pas.
	    that.graph.addEdge(field.source, field.target, field.length);
	    that.graph.addEdge(field.target, field.source, field.length);
	    
	    // on enregistre les données géométrique nous intéressant pour l'affichage
	    that.geomNodes[field.source] = [field.x1, field.y1];
	    that.geomNodes[field.target] = [field.x2, field.y2];

	    that.geomRoutes[field.source + '/' + field.target] = field.st_astext;
	    that.geomRoutes[field.target + '/' + field.source] = field.st_astext;
	    
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


/*
  
*/
Routing.prototype.getGeometryFromRoute = function(nodes) {

    var features = [];
    var x1, y1, x2, y2;
    var route;
    
    for (var i = 0; i < (nodes.length - 1); i++) {

	x1 = this.geomNodes[nodes[i+0]][0];
	y1 = this.geomNodes[nodes[i+0]][1];
	x2 = this.geomNodes[nodes[i+1]][0];
	y2 = this.geomNodes[nodes[i+1]][1];

	route = this.geomRoutes[nodes[i+0] + '/' + nodes[i+1]];

	features.push(new ol.Feature({
	    'geometry': new ol.geom.Point(
		ol.proj.transform([x1, y1], 'EPSG:4326', 'EPSG:3857'))
	}));

	var f = (new ol.format.WKT()).readFeature(route);

	f.setGeometry(f.getGeometry().transform('EPSG:4326', 'EPSG:3857'));
	
	features.push(f);
	
    }

    return features;
}





