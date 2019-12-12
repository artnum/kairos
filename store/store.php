<?PHP
require('artnum/autoload.php');
require('../lib/url.php');
require('../lib/dbs.php');
require('../lib/ini.php');

$ini_conf = load_ini_configuration();

$file = new \artnum\Files();
$http_request = new \artnum\HTTP\JsonRequest();
$store = new \artnum\JStore\Generic($http_request, true);

$sigfile = getcwd() . '/../private/sig.txt';
if (!file_exists($sigfile) && $file->writable($sigfile)) {
   $rand = new \artnum\Random();
   $rand->str(512, $sigfile);
} else if (!$file->readable($sigfile)) {
  throw new Exception('No signature file');
  exit(0);
}

$pdo = init_pdo($ini_conf);
if (is_null($pdo)) {
  throw new Exception('Storage database not reachable');
  exit(0);
}
$store->add_db('sql', $pdo);

$ldap_db = new artnum\LDAPDB(
         array(
               array('uri' => 'ldapi:///',
                  'ro' => true,
                  'dn' => NULL,
                  'password' => NULL
                  )
            )
      );
$store->add_db('ldap', $ldap_db);

if (!$ini_conf['general']['disable-locking']) {
  $pdo = init_pdo($ini_conf, 'lock');
  if (is_null($pdo)) {
    $store->set('lockmanager', 'void');
  } else {
    $store->set('lockmanager', new \artnum\Lock(array('dbtype'=>'pdo', 'db'=>$lock_pdo)));
  }
} else {
  $store->set('lockmanager', 'void');
}

$store->run();

$ldap_db->close();
?>
