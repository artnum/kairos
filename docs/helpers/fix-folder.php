<?PHP
$db = 'location.sqlite';
if (isset($argv[1])) {
   if (is_file($argv[1]) && is_readable($argv[1])) {
      $db = $argv[1];
   }
}

$config = '../../conf/location.ini';
if (isset($argv[2])) {
   if (is_file($argv[2]) && is_readable($argv[2])) {
      $config = $argv[2];
   }
}

$conf = parse_ini_file($config, true);
if ($conf === FALSE || !isset($conf['storage']) || !isset($conf['storage']['pdo-string'])) {
   exit(1);
}
$user = !empty($conf['storage']['user']) ? $conf['storage']['user'] : '';
$pw = !empty($conf['storage']['password']) ? $conf['storage']['password'] : '';

try {
   $src = new SQLite3($db);
   $dest = new PDO($conf['storage']['pdo-string'], $user, $pw);
} catch (Exception $e) {
   exit(1);
}

$stmt = $src->prepare('SELECT reservation_id,reservation_folder FROM reservation WHERE reservation_folder IS NOT NULL');
if (!$stmt) { exit(1); }
$res = $stmt->execute();
if (!$res) { exit(1); }

while(($row = $res->fetchArray()) != FALSE) {
   $stmt2 = $dest->prepare('SELECT reservation_id, reservation_folder FROM reservation WHERE reservation_id = :id');
   $stmt2->bindParam(':id', $row[0], \PDO::PARAM_INT);
   if ($stmt2->execute()) {
      $data = $stmt2->fetch();
      if ($data && !empty($data[1])) {
         if (strcmp($data[1], str_replace('\\', '', $row[1])) == 0) {
            $update = $dest->prepare('UPDATE reservation SET reservation_folder = :folder WHERE reservation_id = :id');
            $update->bindParam(':folder', $row[1]);
            $update->bindParam(':id', $row[0]);
            if ($update->execute()) {
               echo $data[0] . '::' . $data[1] . PHP_EOL;
            }
         }
      }
   }
}
?>
