<?PHP
require('artnum/autoload.php');
require('../lib/url.php');

$file = new \artnum\Files();
$rand = new \artnum\Random();
$http_request = new \artnum\HTTP\JsonRequest();
$store = new \artnum\JStore\Generic($http_request, true);
$lock = new \artnum\Lock('location', '../private/');

$sigfile = getcwd() . '/../private/sig.txt';
if (!file_exists($sigfile) && $file->writable($sigfile)) {
   $rand->str(512, $sigfile);
} else if (!$file->readable($sigfile)) {
   throw new Exception('No signature file');
}

$pdo_db = new PDO('sqlite:../private/location.sqlite');
$pdo_db->exec('PRAGMA foreign_keys = YES;');
$ldap_db = new artnum\LDAPDB(
         array(
               array('uri' => 'ldap://airserve01.local.airnace.ch', 
                  'ro' => true,
                  'dn' => NULL,
                  'password' => NULL
                  )
            )
      );
/*$usersrc = new \artnum\JStore\User($pdo_db, 'User', array('username' => 'user_nick', 'key' => 'user_key'));
$store->add_auth('\artnum\JStore\Auth', $usersrc, $file->fromFile($sigfile)); */

$store->set('lockmanager', $lock);
$store->add_db('sql', $pdo_db);
$store->add_db('ldap', $ldap_db);

$store->run();
?>
