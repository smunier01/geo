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
	    that.graph.addEdge(field.source, field.target, field.length, field.gid);
	    that.graph.addEdge(field.target, field.source, field.length, field.gid);
	    
	    // on enregistre les données géométrique nous intéressant pour l'affichage
	    that.geomNodes[field.source] = [field.x1, field.y1];
	    that.geomNodes[field.target] = [field.x2, field.y2];

	    that.geomRoutes[field.gid] = [field.source, field.target, field.geom];
	    
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
	"father" : null,
	"path" : null
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
		    "father" : selectedNode,
		    "path" : neighbors[neighbor].gid
		};
	    } else if (visitedNodes[neighbor].dst > dst) {
		visitedNodes[neighbor] = {
		    "dst" : dst,
		    "father" : selectedNode,
		    "path" : neighbors[neighbor].gid
		};
	    }

	}
	validatedNodes[selectedNode] = visitedNodes[selectedNode];
	delete visitedNodes[selectedNode];

    } while (selectedNode != stop);

    var path = [];
    selectedNode = stop;
    
    do{
	path.unshift(validatedNodes[selectedNode].path);
	selectedNode = validatedNodes[selectedNode].father;
	
    } while(validatedNodes[selectedNode].father != null);


    return path;
};


/*
  
 */
Routing.prototype.getGeometryFromRoute = function(nodes) {

    var features = [];
    var x1, y1, x2, y2;
    var route, edge;
    
    for (var i = 0; i < (nodes.length); i++) {

	edge = this.geomRoutes[nodes[i]];
	
	x1 = this.geomNodes[edge[0]][0];
	y1 = this.geomNodes[edge[0]][1];
	x2 = this.geomNodes[edge[1]][0];
	y2 = this.geomNodes[edge[1]][1];
	
	features.push(new ol.Feature({
	    'geometry': new ol.geom.Point(
		ol.proj.transform([x1, y1], 'EPSG:4326', 'EPSG:3857'))
	}));
	
	route = edge[2];

	var f = (new ol.format.WKT()).readFeature(route);

	f.setGeometry(f.getGeometry().transform('EPSG:4326', 'EPSG:3857'));
	
	features.push(f);
    }

    return features;
}





