<?PHP

$defaultConf = [
  'general' => [
    'disable-locking' => 1
  ],
  'storage' => [
    'pdo-string' => 'mysql:dbname=kairos;charset=utf8mb4;host=localhost',
    'user' => '',
    'password' => ''],
  'printing' => [
    'print-command' => 'cat __FILE__ > /dev/null'
  ],
  'pictures' => [
    'storage' => '/var/lib/kairos/'
  ],
  'files' => [
    'storage' => '/var/lib/kairos/'
  ],
  'trees' => [
    'contacts' => '',
    'users' => '',
    'machines' => ''
  ]
];

class KConf {
  protected $IniValue;
  function __construct($ini) {
    $this->IniValue = $ini;
  }

  function get($path) {
    if (empty($path)) { return null; }
    $frags = explode('.', $path);
    $value = $this->IniValue;
    for ($attr = array_shift($frags); $attr; $attr = array_shift($frags)) {
      if (!isset($value[$attr]) || empty($value[$attr])) { return NULL; }
      $value = $value[$attr];
    }
    return $value;
  }
}

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
