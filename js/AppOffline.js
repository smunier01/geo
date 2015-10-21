/* global ol, Routing */
/* jshint sub: true */

/**
 * Application Offline
 *
 * @class
 */
var AppOffline = function (imgMode) {

    var that = this;

    //
    // Public Variables
    //

    /**
     *  Reference à l'objet map d'openlayer
     *  @type {ol.Map}
     */
    this.map = undefined;

    /**
     *  Reference à l'objet Gui
     *  @type {Gui}
     */
    this.gui = undefined;

    /**
     *  Objet contenant la liste des layers openlayers utilisé
     *  @type {Object.<string, ol.layer.Vector>}
     */
    this.layers = [];

    /**
     *  Array contenant la liste des styles généré par la methode initStyles
     *  @type {Object.<string, ol.style.Style>}
     */
    this.styles = [];

    /**
     *  Class contenant le graphe des routes et l'implémentation de dijkstra
     *  @ŧype {Routing}
     */
    this.routing = undefined;

    /**
     *  @type {boolean}
     */
    this.adminMode = true;

    /**
     *  @type {Object.<string, Array.<ol.Features>>}
     */
    this.cache = [];

    /**
     *  Transforme ol.layer.Vector en ol.layer.Image (surement plus rapide)
     *  @type {boolean}
     */
    this.imgMode = imgMode;

    this.toLonLat = {'dataProjection': 'EPSG:3857', 'featureProjection': 'EPSG:4326'};
    this.to3857 = {'dataProjection': 'EPSG:4326', 'featureProjection': 'EPSG:3857'},
    //
    // Style
    //

    /**
     *  @type {string}
     *  @default
     */
    this.COLOR1 = "#E86FB0";

    /**
     *  @type {string}
     *  @default
     */
    this.COLOR2 = "#A8FFC7";

    /**
     *  @type {string}
     *  @default
     */
    this.COLOR3 = "#A8FFC7";

    /**
     *  @type {string}
     *  @default
     */
    this.GREY1 = "#CECECE";

    /**
     *
     */
    var styleFunctionGeojson = function (feature, resolution) {

        // Le type [way, node, relation]. On s'en fiche un peu, presque tout ont pour type 'way'
        var fType = feature.get('id').split('/')[0];

        // Le type de géométrie [Polygon, MultiPolygon, LineString, Point]
        var fGeomType = feature.getGeometry().getType();

        if (fGeomType == "Polygon" && feature.get('building') !== undefined) {

            return [that.styles['building']];

        } else if (fGeomType == "Polygon" && feature.get('amenity') == "parking") {

            return [that.styles['parking']];

	} else if (feature.get('highway') == 'footway' || feature.get('highway') == 'path') {

	    return [that.styles['road_footway']];

	} else if (feature.get('highway') == 'cycleway') {

	    return [that.styles['road_cycleway']];
	    
	} else if (feature.get('railway') == 'tram') {

	    return that.styles['road_tram'];

	} else if (feature.get('highway') == 'primary') {

	    return that.styles['road_secondary'];
	    
        } else if (feature.get('highway') == 'secondary') {

	    return that.styles['road_secondary'];

	} else if (feature.get('highway') == 'primary_link') {

	    return that.styles['road_secondary'];

	} else if (parseInt(feature.get('lanes')) >= 2) {
	    
	    return that.styles['road_secondary'];
	    
	} else if (feature.get('highway') == 'trunk' || feature.get('highway') == 'trunk_link') {

	    return that.styles['road_secondary'];
	    
	} else if (feature.get('highway') == 'tertiary') {

	    return that.styles['road_secondary'];

	} else if (feature.get('power') !== undefined || feature.get('barrier') !== undefined) {

	    return [that.styles['hidden']];
	    
        } else if (fGeomType == "LineString") {

            return [that.styles['road1']];

        } else {
	    
            return [that.styles['hidden']];

	}
    }


    this.initStyles();

    //
    // Map Def
    //

    this.map = new ol.Map({
	layers: [],
	target: 'map',
	view: new ol.View({
	    center: ol.proj.transform([1.9348, 47.8432], 'EPSG:4326', 'EPSG:3857'),
	    zoom: 15
	})
    });

    //
    // Sources & Layers
    //

    if (!this.imgMode) {
	
	this.layers['mapVectors'] = {
	    'layer': new ol.layer.Vector({
		title: 'Vector Layer',
		source: new ol.source.Vector({
		    url: 'ressources/map.geojson',
		    format: new ol.format.GeoJSON()
		}),
		style: styleFunctionGeojson
	    }),
	    'order': 10
	};
	
    } else {
	
	this.layers['mapVectors'] = {
	    'layer': new ol.layer.Image({
		title: 'Vector Layer',
		source: new ol.source.ImageVector({
		    source: new ol.source.Vector({
			url: 'ressources/map.geojson',
			format: new ol.format.GeoJSON()
		    }),
		    style: styleFunctionGeojson
		})
	    }),
	    'order': 10
	};
    }
    
    var key = this.layers['mapVectors'].layer.getSource().on('change', function() {
	if (that.layers['mapVectors'].layer.getSource().getState() == 'ready') {
	    that.layers['mapVectors'].layer.getSource().unByKey(key);
	    that.gui.updateBuildingList(that.getBuildingList());
	}
    });

    this.layers['nodes'] = {
	'layer': new ol.layer.Vector({
	    source: new ol.source.Vector([]),
	    title: 'Nodes Layer',
	    visible: false
	}),
	'order': 75
    };

    this.layers['route'] = {
	'layer': new ol.layer.Vector({
	    source:  new ol.source.Vector([]),
	    style: that.styles['nodeAndRouteSelected'],
	    title: 'Route Layer',
	}),
	'order': 97
    };

    this.layers['hover'] = {
	'layer': new ol.layer.Vector({
	    source: new ol.source.Vector([]),
	    style: that.styles['nodeSelected'],
	    title: 'Hover Layer'
	}),
	'order': 100
    };

    this.layers['selected'] = {
	'layer': new ol.layer.Vector({
	    source: new ol.source.Vector([]),
	    style: that.styles['nodeSelected'],
	    title: 'Selected Layer'
	}),
	'order': 98
    };

    this.layers['osm'] = {
	'layer': new ol.layer.Tile({
	    //source: new ol.source.MapQuest({layer: 'osm'})
	    source: new ol.source.OSM({
		url: "http://localhost/tiles/{z}_{x}_{y}.png"
	    }),
	    visible: false,
	    title: 'OSM Layer'
	}),
	'order': 0
    };

    this.addAllLayers();

    //
    // Routing
    //

    this.routing = new Routing(this);

    this.routing.init("ressources/routing.json").then(function() {

	that.displayPoints(that.layers['nodes'].layer.getSource(), that.routing.geomNodes);

    });

    //
    // Events
    //

    /**
     * Si il y a une erreur lors du chargement d'une des tiles (elle existe surement pas)
     */
    this.layers['osm'].layer.getSource().on('tileloaderror', function(event) {

	var self = this;

	// Coordonnées de la tile en question
	var z = event.tile.getTileCoord()[0];
	var x = event.tile.getTileCoord()[1];
	var y = event.tile.getTileCoord()[2];

	// On dit à php d'aller telecharger cette tile
	$.get("http://localhost/php-test/test2.php?z=" + z + "&x=" + x + "&y=" + y, function(data, status){
	    self.changed();
	});

    });

    /**
     *  Mise à jour de la map quand on press "enter".
     *  (c'est utile (pour le moment) pour voir si le 'tileloaderror' à bien fonctionné)
     */
    $(document).keypress(function(e) {
	if (e.which == 13) {

	    var s = that.layers['osm'].layer.getSource();

	    that.map.updateSize();
	    s.changed();
	    s.setTileUrlFunction(s.getTileUrlFunction());
	}
    });

    var nodeSelected = [];

    /*
      Quand on click deux fois --> dijkstra
    */
    this.map.on('click', function(evt) {

	var feature = that.layers['nodes'].layer.getSource().getClosestFeatureToCoordinate(evt.coordinate);
	var sourceSelected = that.layers['selected'].layer.getSource();
	var sourceRoute = that.layers['route'].layer.getSource();

	// openlayers plante si t'ajoute deux fois le même feature
	for (var f of sourceSelected.getFeatures()) {
	    if (f.get('id') == feature.get('id')) {
		return false;
	    }
	}

	if (nodeSelected.length >= 2) {
	    nodeSelected = [];
	    sourceSelected.clear();
	    sourceRoute.clear();
	}

	nodeSelected.push(feature.get('id'));
	sourceSelected.addFeature(feature);

	if (nodeSelected.length >= 2) {

	    // liste des noeuds du chemin
	    var route = that.routing.dijkstra(nodeSelected[0], nodeSelected[1]);

	    // conversion des noeuds en des données geometrique ol3 pour affichage
	    var f = that.routing.getGeometryFromRoute(route);

	    // affichage de la route
	    sourceRoute.addFeatures(f);

	}

        return true;
        
    });

    /*
      Change la couleur des noeuds au passage de la souris
      &
      Affichage des infos sur les differents objets
    */
    this.map.on('pointermove', function(evt) {
	
	var t = true, nbFeatures = 0;
	
	var sourceHover = that.layers['hover'].layer.getSource();

	sourceHover.clear();
	
	that.gui.clearHoverBox();
	
	that.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
	    
	    nbFeatures += 1;

	    that.gui.addToHoverBox(feature.getProperties(), layer.get('title')); 
	    
	    if (t && layer.get('title') == "Nodes Layer") {

		t = false;

		sourceHover.addFeature(feature);

	    }
	    
	});

	if (nbFeatures > 0) {
	    
	    that.gui.setHoverBoxPosition(evt.pixel);

	}
	
    });

    /*
       Click Droit
     */
    this.map.getViewport().addEventListener('contextmenu', function (e) {

	e.preventDefault();
	
	//var feature1 = that.getClosestParking(that.map.getEventCoordinate(e))
	var feature2 = that.getClosestRoad(that.map.getEventCoordinate(e))

	var new_node = feature2.getGeometry().getClosestPoint(that.map.getEventCoordinate(e));

	that.layers['route'].layer.getSource().addFeature(new ol.Feature(new ol.geom.Point(new_node)));

	var edge = that.routing.osmFeatureToEdge(feature2, new_node);

	
	
	console.log(edge);
	
	var edges = that.routing.splitEdge(new_node, edge);
	
	var edge1 = (new ol.format.WKT()).readFeature(edges[0][2], that.to3857);
	var edge2 = (new ol.format.WKT()).readFeature(edges[1][2], that.to3857);

	that.layers['route'].layer.getSource().addFeature(edge1);
	that.layers['route'].layer.getSource().addFeature(edge2);
	
    });
};

