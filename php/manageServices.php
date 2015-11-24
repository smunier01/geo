<?php
	include_once('dbconnect.php');

	if(isset($_POST['action']) && !empty($_POST['action'])){
		$db = new DB();
		switch ($_POST['action']) {
			case 'getListServices':
				$services = $db->getListServices();
				$arrayRes = [];
				foreach ($services as $key => $value) {
					array_push($arrayRes, $value['service']);
				}
				echo json_encode($arrayRes);
				break;
			
			default:
				# code...
				break;
		}
	}

?>