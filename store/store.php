<?PHP
require('artnum/autoload.php');


$http_request = new artnum\HTTP\JsonRequest();
$store = new artnum\JStore\Generic($http_request, true);

$pdo_db = new PDO('sqlite:location.sqlite');
$ldap_db = new artnum\LDAPDB(
         array(
               array('uri' => 'ldap://airserve01.local.airnace.ch', 
                  'ro' => true,
                  'dn' => NULL,
                  'password' => NULL
                  )
            )
      );

$store->add_db('sql', $pdo_db);
$store->add_db('ldap', $ldap_db);

$store->run();
?>
