<?php
/**
 * Execute the python script of the classifier
 */
ini_set('max_execution_time', -1);
error_reporting(E_ALL);

try {

    chdir('../ressources/');
    $command = escapeshellcmd('python ./pgsql2geojson.py -d "PG:host=localhost dbname=gis user=postgres password=postgressuperprojetsig"');
    $output = shell_exec($command);
    echo $output;

} catch (Exception $e) {

    var_dump($e);

}
