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
     *  @type {Object.<string, ol.layer.Vector>}
     */ 
    this.layers = [];

    /**
     *  @type {ol.Map}
     */
    this.map = undefined;

    /**
     *  @type {Object.<string, ol.style.Style}
     */
    this.styles = []
    
    //
    // Style
    //

    /**
     *  @type {string}
     */
    const COLOR1 = "#E86FB0";

    /**
     *  @type {string}
     */
    const COLOR2 = "#A8FFC7";

    /**
     *  @type {string}
     */
    const COLOR3 = "#A8FFC7";

    /**
     * @type {string}
     */
    const GREY1 = "#CECECE";

    this.styles['building'] = new ol.style.Style({
        fill: new ol.style.Fill({
            color: "white"
        }),
        stroke: new ol.style.Stroke({
            color: COLOR1,
            width: 1
        }),
	opacity: 0.8
    });

    this.styles['parking'] = new ol.style.Style({
        fill: new ol.style.Fill({
            color: GREY1
        }),
        stroke: new ol.style.Stroke({
            color: COLOR2,
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
		color: GREY1
	    }),
	    stroke: new ol.style.Stroke({
		color: COLOR1,
		width: 2
	    }),
	    radius: 5
	})
    });

    this.styles['nodeAndRouteSelected'] = new ol.style.Style({
	image: new ol.style.Circle({
	    fill: new ol.style.Fill({
		color: GREY1
	    }),
	    stroke: new ol.style.Stroke({
		color: COLOR1,
		width: 2
	    }),
	    radius: 5
	}),
	stroke: new ol.style.Stroke({
	    color: COLOR1,
	    width: 2
	})
    });

    
    function styleFunctionGeojson(feature, resolution) {
	
	var fType = feature.get('id').split('/')[0];
	var fGeomType = feature.getGeometry().getType();

	if (!(fGeomType in geometryTypes)) {
	    geometryTypes[fGeomType] = 1;
	    console.log(geometryTypes);
	} else {
	    geometryTypes[fGeomType]++;
	}

	if (!(fType in types)) {
	    types[fType] = 1;
	} else {
	    types[fType]++;
	}
	
	
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
    
    //
    // ROUTING
    //

    var nodeSelected = [];
    
    var sourceNodes = new ol.source.Vector([]);
    var sourceRoute = new ol.source.Vector([]);
    var sourceHover = new ol.source.Vector([]);
    var sourceSelected = new ol.source.Vector([]);
    var tSource = new ol.source.OSM({
	url: "http://localhost/tiles/{z}_{x}_{y}.png"
    });
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
	    visible: true
	}),
	'order': 0
    };

    tSource.on('tileloaderror', function(event) {
	console.log(event.tile.getTileCoord());

	var z = event.tile.getTileCoord()[0];
	var x = event.tile.getTileCoord()[1];
	var y = event.tile.getTileCoord()[2];

	$.get("http://localhost/php-test/test2.php?z=" + z + "&x=" + x + "&y=" + y, function(data, status){
	    tSource.changed();
	});
	
    });

    $(document).keypress(function(e) {
	if(e.which == 13) {
	    map.updateSize();
	    tSource.changed();
	    tSource.setTileUrlFunction(tSource.getTileUrlFunction());
	}
    });

    var r = new Routing();

    r.init("ressources/routing2.json").promise().then(function() {

	that.displayPoints(sourceNodes, r.geomNodes);

    });

    var styleCache = {};
    var a = 1;
    var geometryTypes = [];
    var types = [];

    this.map = new ol.Map({
	layers: [],
	target: 'map',
	view: new ol.View({
	    center: ol.proj.transform([1.9348, 47.8432], 'EPSG:4326', 'EPSG:3857'),
	    zoom: 15
	})
    });

    this.addLayers();

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
	    var route = r.dijkstra(nodeSelected[0], nodeSelected[1]);

	    // conversion des noeuds en des données geometrique ol3 pour affichage
	    var f = r.getGeometryFromRoute(route);
	    
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
 *
 *
 *  @todo: refaire cette fonction, elle est moche, mais je savais pas cmt faire mieux :(
 */
AppOffline.prototype.addLayers = function() {

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
 *  @param {string} clé du layer défini au moment de ça définition
 *  @param {boolean} visible ou non
 */
AppOffline.prototype.setVisible = function(name, bool) {
    this.layers[name].layer.setVisible(bool);
};

/**
 *  Clean la source 's' et y ajoute la série de points contenu dans data
 *  @param {ol.source.Vector}
 *  @param {Array.<Array.<Number>>}
 */
AppOffline.prototype.displayPoints = function(s, data) {
    var i = 0;

    s.clear();
    
    for (var f in data) {

	s.addFeature(new ol.Feature({
	    'geometry': new ol.geom.Point(
		ol.proj.transform([data[f][0], data[f][1]], 'EPSG:4326', 'EPSG:3857')),
	    'i': i,
	    'id': parseInt(f)
	}))

	i++;
    }
};

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}


