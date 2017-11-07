<?PHP
include('artnum/Lock.php');

$l = new artnum\Lock('location');

$l->http_locking();
?>