/**
 * 
 */
AppOffline.prototype.getClosestRoad = function(coord) {

    var min = Infinity;
    var minR = undefined;

    for (var p of this.getRoadList()) {
	
	var v = p.getGeometry().getClosestPoint(coord);

	var dist = (new ol.geom.LineString([v, coord])).getLength();

	if (dist <= min && this.routing.isRouting[p.get('id').split('/')[1]] === true) {
	    min = dist;
	    minR = p;
	}
    }
    
    return minR;
    
}

/**
 *  
 */
AppOffline.prototype.getClosestParking = function(coord) {

    var min = Infinity;
    var minP = undefined;

    for (var p of this.getParkingList()) {
    
	var v = p.getGeometry().getClosestPoint(coord);

	var dist = (new ol.geom.LineString([v, coord])).getLength();

	if (dist <= min) {
	    min = dist;
	    minP = p;
	}
    }
    
    return minP;
};

AppOffline.prototype.getRoadList = function() {

    var roads = [];

    var that = this;

    var start = new Date().getTime();
    
    if (this.cache['roads'] === undefined) {
	
	this.cache['roads'] = [];

	var l = this.layers['mapVectors'].layer;
	var source = this.imgMode ? l.getSource().getSource() : l.getSource();

	source.forEachFeature(function(f) {

	    if (f.getGeometry().getType() == "LineString") {

		that.cache['roads'].push(f);
		
	    }
	});
	
    }
    
    roads = this.cache['roads'];

    var d = new Date().getTime() - start;

    console.log(d);

    return roads;
    
};

