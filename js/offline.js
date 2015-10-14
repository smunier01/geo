var displayPoints = function(s, data) {
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
}

var nodeSelectedStyle =  new ol.style.Circle({
    fill: new ol.style.Fill({
	color: "#CECECE"
    }),
    stroke: new ol.style.Stroke({
	color: "#E86FB0",
	width: 2
    }),
    radius: 5
});

$(function(){

    var map;
    
    //
    // ROUTING
    //

    var nodeSelected = [];
    
    var sourceNodes = new ol.source.Vector([])

    var layerNodes = new ol.layer.Vector({
	source: sourceNodes,
	title: 'Node Layer'
    });

    var sourceRoute = new ol.source.Vector([])

    var layerRoute = new ol.layer.Vector({
	source: sourceRoute,
	style: new ol.style.Style({
	    image: nodeSelectedStyle,
	    fill: new ol.style.Fill({
		color: "#CECECE"
	    }),
	    stroke: new ol.style.Stroke({
		color: "#E86FB0",
		width: 2
	    })
	})
    });

    var sourceHover = new ol.source.Vector([])

    var layerHover = new ol.layer.Vector({
	source: sourceHover,
	style: new ol.style.Style({
	    image: nodeSelectedStyle
	})
    });

    var sourceSelected = new ol.source.Vector([])

    var layerSelected = new ol.layer.Vector({
	source: sourceSelected,
	style: new ol.style.Style({
	    image: nodeSelectedStyle
	})
    });

    var r = new Routing();

    r.init("ressources/routing.json").promise().then(function() {

	displayPoints(sourceNodes, r.data);

    });

    //
    // STYLE
    //
   
    var building = new ol.style.Style({
        fill: new ol.style.Fill({
            color: [250,250,250,1]
        }),
        stroke: new ol.style.Stroke({
            color: "#FF85BE",
            width: 1
        }),
	opacity: 0.8
    });

    var parking = new ol.style.Style({
        fill: new ol.style.Fill({
            color: "#cecece"
        }),
        stroke: new ol.style.Stroke({
            color: "#A8FFC7",
            width: 1
        }),
	opacity: 0.8
    });

    var road1 = new ol.style.Style({
        fill: new ol.style.Fill({
            color: "#000000"
        }),
        stroke: new ol.style.Stroke({
            color: "#ffffff",
            width: 3
        }),
	opacity: 0.5,
	text: new ol.style.Text({
	    text : "Nom de la Rue",                    
            textAlign: "center",
            textBaseline: "middle",
	    rotation: 2
	})
    });

    var road2 = new ol.style.Style({
        fill: new ol.style.Fill({
            color: [250,250,250,1]
        }),
        stroke: new ol.style.Stroke({
            color: [220,220,220,1],
            width: 1
        })
    });

    var hidden = new ol.style.Style({
        display: "none"
    });

    var styleCache = {};
    var a = 1;
    var geometryTypes = [];
    var types = [];

    function styleFunction(feature, resolution) {

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
	    return [building];
	} else if (fGeomType == "Polygon" && feature.get('amenity') == "parking") {
	    return [parking];
	} else if (fGeomType == "LineString") {
	    return [road1];
	} else {
	    return [hidden];
	}
    }

    var source = new ol.source.Vector({
        url: 'ressources/map.geojson',
        format: new ol.format.GeoJSON()
    });
    
    var vectorLayer = new ol.layer.Vector({
	title: 'Main Layer',
	source: source,
	style: styleFunction
    });

    map = new ol.Map({
	layers: [vectorLayer, layerNodes, layerRoute, layerHover, layerSelected],
	target: 'map',
	view: new ol.View({
	    center: ol.proj.transform([1.9348, 47.8432], 'EPSG:4326', 'EPSG:3857'),
	    zoom: 15
	})
    });

    map.on('click', function(evt) {

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
	    var f = r.getRouteFromNodes(route);

	    // affichage de la route
	    sourceRoute.addFeatures(f);
	    
	}
        
    });

    map.on('pointermove', function(evt) {

	var t = true;

	sourceHover.clear();
	
	map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {

	    if (t && layer.get('title') == "Node Layer") {

		t = false;
	
		sourceHover.addFeature(feature);

	    }
	});  
    });

});







