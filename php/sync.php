<?php

$type = $_GET['file'];

ob_start();

if ($type == "polygons") {
    echo file_get_contents("../ressources/polygons.geojson");
}

if ($type == "lines") {
    echo file_get_contents("../ressources/lines.geojson");
}

$length = ob_get_length();
header('Content-Length: '.$length."\r\n");
header('Accept-Ranges: bytes'."\r\n");
ob_end_flush(); 