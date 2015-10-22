/**
 * Application Online
 *
 * @class
 */
var AppOnline = function() {

    var that = this;
    
    /**
     * @type {string} 
     */
    this.GEO_HOST = "localhost:8080";

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


    // fond osm
    this.layers['osm'] = {
	'layer': new ol.layer.Tile({
	    //source: new ol.source.MapQuest({layer: 'osm'})
	    source: new ol.source.OSM({
		url: "http://tile.openstreetmap.org/{z}/{x}/{y}.png"
	    }),
	    visible: false
	}),
	'order': 2
    };

    // batiments
    this.layers['buildings'] = {
	'layer': new ol.layer.Tile({
	    source: new ol.source.TileWMS({
		url: 'http://' + this.GEO_HOST + '/geoserver/wms/cite',
		params: {
			'LAYERS': 'planet_osm_polygon', 
			'TILED': true,
			//cql_filter : "amenity like 'parking'"
		},

		serverType: 'geoserver'
	    }),
	    opacity: 0.6
	}),
	'order': 3
    };

    console.log(this.layers['buildings']);

    // routes
    this.layers['lines'] = {
	'layer': new ol.layer.Tile({
	    source: new ol.source.TileWMS({
		url: 'http://' + this.GEO_HOST + '/geoserver/wms/cite',
		params: {
			'LAYERS': 'planet_osm_line', 
			'TILED': true
		},

		serverType: 'geoserver'
	    })
	}),
	'order': 4
    };

    // chemin resultat dikjstra
    this.layers['vector2'] =  {
	'layer' : new ol.layer.Vector({
	    source: new ol.source.Vector({
	    })
	}),
	'order': 1
    };


    //
    // Map
    //

    this.map = new ol.Map({
	layers: [],
	target: 'map',
	view: new ol.View({
		    center: ol.proj.transform([1.9348, 47.8432], 'EPSG:4326', 'EPSG:3857'),
		    zoom: 15
		})
    });

    this.addAllLayers();

    var result;
    var click = 0;
    var geojsonFormat = new ol.format.GeoJSON();
    
    this.map.on('click', function(event) {

	var params = {
	    LAYERS: 'pgrouting:pgrouting',
	    FORMAT: 'image/png'
	};
	
	var transform = ol.proj.getTransform('EPSG:3857', 'EPSG:4326');

	var pointsSrc = that.layers['vector2'].layer.getSource();
	
	if (click == 0 || click == 2) {

	    click = 1;

	    pointsSrc.clear();

	    that.map.removeLayer(result);

	    pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(event.coordinate)));

	} else {
	    
	    click = 2;
	    
	    pointsSrc.addFeature(new ol.Feature(new ol.geom.Point(event.coordinate)));

	    var startCoord = transform(pointsSrc.getFeatures()[0].getGeometry().getCoordinates());
	    var destCoord = transform(pointsSrc.getFeatures()[1].getGeometry().getCoordinates());

	    var viewparams = [
		'x1:' + startCoord[0], 'y1:' + startCoord[1],
		'x2:' + destCoord[0], 'y2:' + destCoord[1]
	    ];
	    
	    params.viewparams = viewparams.join(';');

	    result = new ol.layer.Image({
		source: new ol.source.ImageWMS({
		    url: 'http://' + that.GEO_HOST + '/geoserver/pgrouting/wms',
		    params: params
		})
	    });
	    
	    that.map.addLayer(result);
	    
	}
	
    });
};

/**
 * ??
 */
AppOnline.prototype.getFeaturesFromClick = function(event) {
    
    var viewResolution = (this.map.getView().getResolution());

    var url = this.layers['buildings'].layer.getSource().getGetFeatureInfoUrl(
	event.coordinate, viewResolution, 'EPSG:3857',

	{'INFO_FORMAT': 'text/javascript'}
    );
    
    if (url) {

	if (url) {
	    $.ajax({

		url: url,
		dataType: 'jsonp',
		jsonpCallback: 'parseResponse'

	    }).then(function(response) {
		/*
		vectorSource.clear();
		vectorSource.addFeatures(geojsonFormat.readFeatures(response));
		console.log(geojsonFormat.readFeatures(response));
		*/
	    });
	}
	
    }

    
}

/**
 *  Ajoute à la map le contenu de this.layers en respectant l'ordre défini par la propriété 'order'
 *  @todo: refaire cette fonction, elle est moche, mais je savais pas cmt faire mieux :(
 */
AppOnline.prototype.addAllLayers = function() {

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
AppOnline.prototype.setVisible = function(name, value) {
    this.layers[name].layer.setVisible(value);
};


function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

/**
*  @param {Gui}
*/
AppOnline.prototype.setGui = function(gui) {
    this.gui = gui;
}


