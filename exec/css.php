<?PHP
require('artnum/autoload.php');
setlocale(LC_ALL, 'fr_CH.UTF-8');

$ini_conf = parse_ini_file('../conf/location.ini', true);
if (!isset($ini_conf['storage']) || !isset($ini_conf['storage']['pdo-string'])) { exit(0); }


$pdo = new PDO($ini_conf['storage']['pdo-string'], $ini_conf['storage']['user'], $ini_conf['storage']['password'], array(PDO::ATTR_PERSISTENT => true));
if (!$pdo) { exit(0); }

$pdo->exec('SET sql_mode=\'ANSI\';');
$stmt = $pdo->prepare('SELECT * FROM "warehouse"');
header('Content-Type: text/css');


echo '.control .location i, .reservation .identity i { padding: 2px 4px; }' . PHP_EOL;
if ($stmt) {
  $stmt->execute();
  while(($data = $stmt->fetch(PDO::FETCH_ASSOC)) !== FALSE) {
    $name = strtolower($data['warehouse_name']);
    $name = str_replace(array('-', '_', ',', '.'), '', $name);
    $name2 = iconv('UTF-8', 'ASCII//TRANSLIT', $name);
    $color = strtolower($data['warehouse_color']);
    $colors = explode(';', $color);

    for ($i = 0; $i < count($colors); $i++) {
      $colors[$i] = strtolower(trim($colors[$i]));
    }
    
    if (count($colors) === 2) {
      echo ".$name .location, .compact .$name.control { " .
           "color: $colors[0] !important; background-color: $colors[1] !important; }" . PHP_EOL;
      if ($name !== $name2) {
        echo ".$name2 .location, .compact .$name2.control { " .
           "color: $colors[0] !important; background-color: $colors[1] !important; }" . PHP_EOL;
      }
    } else {
      echo ".$name .location, .compact .$name.control { " .
           "color: $colors[0] !important; }" . PHP_EOL;
      if ($name !== $name2) {
        echo ".$name2 .location, .compact .$name2.control { " .
           "color: $colors[0] !important; }" . PHP_EOL;
      }
    }
  }
}

?>
