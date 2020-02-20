<?PHP

$defaultConf = array(
  'general' => array(
    'disable-locking' => 1
  ),
  'storage' => array(
    'pdo-string' => 'mysql:dbname=kairos;charset=utf8mb4;host=localhost',
    'user' => '',
    'password' => ''),
  'printing' => array(
    'print-command' => 'cat __FILE__ > /dev/null'
  ),
  'pictures' => array(
    'storage' => '/var/lib/kairos/'
  ),
  'files' => array(
    'storage' => '/var/lib/kairos/'
  )
);

function load_ini_configuration() {
  global $defaultConf;
  if (($ini_file = getenv('KAIROS_CONFIGURATION_FILE')) === FALSE ||
      (!is_file($ini_file) || !is_readable($ini_file))) {
    $path = dirname(__FILE__);
    foreach (array($path . '/../conf/kairos.ini', $path . '/../conf/location.ini') as $f) {
      if (is_file($f) && is_readable($f)) {
        $ini_file = $f;
        break;
      }
    }
  }
  if (empty($ini_file)) {
    return $defaultConf;
  }
  $conf = parse_ini_file($ini_file, true);
  if ($conf === FALSE) {
    return $defaultConf;
  } else {
    return array_merge($defaultConf, $conf);
  }
}

?>
