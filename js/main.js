var GEO_SERVER_IP = "localhost:8080";

$(function() {

    var layer1 = new ol.layer.Tile({
	source: new ol.source.MapQuest({layer: 'osm'})
    });

    var wmsSource1 = new ol.source.TileWMS({
	url: 'http://' + GEO_SERVER_IP + '/geoserver/wms/cite',
	params: {'LAYERS': 'planet_osm_line', 'TILED': true},

	serverType: 'geoserver'
    });

    var wmsSource2 = new ol.source.TileWMS({
	url: 'http://' + GEO_SERVER_IP + '/geoserver/wms/cite',
	params: {'LAYERS': 'planet_osm_point', 'TILED': true},

	serverType: 'geoserver'
    });

    var wmsSource3 = new ol.source.TileWMS({
	url: 'http://' + GEO_SERVER_IP + '/geoserver/wms/cite',
	params: {'LAYERS': 'planet_osm_polygon', 'TILED': true},

	serverType: 'geoserver'
    });

    var wmsSource4 = new ol.source.TileWMS({
	url: 'http://' + GEO_SERVER_IP + '/geoserver/wms/cite',
	params: {'LAYERS': 'planet_osm_roads', 'TILED': true},

	serverType: 'geoserver'
    });
    
    var layers = [
	new ol.layer.Tile({
	    source: new ol.source.MapQuest({layer: 'osm'})
	}),
	new ol.layer.Tile({
	    source: wmsSource3,
	    opacity: 0.6
	}),
	/*
	new ol.layer.Tile({
	    source: wmsSource1
	}),
	*/
	new ol.layer.Tile({
	    source: wmsSource2
	}),
	new ol.layer.Tile({
	    source: wmsSource4
	})
    ];
    
    var map = new ol.Map({
	layers: layers,
	target: 'map',
	view: new ol.View({
	    center: ol.proj.transform([1.9348, 47.8432], 'EPSG:4326', 'EPSG:3857'),
	    zoom: 15
	})
    });

    var vectorSource = new ol.source.Vector([]);

    var vectorLayer = new ol.layer.Vector({
	source: vectorSource,
	style: new ol.style.Style({
	    stroke: new ol.style.Stroke({
		color: 'rgba(255, 0, 0, 1.0)',
		width: 2
	    }),
	    fill: new ol.style.Fill({
		color: 'rgba(165, 165, 165, 0.5)'
	    })
	})
    })

    map.addLayer(vectorLayer);

    var geojsonFormat = new ol.format.GeoJSON();
    
    map.on('click', function(evt) {

	var viewResolution = (map.C.view.getResolution());

	var url = wmsSource4.getGetFeatureInfoUrl(
	    evt.coordinate, viewResolution, 'EPSG:3857',
	    {'INFO_FORMAT': 'text/javascript'}
	);
	
	if (url) {

	    if (url) {
		$.ajax({

		    url: url,
		    dataType: 'jsonp',
		    jsonpCallback: 'parseResponse'

		}).then(function(response) {

		    vectorSource.clear();
		    vectorSource.addFeatures(geojsonFormat.readFeatures(response));
	
		});
	    }
	    
	}
	
    });

    // 'http://' + GEO_SERVER_IP + '/geoserver/cite/wfs?service=WFS&version=2.0.0&request=GetFeature&typenames=cite:planet_osm_roads&propertyName=way&CQL_FILTER=osm_id%3D%27308574435%27'

     // var url = 'http://' + GEO_SERVER_IP + ':8080/geoserver/wfs?service=WFS&version=1.2.0&request=GetFeature&typeName=cite:planet_osm_polygon&outputformat=text/javascript&format_options=callback:loadFeatures&srsName=EPSG:3857';

});

