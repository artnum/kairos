<?PHP
require('artnum/autoload.php');
require('../lib/url.php');
require('../lib/dbs.php');
require('../lib/ini.php');
require('../lib/cacheid.php');

$ini_conf = load_ini_configuration();

$http_request = new \artnum\HTTP\JsonRequest();
$store = new \artnum\JStore\Generic(
  $http_request,
  true,
  [
    'ridCache' => new CacheID()
  ]
);

$pdo = init_pdo($ini_conf);
if (is_null($pdo)) {
  throw new Exception('Storage database not reachable');
  exit(0);
}
$store->add_db('sql', $pdo);

if (empty($ini_conf['addressbook']) || empty($ini_conf['addressbook']['servers'])) {
  throw new Exception('Addressbook not configured');
  exit(0);
}

$abServers = explode(',', $ini_conf['addressbook']['servers']);
if (count($abServers) <= 0) {
  throw new Exception('Addressbook not configured');
  exit(0);
}
$ldapServers = array();
foreach($abServers as $server) {
  $s = sprintf('ab-%s', trim($server));
  if (!empty($ini_conf[$s]) && !empty($ini_conf[$s]['uri'])) {
    $ldapServers[] = array(
      'uri' => $ini_conf[$s]['uri'],
      'ro' => !empty($ini_conf[$s]['read-only']) ? boolval($ini_conf[$s]['read-only']) : true,
      'dn' => !empty($ini_conf[$s]['username']) ? $ini_conf[$s]['username'] : NULL,
      'password' => !empty($ini_conf[$s]['password']) ? $ini_conf[$s]['password'] : NULL
    );
  }
}

if (count($ldapServers) <= 0) {
  throw new Exception('Addressbook not configured');
  exit(0);
}
$ldap_db = new artnum\LDAPDB($ldapServers);
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

if (!empty($ini_conf['menshen']) && $ini_conf['menshen']['activate']) {
  $menshen = new artnum\Auth\Menshen(new artnum\Auth\Menshen\PDOStore($pdo, 'menshen'));
  if (!$menshen->check()) {
    artnum\HTTP\Response::code(403);
    exit(0);
  }
}

$store->run();
?>