AppOffline.prototype.getParkingList = function() {

    var parkings = [];

    var that = this;

    var start = new Date().getTime();

    var l = this.layers['mapVectors'].layer;
    var source = this.imgMode ? l.getSource().getSource() : l.getSource();
    
    if (this.cache['parkings'] === undefined) {
	
	this.cache['parkings'] = [];

	source.forEachFeature(function(f) {

	    if (f.get('amenity') == "parking") {

		that.cache['parkings'].push(f);
		
	    }
	});
	
    }
    
    parkings = this.cache['parkings'];

    var d = new Date().getTime() - start;

    console.log(d);
    
    return parkings;    
};

/**
 *  Ajoute à la map le contenu de this.layers en respectant l'ordre défini par la propriété 'order'
 *  @todo: refaire cette fonction, elle est moche, mais je savais pas cmt faire mieux :(
 */
AppOffline.prototype.addAllLayers = function() {

    this.map.getLayers().clear();

    var tmp = [];

    for (var key in this.layers) {

	if (this.layers.hasOwnProperty(key)) {
	    var l = this.layers[key];

	    tmp.push(l);
	}

    }

    sortByKey(tmp, 'order');

    for (var l of tmp) {
	this.map.addLayer(l.layer);
    }
};


/**
 *  Change la visibilitéé d'un layer
 *  @param {string} name clé du layer défini au moment de ça définition
 *  @param {boolean} value visible ou non
 */
