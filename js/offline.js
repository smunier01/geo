$(function(){

    var map;

    //
    // ROUTING
    //
    var polyCoords = [];

    var sourceRouting = new ol.source.Vector([])

    var layerRouting = new ol.layer.Vector({
	source: sourceRouting
    });

    var r = new Routing();

    r.init("ressources/routing.json").promise().then(function() {
	r.dijkstra(1, 6);

	/*
	  Le resultat est cencé donner ça pour 1->6. Mais je suis pas certain à quoi ca correspond.
	  Surement les identifiant des noeuds.

	  1,598,602,603,616,617,674,571,565,380,381,178,160,161,850,851,84,85,86,94,93,121,120,100,99,98,68,5,6
	*/
	
	var i = 0;
	sourceRouting.clear();
	
	for (var f in r.data) {
	    sourceRouting.addFeature(new ol.Feature({
		'geometry': new ol.geom.Point(
		    ol.proj.transform([r.data[f][0], r.data[f][1]], 'EPSG:4326', 'EPSG:3857')),
		'i': i
	    }))

	    i++;
	}

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
	title: 'added Layer',
	source: source,
	style: styleFunction
    });

    map = new ol.Map({
	layers: [vectorLayer, layerRouting],
	target: 'map',
	view: new ol.View({
	    center: ol.proj.transform([1.9348, 47.8432], 'EPSG:4326', 'EPSG:3857'),
	    zoom: 15
	})
    });

});
