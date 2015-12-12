<?php
/**
 * Execute the python script of the classifier
 */
ini_set('max_execution_time', -1);
error_reporting(E_ALL);

try {

    echo 'hello';
    $command = escapeshellcmd('../ressources/pgsql2geojson.py -d "PG:host=localhost dbname=gis3 user=postgres"');
    $output = shell_exec($command);
    echo $output;

} catch (Exception $e) {

    var_dump($e);

}
