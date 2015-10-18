/**
 * Application Offline
 *
 * @class
 */
var AppOffline = function() {
    
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
     *  Objet contenant la liste des layers openlayers utilisé
     *  @type {Object.<string, ol.layer.Vector>}
     */ 
    this.layers = [];

    /**
     *  Array contenant la liste des styles généré par la methode initStyles
     *  @type {Object.<string, ol.style.Style>}
     */
    this.styles = []

    /**
     *  Class contenant le graphe des routes et l'implémentation de dijkstra
     *  @ŧype {Routing}
     */
    this.routing = undefined;
    
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
    var styleFunctionGeojson = function(feature, resolution) {

	// Le type [way, node, relation]. On s'en fiche un peu, presque tout ont pour type 'way'
	var fType = feature.get('id').split('/')[0];

	// Le type de géométrie [Polygon, MultiPolygon, LineString, Point]
	var fGeomType = feature.getGeometry().getType();

	
	if (fGeomType == "Polygon" && feature.get('building') != undefined) {

	    return [that.styles['building']];

	} else if (fGeomType == "Polygon" && feature.get('amenity') == "parking") {

	    return [that.styles['parking']];

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

    // Pour l'affichage des noeuds de chaque routes
    var sourceNodes = new ol.source.Vector([]);

    // Pour l'affichage du résultat d'un chemin (dijkstra etc..)
    var sourceRoute = new ol.source.Vector([]);

    // Pour le changement de couleur lors du passage de la souris sur un object
    var sourceHover = new ol.source.Vector([]);

    // Pour le changement de couleur de la liste des objects selectionné
    var sourceSelected = new ol.source.Vector([]);

    // Pour l'affichage des tiles OSM (enregistré localement)
    var tSource = new ol.source.OSM({
	url: "http://localhost/tiles/{z}_{x}_{y}.png"
    });

    // Pour l'affichage de la map (routes, batiments etc..)
    var sourceVectors = new ol.source.Vector({
        url: 'ressources/map.geojson',
        format: new ol.format.GeoJSON()
    });
    
    this.layers['mapVectors'] = {
	'layer': new ol.layer.Vector({
	    title: 'Main Layer',
	    source: sourceVectors,
	    style: styleFunctionGeojson
	}),
	'order': 10
    };
    
    this.layers['nodes'] = {
	'layer': new ol.layer.Vector({
	    source: sourceNodes,
	    title: 'Node Layer'
	}),
	'order': 75
    };

    this.layers['route'] = {
	'layer': new ol.layer.Vector({
	    source: sourceRoute,
	    style: that.styles['nodeAndRouteSelected']
	}),
	'order': 97
    };

    this.layers['hover'] = {
	'layer': new ol.layer.Vector({
	    source: sourceHover,
	    style: that.styles['nodeSelected']
	}),
	'order': 100
    };

    this.layers['selected'] = {
	'layer': new ol.layer.Vector({
	    source: sourceSelected,
	    style: that.styles['nodeSelected']
	}),
	'order': 98
    };

    this.layers['osm'] = {
	'layer': new ol.layer.Tile({
	    //source: new ol.source.MapQuest({layer: 'osm'})
	    source: tSource,
	    visible: false
	}),
	'order': 0
    };

    this.addAllLayers();
    
    //
    // Routing
    //

    this.routing = new Routing();

    this.routing.init("ressources/routing2.json").promise().then(function() {

	that.displayPoints(sourceNodes, that.routing.geomNodes);

    });

    //
    // Events
    //

    /**
     * Si il y a une erreur lors du chargement d'une des tiles (elle existe surement pas)
     */
    tSource.on('tileloaderror', function(event) {

	// Coordonnées de la tile en question
	var z = event.tile.getTileCoord()[0];
	var x = event.tile.getTileCoord()[1];
	var y = event.tile.getTileCoord()[2];

	// On dit à php d'aller telecharger cette tile 
	$.get("http://localhost/php-test/test2.php?z=" + z + "&x=" + x + "&y=" + y, function(data, status){
	    tSource.changed();
	});
	
    });
    
    /**
     *  Mise à jour de la map quand on press "enter".
     *  (c'est utile (pour le moment) pour voir si le 'tileloaderror' à bien fonctionné)
     */
    $(document).keypress(function(e) {
	if (e.which == 13) {
	    map.updateSize();
	    tSource.changed();
	    tSource.setTileUrlFunction(tSource.getTileUrlFunction());
	}
    });

    var nodeSelected = [];

    /*
      Quand on click deux fois --> dijkstra
    */
    this.map.on('click', function(evt) {

	var feature = sourceNodes.getClosestFeatureToCoordinate(evt.coordinate);

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
        
    });

    /*
      Change la couleur des noeuds au passage de la souris
    */
    this.map.on('pointermove', function(evt) {

	var t = true;

	sourceHover.clear();
	
	that.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
   
	    if (t && layer.get('title') == "Node Layer") {

		t = false;
		
		sourceHover.addFeature(feature);

	    }
	});  
    });
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

    this.styles['road1'] = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: "white",
            width: 3
        })
    });

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

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}


