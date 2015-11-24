<?php
	include_once('dbconnect.php');

	if(isset($_GET['action']) && !empty($_GET['action'])){
		$db = new DB();
		switch ($_GET['action']) {
			case 'getListServices':
				$services = $db->getListServices();
				$arrayRes = [];
				foreach ($services as $key => $value) {
					array_push($arrayRes, $value['service']);
				}
				echo json_encode($arrayRes);
				break;

			case 'getListBuildings':
				$buildings = $db->getListBuildings();
				$arrayRes = [];
				// foreach ($services as $key => $value) {
				// 	array_push($arrayRes, $value['name']);
				// }
				print_r(json_encode($buildings));
				break;

			default:
				# code...
				break;
		}
	}

?>