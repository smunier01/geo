/* global ol, Graph, $ */

/**
 * Routing
 * 
 * @class
 */
var Routing = function(app) {

    /**
     *
     */
    this.app = app;
    
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

    /**
     * Permet de savoir rapidement depuis l'application si un object se trouve dans le graphe ou pas
     * Par exemple les lignes de tram ou train ne le sont pas.
     * La clé est un identifiant OSM
     * @type {Array.<Number, boolean>}
     */
    this.isRouting = [];

    /**
     *     
     */
    this.maxGid = 0;

    /**
     *
     */
    this.maxNodeId = 0;
    
};

/**
 * Lecture du fichier routing et création du graphe
 * @param {string} file json file contenant les informations sur le graphe (format PGrouting)
 */
Routing.prototype.init = function(file) {

    this.graph = new Graph();

    var d = $.Deferred();

    var that = this;

    $.getJSON(file).done(function(result) {

        $.each(result, function(i, field) {

            var source = parseInt(field.source);
            var target = parseInt(field.target);
            var length = parseFloat(field.length);
            var gid = parseInt(field.gid);
            var x1 = parseFloat(field.x1);
            var x2 = parseFloat(field.x2);
            var y1 = parseFloat(field.y1);
            var y2 = parseFloat(field.y2);
            var osm_id = parseInt(field.osm_id);

            if (source > that.maxNodeId) {
                that.maxNodeId = source;
            }

            if (target > that.maxNodeId) {
                that.maxNodeId = target;
            }

            if (gid > that.maxGid) {
                that.maxGid = gid;
            }
            
            // On remplis notre graph pour appliquer les differents algorithmes nécessaire
            that.graph.addNode(source);
            that.graph.addNode(target);
            // Le graph est orienté, mais nos routes ne le sont pas.
            that.graph.addEdge(source, target, length, gid);
            that.graph.addEdge(target, source, length, gid);
            
            // on enregistre les données géométrique nous intéressant pour l'affichage
            that.geomNodes[source] = [x1, y1];
            that.geomNodes[target] = [x2, y2];

            that.geomRoutes[gid] = [source, target, field.geom, osm_id, length];

            that.isRouting[osm_id] = true;
            
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
        'dst' : 0,
        'father' : null,
        'path' : null
    };

    do {
        if( Object.keys(visitedNodes).length == 0){
            return [];
        }
        var selectedNode;
        var dst = Infinity;

        for (var node in visitedNodes) {
            if (visitedNodes[node].dst < dst) {
                selectedNode = node;
                dst = visitedNodes[node].dst;
            }
        }

        var neighbors = this.graph.getNode(selectedNode)._outEdges;

        for (var neighbor in neighbors) {
            
            if (neighbor in validatedNodes) {
                continue;
            }
            
            dst = visitedNodes[selectedNode].dst + neighbors[neighbor].weight;

            if (!(neighbor in visitedNodes)) {

                visitedNodes[neighbor] = {
                    'dst' : dst,
                    'father' : selectedNode,
                    'path' : neighbors[neighbor].gid
                };
            } else if (visitedNodes[neighbor].dst > dst) {
                visitedNodes[neighbor] = {
                    'dst' : dst,
                    'father' : selectedNode,
                    'path' : neighbors[neighbor].gid
                };
            }

        }
        validatedNodes[selectedNode] = visitedNodes[selectedNode];
        delete visitedNodes[selectedNode];

    } while (selectedNode != stop);

    var path = [];
    selectedNode = stop;
    
    do {
        path.unshift(validatedNodes[selectedNode].path);
        selectedNode = validatedNodes[selectedNode].father;

    } while(validatedNodes[selectedNode].father != null);

    return path;
};

Routing.prototype.add = function(field) {

    for (var e of field) {
        this.graph.addNode(e.source);
        this.graph.addNode(e.target);

        this.graph.addEdge(e.source, e.target, e.length, e.gid);
        this.graph.addEdge(e.target, e.source, e.length, e.gid);

        this.geomNodes[e.source] = [e.x1, e.y1];

        this.geomRoutes[e.gid] = [e.source, e.target, e.geom, e.osm_id, e.length];
    }
    
};

Routing.prototype.remove = function(id) {
    this.graph.removeNode(id);
};

Routing.prototype.getNewGid = function() {
    this.maxGid += 1;
    return this.maxGid;
};

Routing.prototype.getNodeId = function() {
    this.maxNodeId += 1;
    return this.maxNodeId;
};

/**
 *  'road' est une route OpenLayers/OSM. Dans le graphe de routage, les
 *  routes sont séparé à chaque intersections, il faut donc trouver le segment
 *  préci sur lequel notre point se trouve, pas seulement la route.
 *  Une fois ce  segment trouvé, il faut le séparé en deux routes pour pouvoir
 *  les ajouter au graphe.
 */
Routing.prototype.splitEdge = function(road, point) {

    var c = point;
    
    // Liste des routes possible où C peux se trouver
    var edges = this.getEdgesFromOsmId(parseInt(road.get('osm_id')));

    var edge1Geom, edge2Geom, edge = undefined;

    // Chacune des routes se trouve dans un format LineString.
    // Elles sont composé de plusieurs sous-segment.
    // Le premier but est de trouvé le sous-segment où se trouve C.
    // Le deuxieme but sera de séparé ce sous-segment en deux. Leurs informations seront
    // misent dans les objets edge1Geom et edge2Geom
    for (var e of edges) {

        // Pas la peine de continuer si un sous-segment à été trouvé
        if (edge) {
            break;
        }
        
        edge1Geom = [];
        edge2Geom = [];

        // Conversion de l'objet LineString dans un format lisible
        var f = (new ol.format.WKT()).readFeature(e[2], this.app.to3857).getGeometry().getCoordinates();

        // Logiquement le premier point du premier sous-segment se trouve forcement
        // sur le premier sous-sous-segment.
        edge1Geom.push(f[0]);

        // On regarde chaque sous-segment pour voir si C se trouve sur l'un deux.
        for (var i = 0; i < (f.length - 1); i++) {
            
            var a = f[i];
            var b = f[i + 1];

            // produit croisé pour voir si les AB et AC sont colinéaires
            var cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

            // produit scalaire (pas utilisé, mais ça pourait être utile)
            var dot = (c[0] - a[0]) * (b[0] - a[0]) + (c[1] - a[1]) * (b[1] - a[1]);

            // distance entre A et C
            var dAC = Math.sqrt( (a[0] - c[0]) * (a[0] - c[0]) + (a[1] - c[1]) * (a[1] - c[1]) );

            // distance entre A et B
            var dAB = Math.sqrt( (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]) );

            // distance entre B et C
            var dBC = Math.sqrt( (b[0] - c[0]) * (b[0] - c[0]) + (b[1] - c[1]) * (b[1] - c[1]) );


            // Si les segments sont colinéaire et que C se trouve entre A et B
            // alors C se trouve bien sur le segment AB
            if ( Math.abs(cross) < 10.0 && (dAC <= dAB + 1.0 && dBC <= dAB + 1.0) ) {
                edge = e;
                
                edge1Geom.push(f[i]);
                edge1Geom.push(c);
                edge2Geom.push(c);
            }

            if (!edge) {

                edge1Geom.push(f[i + 1]);

            } else {

                edge2Geom.push(f[i + 1]);

            }
        }
    }

    var wkt1 = (new ol.format.WKT()).writeFeature(new ol.Feature(new ol.geom.LineString(edge1Geom)), this.app.to3857);

    var wkt2 = (new ol.format.WKT()).writeFeature(new ol.Feature(new ol.geom.LineString(edge2Geom)), this.app.to3857);
    
    
    var newId = this.getNodeId();

    var pos = ol.proj.transform(c, 'EPSG:3857', 'EPSG:4326');
    
    var e1 = {
        'source': newId,
        'target': edge[0],
        'geom': wkt1,
        'osm_id': edge[3],
        'length': edge[4] / 2,
        'gid': this.getNewGid(),
        'x1': pos[0],
        'y1': pos[1]
    };

    var e2 = {
        'source': newId,
        'target': edge[1],
        'geom': wkt2,
        'osm_id': edge[3],
        'length': edge[4] / 2,
        'gid': this.getNewGid(),
        'x1': pos[0],
        'y1': pos[1]
    };
    
    return [e1, e2];

};

Routing.prototype.linkNodeToEdge = function(node, edge) {

    node = ol.proj.transform(node, 'EPSG:3857', 'EPSG:4326');
    
    var feature = new ol.Feature(new ol.geom.LineString([[node[0], node[1]], [edge.x1, edge.y1]]));

    var e = {
        'source': this.getNodeId(),
        'target': edge.source,
        'geom': (new ol.format.WKT()).writeFeature(feature),
        'osm_id': -1,
        'length': 1,
        'gid': this.getNewGid(),
        'x1': node[0],
        'y1': node[1]
    };

    return e;
};

/**
 *
 */
Routing.prototype.getEdgesFromOsmId = function(osmId) {
    var edges = [];

    for (var e in this.geomRoutes) {

        if (this.geomRoutes[e][3] == osmId) {
            edges.push(this.geomRoutes[e]);
        }
    }

    
    return edges;
};

/**
 *
 */
Routing.prototype.getRouteLength = function(route) {

    var totalLength = 0;

    for (var e of route) {
        totalLength += this.geomRoutes[e][4];
    }

    return totalLength;
};

/*
 * Récupére les informations géometriques d'une route.
 * @param {Number[]} route liste d'arcs du graph decrivant la route à afficher
 * @returns {ol.Feature[]} Liste d'openlayers3 features.
 */
Routing.prototype.getGeometryFromRoute = function(route) {

    var features = [];
    var x1, y1;
    var routeGeom, edge;
    
    for (var i = 0; i < (route.length); i++) {

        edge = this.geomRoutes[route[i]];

        x1 = this.geomNodes[edge[0]][0];
        y1 = this.geomNodes[edge[0]][1];

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
};





