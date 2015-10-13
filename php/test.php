<?php

require_once("dbconnect.php");

$from = (isset($_GET["from"])) ? $_GET["from"] : 1;
$to = (isset($_GET["to"])) ? $_GET["to"] : 2;

$myDb = new DB();

var_dump($myDb->dijkstra($from, $to));

