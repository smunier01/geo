
/**
 * Routing
 * 
 * @class
 */
var Routing = function() {

    /**
     * Le graphe utilisé
     * @type {Graph}
     */
    this.graph = undefined;

    /**
     * Array contenant la position x, y de chacun des noeuds.
     * La clé est l'identifiant du noeud (.source / .target dans routing.json)
     * @type {Array.<Number, Array.<Number, Number>>}
     */
    this.geomNodes = [];

    /**
     * Array contenant les données géometrique des arcs nécessaire pour l'affichage.
     * La clé est l'identifiant de l'arc (.gid dans routing.json)
     * @type {Array.<Number, Array.<Number, Number, ol.format.WKT>>}
     */
    this.geomRoutes = [];
    
};

/**
 * Lecture du fichier routing et création du graphe
 * @param {string} file json file contenant les informations sur le graphe (format PGrouting)
 */
Routing.prototype.init = function(file) {

    this.graph = new Graph;

    var d = jQuery.Deferred();

    var that = this;
    
    $.getJSON(file).done(function(result) {

	$.each(result, function(i, field) {

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

    return d.promise();
};

/**
 * Implémentation de l'algorithme de dijkstra
 * @param {Number} start noeud de depart
 * @param {Number} stop noeud d'arrivé
 * @returns {Number[]} Chemin représenté par une liste d'identifiant des ARCS. Ces identifiant doivent existé en tant que clé du tableau geomRoutes
 */
Routing.prototype.dijkstra = function(start, stop) {

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
 * Récupére les informations géometriques d'une route.
 * @param {Number[]} route liste d'arcs du graph decrivant la route à afficher
 * @returns {ol.Feature[]} Liste d'openlayers3 features.
 */
Routing.prototype.getGeometryFromRoute = function(route) {

    var features = [];
    var x1, y1, x2, y2;
    var routeGeom, edge;
    
    for (var i = 0; i < (route.length); i++) {

	edge = this.geomRoutes[route[i]];
	
	x1 = this.geomNodes[edge[0]][0];
	y1 = this.geomNodes[edge[0]][1];
	x2 = this.geomNodes[edge[1]][0];
	y2 = this.geomNodes[edge[1]][1];
	
	features.push(new ol.Feature({
	    'geometry': new ol.geom.Point(
		ol.proj.transform([x1, y1], 'EPSG:4326', 'EPSG:3857'))
	}));
	
	routeGeom = edge[2];

	var f = (new ol.format.WKT()).readFeature(routeGeom);

	f.setGeometry(f.getGeometry().transform('EPSG:4326', 'EPSG:3857'));
	
	features.push(f);
    }

    return features;
}





