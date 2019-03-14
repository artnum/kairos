<?PHP
require('artnum/autoload.php');
require('../lib/url.php');

$ini_conf = parse_ini_file('../conf/location.ini', true);

if (!isset($ini_conf['general'])) {
   $ini_conf['general'];
}
if (!isset($ini_conf['general']['disable-locking'])) {
   $ini_conf['general']['disable-locking'] = false;
}

$file = new \artnum\Files();
$http_request = new \artnum\HTTP\JsonRequest();
$store = new \artnum\JStore\Generic($http_request, true);

$sigfile = getcwd() . '/../private/sig.txt';
if (!file_exists($sigfile) && $file->writable($sigfile)) {
   $rand = new \artnum\Random();
   $rand->str(512, $sigfile);
} else if (!$file->readable($sigfile)) {
   throw new Exception('No signature file');
}

$pdo_db = new PDO($ini_conf['storage']['pdo-string'], $ini_conf['storage']['user'], $ini_conf['storage']['password'], array(PDO::ATTR_PERSISTENT => true));
$pdo_db->exec('SET sql_mode=\'ANSI\';');
$ldap_db = new artnum\LDAPDB(
         array(
               array('uri' => 'ldap://airserve01.local.airnace.ch', 
                  'ro' => true,
                  'dn' => NULL,
                  'password' => NULL
                  )
            )
      );

if (!$ini_conf['general']['disable-locking']) {
   $lock_pdo = new PDO($ini_conf['lock']['pdo-string'], $ini_conf['lock']['user'], $ini_conf['lock']['password'], array(PDO::ATTR_PERSISTENT => true));
   $lock = new \artnum\Lock(array('dbtype'=>'pdo', 'db'=>$lock_pdo));
   $store->set('lockmanager', $lock);
} else {
   $store->set('lockmanager', 'void');
}
$store->add_db('sql', $pdo_db);
$store->add_db('ldap', $ldap_db);

$store->run();
?>
