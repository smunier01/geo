$(function() {

    var map;
    var icons = [];
    var selMarker;
    var click = 0;
    var tmpCoord;

    map = new ol.Map({
	layers: [
	    new ol.layer.Tile({source: new ol.source.OSM()}),
	    new ol.layer.Vector({      
		source: new ol.source.Vector({features:icons})
	    })],
	renderer: "canvas",
	target: 'map',
	view: new ol.View({
            zoom: 11
	})
    });

    map.getView().setCenter(transform(5, 52));

    map.on("click", function(evt){
	var coordinate = evt.coordinate;
	if(click == 0) {
            tmpCoord = coordinate;
            click++;
	} else {
            addVierkant(tmpCoord, coordinate);
            click = 0;
            getAllTiles(tmpCoord, coordinate);
	}   
	addCircle(coordinate);
    })


    $("#get").click(function() {
	
    });

    function transform(lng, lat) {
	return ol.proj.transform([lng, lat], 'EPSG:4326', 'EPSG:3857');
    }

    function transform2(lng, lat) {
	return ol.proj.transform([lng, lat], 'EPSG:3857', 'EPSG:4326');
    }

    function addCircle(c) {

	var source = map.getLayers().item(1).getSource();
	var iconFeature = new ol.Feature({
	    geometry: new ol.geom.Circle(c, 300),
	});
	iconFeature.setStyle(getCircleStyle());
	icons[icons.length] = iconFeature;
	icons[icons.length - 1][0] = "circle";
	source.addFeature(iconFeature);
	return iconFeature;
    }

    function addVierkant(c1, c2) {

	var source = map.getLayers().item(1).getSource();
	p1 = c1;
	p2 = [c1[0], c2[1]];
	p3 = c2;
	p4 = [c2[0], c1[1]];
	var coords = [p1,p2,p3,p4,p1];
	var iconFeature = new ol.Feature({
	    geometry: new ol.geom.LineString(coords),
	});
	iconFeature.setStyle(getVierkantStyle());
	icons[icons.length] = iconFeature;
	icons[icons.length - 1][0] = "vierkant";
	source.addFeature(iconFeature);
	return iconFeature;
    }

    function getCircleStyle() {
	var iconStyle = new ol.style.Style({
	    stroke: new ol.style.Stroke({
		color: 'rgba(0,0,0,0.3)',
		width: 4
	    }),
	    fill: new ol.style.Fill({
		color: 'rgba(255,255,255,0.9)'
	    })
	});
	return iconStyle;
    }

    function getVierkantStyle() {
	var iconStyle = new ol.style.Style({
	    stroke: new ol.style.Stroke({
		color: 'rgba(255,255,255,0.9)',
		width: 2
	    })
	});
	return iconStyle;
    }

    function getAllTiles(coord1, coord2) {

	console.log('getTiles');
	
	out1 = getTileURL(coord1, 10);
	out2 = getTileURL(coord2, 10);
	
	if(out1[1] > out2[1]) {
            outTmp1 = out1[1];
            out1[1] = out2[1];
            out2[1] = outTmp1;
	}
	if(out1[2] > out2[2]) {
            outTmp1 = out1[2];
            out1[2] = out2[2];
            out2[2] = outTmp1;
	}
	
	$("#output").html("zoom ------ " + out1[0] + "<br>from " + out1[1] + " to " + out2[1] + "<br>from " + out1[2] + " to " + out2[2]);
	while(out1[1] <= out2[1]) {
            while(out1[2] <= out2[2]) { 
		console.log("*** " + out1[1] + "/" + out1[2]);
		out1[2]++;
            }
            out1[1]++;
	}
    }


    function getTileURL(coord, zoom) {
        cor = transform2(coord[0], coord[1]);
        lon = cor[0];
        lat = cor[1];
        var out = [];
	var xtile = parseInt(Math.floor( (lon + 180) / 360 * (1<<zoom) ));
	var ytile = parseInt(Math.floor( (1 - Math.log(Math.tan(lat.toRad()) + 1 / Math.cos(lat.toRad())) / Math.PI) / 2 * (1<<zoom) ));
        log(">> " + zoom + "/" + xtile + "/" + ytile);
        out[0] = zoom;
        out[1] = xtile;
        out[2] = ytile;
        return out;
    }


    function log(text) {
	console.log(text);
    }

    if (typeof(Number.prototype.toRad) === "undefined") {
	Number.prototype.toRad = function() {
	    return this * Math.PI / 180;
	}
    }

});
