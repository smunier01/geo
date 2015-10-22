<?php

$x = $_GET['x'];
$y = (intval($_GET['y']) * -1)-1;
$z = $_GET['z'];

$url = 'http://tile.openstreetmap.org/'. $z .'/' . $x .'/' . $y . '.png';
$img = '../ressources/tiles/OSM/' . $z . '_' . $x . '_' . $y . '.png';
file_put_contents($img, file_get_contents($url));
 