var GEO_SERVER_IP = "82.229.108.217:8080";

$(function() {

    var startPoint = new ol.Feature();
    var destPoint = new ol.Feature();

    // The vector layer used to display the "start" and "destination" features.
    var vectorLayer2 = new ol.layer.Vector({
	source: new ol.source.Vector({
	    features: [startPoint, destPoint]
	})
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

    var wmsSource5 = new ol.source.TileWMS({
	url: 'http://' + GEO_SERVER_IP + '/geoserver/wms/cite',
	params: {'LAYERS': 'planet_osm_roads', 'TILED': true},

	serverType: 'geoserver'
    });

    var layers = [
	/*
	new ol.layer.Tile({
	    source: new ol.source.MapQuest({layer: 'osm'})
	}),
	*/
	
	new ol.layer.Tile({
	    source: wmsSource3,
	    opacity: 0.6
	}),
	
	new ol.layer.Tile({
	    source: wmsSource1
	}),
	/*
	new ol.layer.Tile({
	    source: wmsSource2
	})*/
	/*
	new ol.layer.Tile({
	    source: wmsSource4
	})*/
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

    var result;
    var click = 0;
    map.addLayer(vectorLayer);
    map.addLayer(vectorLayer2);
    
    var geojsonFormat = new ol.format.GeoJSON();
    
    map.on('click', function(event) {
	/*
	var viewResolution = (map.C.view.getResolution());

	var url = wmsSource1.getGetFeatureInfoUrl(
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

		    vectorSource.clear();
		    vectorSource.addFeatures(geojsonFormat.readFeatures(response));
		    console.log(geojsonFormat.readFeatures(response));
	
		});
	    }
	    
	}
	*/
	//**********************************
	//**********************************

	var params = {
	    LAYERS: 'pgrouting:pgrouting',
	    FORMAT: 'image/png'
	};
	
	var transform = ol.proj.getTransform('EPSG:3857', 'EPSG:4326');
	
	if (click == 0 || click == 2) {
	    click = 1;
	    startPoint.setGeometry(null);
	    destPoint.setGeometry(null);
	    // Remove the result layer.
	    map.removeLayer(result);
	    // First click.
	    startPoint.setGeometry(new ol.geom.Point(event.coordinate));
	} else {
	    click = 2;
	    // Second click.
	    destPoint.setGeometry(new ol.geom.Point(event.coordinate));
	    // Transform the coordinates from the map projection (EPSG:3857)
	    // to the server projection (EPSG:4326).
	    var startCoord = transform(startPoint.getGeometry().getCoordinates());
	    var destCoord = transform(destPoint.getGeometry().getCoordinates());
	    var viewparams = [
		'x1:' + startCoord[0], 'y1:' + startCoord[1],
		'x2:' + destCoord[0], 'y2:' + destCoord[1]
	    ];
	    params.viewparams = viewparams.join(';');

	    result = new ol.layer.Image({
		source: new ol.source.ImageWMS({
		    url: 'http://' + GEO_SERVER_IP + '/geoserver/pgrouting/wms',
		    params: params
		})
	    });
	    
	    map.addLayer(result);
	}
	
    });

    // 'http://' + GEO_SERVER_IP + '/geoserver/cite/wfs?service=WFS&version=2.0.0&request=GetFeature&typenames=cite:planet_osm_roads&propertyName=way&CQL_FILTER=osm_id%3D%27308574435%27'

    // var url = 'http://' + GEO_SERVER_IP + ':8080/geoserver/wfs?service=WFS&version=1.2.0&request=GetFeature&typeName=cite:planet_osm_polygon&outputformat=text/javascript&format_options=callback:loadFeatures&srsName=EPSG:3857';

    /*

/*
alter table planet_osm_line add column source integer;
alter table planet_osm_line add column target integer;
*/
/*
select pgr_createTopology('planet_osm_line', 0.0001, 'way', 'osm_id');
*/
/*
select pgr_analyzegraph('planet_osm_line', 0.0001, 'way', 'osm_id');
*/

//SELECT * FROM pgr_astar('SELECT cast(osm_id as integer) as id, source, target, cast(1.0 as double precision) as cost, x1, x2, y1, y2 FROM ways', 1, 12, false, false);

/*
SELECT osm_id as id, source, target, 1.0 as cost FROM ways;
*/
    
});

