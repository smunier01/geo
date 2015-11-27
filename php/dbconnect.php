<?php

class DB {

    private $db;
    private $stmt1;
    private $stmt2;

    function __construct() {

        $this->db = new PDO('pgsql:dbname=gis;host=localhost;user=postgres;password=postgres');

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

    function getListServices() {
        $stmt = $this->db->prepare("Select distinct service from planet_osm_polygon where service != '' order by service ");
        $stmt->execute();
        $res = $stmt->fetchAll();

        return $res;
    }

    function getListBuildings(){
        $stmt = $this->db->prepare("Select name from planet_osm_polygon where building = 'yes' and name <> '' and name is not null");
        $stmt->execute();
        $res = $stmt->fetchAll();

        return $res;
    }

    function getServiceFromOsmId($osmId){
        $stmt = $this->db->prepare("select services.name, services.url from services join services_batiments on (services.id = services_batiments.id_service) where services_batiments.id_batiment = :osmId");
        $stmt->bindParam(':osmId', $osmId, PDO::PARAM_INT);
        $stmt->execute();
        $res = $stmt->fetchAll();

        return $res;
    }
}