AppOffline.prototype.setVisible = function(name, value) {
    this.layers[name].layer.setVisible(value);
};

/**
 *  Vide la source et y ajoute la série de points contenu dans data
 *  @param {ol.source.Vector} source source où afficher les points
 *  @param {Array.<Array.<Number>>} data array contenant la liste des points
 */
AppOffline.prototype.displayPoints = function(source, data) {

    source.clear();

    for (var f in data) {

	source.addFeature(new ol.Feature({
	    'geometry': new ol.geom.Point(
		ol.proj.transform([data[f][0], data[f][1]], 'EPSG:4326', 'EPSG:3857')),
	    'id': parseInt(f)
	}))
    }
};

/**
 *  @returns {??} liste des batiments
 */
AppOffline.prototype.getBuildingList = function() {

    var buildings = [];

    var source = this.imgMode ? this.layers['mapVectors'].layer.getSource().getSource() : this.layers['mapVectors'].layer.getSource();
    
    source.forEachFeature(function(f) {


	if (f.getGeometry().getType() == "Polygon" && f.get('building') != undefined) {
	    buildings.push(f.getProperties());
	}

	
    });

    return buildings;
    
}

AppOffline.prototype.initStyles = function() {

    var that = this;

    this.styles['building'] = new ol.style.Style({
        fill: new ol.style.Fill({
            color: "white"
        }),
        stroke: new ol.style.Stroke({
            color: that.COLOR1,
            width: 1
        }),
	opacity: 0.8
    });

    this.styles['parking'] = new ol.style.Style({
        fill: new ol.style.Fill({
            color: that.GREY1
        }),
        stroke: new ol.style.Stroke({
            color: that.COLOR2,
            width: 1
        }),
	opacity: 0.8
    });

    this.styles['road_footway'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: "#D19B9B",
            width: 1,
	    lineDash: [4, 4]
        })
    });

    this.styles['road_primary'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: "#D9D9D9",
            width: 5
        })
    });

    this.styles['road_secondary'] = [
	new ol.style.Style({
            stroke: new ol.style.Stroke({
		color: "#737373",
		width: 4
            }),
	    zIndex: 8
	}),
	new ol.style.Style({
            stroke: new ol.style.Stroke({
		color: "#FAD9B6",
		width: 3
            }),
	    zIndex: 9
	})
    ];

    this.styles['road_tertiary'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: "#FFFFFF",
            width: 2
        })
    });

    this.styles['road_cycleway'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: "#93CF98",
            width: 2,
	    lineDash: [4, 4]
        })
    });

    this.styles['road_oneway'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: "#BA3C57",
            width: 3
        })
    });

    this.styles['road1'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: "white",
            width: 3
        })
    });

    this.styles['road_tram'] = [
	new ol.style.Style({
            stroke: new ol.style.Stroke({
		color: "#737373",
		width: 4
            }),
	    zIndex: 10
	}),
	new ol.style.Style({
            stroke: new ol.style.Stroke({
		color: "#FFFBBF",
		width: 3
            }),
	    zIndex: 10
	})
    ];
	

    this.styles['hidden'] = new ol.style.Style({
        display: "none"
    });

    this.styles['nodeSelected'] = new ol.style.Style({
	image: new ol.style.Circle({
	    fill: new ol.style.Fill({
		color: that.GREY1
	    }),
	    stroke: new ol.style.Stroke({
		color: that.COLOR1,
		width: 2
	    }),
	    radius: 5
	})
    });

    this.styles['nodeAndRouteSelected'] = new ol.style.Style({
	image: new ol.style.Circle({
	    fill: new ol.style.Fill({
		color: that.GREY1
	    }),
	    stroke: new ol.style.Stroke({
		color: that.COLOR1,
		width: 2
	    }),
	    radius: 5
	}),
	stroke: new ol.style.Stroke({
	    color: that.COLOR1,
	    width: 2
	})
    });

};

/**
*  @param {Gui}
*/
AppOffline.prototype.setGui = function(gui) {
    this.gui = gui;
}

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
};
