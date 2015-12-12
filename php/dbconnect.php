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
        $stmt = $this->db->prepare("Select name,url from services where name != '' order by name ");
        $stmt->execute();
        $res = $stmt->fetchAll();

        return $res;
    }

    function getListBuildings(){
        $stmt = $this->db->prepare("Select name,osm_id from planet_osm_polygon where building <> '' and building is not null and name <> '' and name is not null");
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

    function getBuildingFromOsmId($osmId){
        $stmt = $this->db->prepare("Select osm_id,name,way from planet_osm_polygon where osm_id=:osmId");
        $stmt->bindParam(':osmId', $osmId, PDO::PARAM_INT);
        $stmt->execute();
        $res = $stmt->fetchAll();

        return $res;
    }

    function getServiceFromName($name){
        $stmt = $this->db->prepare("Select * from services where name=:name");
        $stmt->bindParam(':name', $name);
        $stmt->execute();

        return $stmt->fetchAll();


    }

    function updateServiceInfos($serviceInfos){

        $stmt = $this->db->prepare("select * from services where name=:name");
        $stmt->bindParam(':name', $serviceInfos['name']); 
        $stmt->execute();
        $res = $stmt->fetchAll();

        $return = array();
        if(count($res)==0 || ($serviceInfos['name'] == $serviceInfos['oldName'] && strlen($serviceInfos['name'])>0 && $serviceInfos['name'] != "undefined")){
            $return['status'] = "success";
            $stmt = $this->db->prepare("UPDATE services set name=:name, url=:url where name=:oldName");
            if($serviceInfos['url'] == "undefined"){
                $serviceInfos['url'] = null;
            }
            $stmt->bindParam(':name', $serviceInfos['name']);
            $stmt->bindParam(':url', $serviceInfos['url']);
            $stmt->bindParam(':oldName', $serviceInfos['oldName']);
            $stmt->execute();
        }
        else{
            $return['status'] = "failure";
            $return['message'] = "Un service portant ce nom existe deja ou le nom saisi est invalide";
        }

        echo json_encode($return);
    }

    function updateInfoBatiments($infos){
        $osmId = $infos['osm_id'];

        //Modification des paramètres dans la BDD
        $requete = "UPDATE planet_osm_polygon SET ";
        $i=0;
        $params = array();
        $services = '';

        foreach ($infos as $key => $value) {
            if($key != 'services' && $key != 'osm_id'){
                if($i>0){
                    $requete = $requete . ", ";
                }
                $requete = $requete . " " . $key . " = :" . $i . " ";
                array_push($params, $value);
                $i+=2;
            }
            else if($key == 'services'){
                $services = $value;
            }
        }

        $requete = $requete . "where osm_id = " . $osmId;
        $stmt = $this->db->prepare($requete);
        foreach ($params as $key => $value) {
            $stmt->bindParam(':' . $key, $value);
        }
        $stmt->execute();

        //Modification des services
        $serviceList = array();
        if ($services != ''){
            $servicesAndUrl = explode(';', $services);
            foreach ($servicesAndUrl as $key => $value) {
                $serviceName = explode(',', $value)[0];
                array_push($serviceList, $serviceName);
            }
        }

        $servicesBatiment = array();
        $servicesBatimentUrl = $this->getServiceFromOsmId($osmId);
        foreach ($servicesBatimentUrl as $key => $value) {
            array_push($servicesBatiment, $value['name']);
        }

        $removedServices = array_diff($servicesBatiment, $serviceList);

        $addedServices = array_diff($serviceList, $servicesBatiment);

        foreach ($removedServices as $key => $value) {
            $stmt = $this->db->prepare("DELETE from services_batiments where id_batiment=:idBat and id_service=(select id from services where name=:nameService)");
            if($value == "undefined" || $value == ""){
                $value = null;
            }
            $stmt->bindParam(':idBat', $osmId);
            $stmt->bindParam(':nameService', $value);
            $stmt->execute();
        }

        foreach ($addedServices as $key => $value) {

            if(count($this->getServiceFromName($value)) <= 0){
                $stmt=$this->db->prepare("INSERT into services (name) values(:name)");
                $stmt->bindParam(':name', $value);
                $stmt->execute();
            }

            $stmt = $this->db->prepare("INSERT INTO services_batiments (id_batiment,id_service) values(:idBat, (select id from services where name=:nameService))");
            $stmt->bindParam(':idBat', $osmId);
            $stmt->bindParam(':nameService', $value);
            $stmt->execute();
        }
    }

}
