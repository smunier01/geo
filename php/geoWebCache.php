<?php

$x = $_GET['x'];
$y = (((intval($_GET['y'])) * -1) -1);
$z = $_GET['z'];

$TYPE = 'png8';
$GEO_SERVER = 'http://localhost:8080/geoserver';
$LAYER = 'cite:planet_osm_line';

$url = $GEO_SERVER . '/gwc/service/tms/1.0.0/'. $LAYER .'@EPSG%3A900913@'. $TYPE .'/' . $z . '/' . $x . '/' . (pow(2, $z) - $y - 1) . '.' . $TYPE;

$img = '../ressources/tiles/streetNames-XYZ-format/' . $z . '_' . $x . '_' . $y . '.png';
file_put_contents($img, file_get_contents($url));

// gif : 61.3 6.6 0.465
// png : 147  13  1.8
// jpeg: 52   4   0.900
// png8: 61   6.8 0.149