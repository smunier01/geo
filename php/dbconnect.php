<?php

class DB {

    private $db;
    private $stmt1;
    private $stmt2;

    function __construct() {

        $this->db = new PDO('pgsql:dbname=gis;host=localhost;user=postgres;password=');

        $this->stmt1 = $this->db->prepare("SELECT osm_id as id, source, target, 1.0 as cost FROM ways;");

        $this->stmt2 = $this->db->prepare("SELECT * FROM pgr_dijkstra('SELECT cast(osm_id as integer) as id, source, target, cast(1.0 as double precision) as cost FROM ways', :from, :to, false, false);
");

    }

    function test() {

        $this->stmt1->execute();
        $result = $this->stmt1->fetchAll();

        return json_encode($result);
    }

    function dijkstra($from, $to) {

        $this->stmt2->execute(array(':from' => $from, ':to' => $to));

        $result = $this->stmt2->fetchAll();

        return json_encode($result);
    }
}
