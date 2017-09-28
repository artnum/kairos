<?PHP
require('artnum/autoload.php');


$http_request = new artnum\HTTP\JsonRequest();
$store = new artnum\JStore\PDO('sqlite:location.sqlite', $http_request, true);

$store->run();
?>
