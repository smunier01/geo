var displayPoints = function(s, data) {
    var i = 0;

    s.clear();
    
    for (var f in data) {
	s.addFeature(new ol.Feature({
	    'geometry': new ol.geom.Point(
		ol.proj.transform([data[f][0], data[f][1]], 'EPSG:4326', 'EPSG:3857')),
	    'i': i,
	    'f': parseInt(f)
	}))

	i++;
    }
}

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
            fill: new ol.style.Fill({
		color: "#cecece"
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
            fill: new ol.style.Fill({
		color: "#cecece"
            }),
            stroke: new ol.style.Stroke({
		color: "#E86FB0",
		width: 2
            })
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
	width: 10,
	opacity: 0.5
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
	layers: [vectorLayer, layerRoute, layerNodes, layerHover],
	target: 'map',
	view: new ol.View({
	    center: ol.proj.transform([1.9348, 47.8432], 'EPSG:4326', 'EPSG:3857'),
	    zoom: 15
	})
    });

    map.on('click', function(evt) {

	var t = true;
                                                  
	map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {    

	    if (t && layer.C.title == "Node Layer") {

		t = false;
		
		console.log(feature);

		if (nodeSelected.length == 2) {
		    nodeSelected.length = 0;
		}

		nodeSelected.push(feature.C.f);

		if (nodeSelected.length == 2) {
		    var route = r.dijkstra(nodeSelected[0], nodeSelected[1]);

		    var f = r.getRouteFromNodes(route);

		    sourceRoute.clear();
		    sourceRoute.addFeatures(f);
		}

	    }
	});                                                                       
    });

});
