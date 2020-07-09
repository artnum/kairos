<?PHP
$b36 = 'abcdefghijklmnopqrstuvwxyz0123456789';

function create_subdir ($dir) {
  global $b36;
  for ($i = 0; $i < strlen($b36); $i++) {
    for ($j = 0; $j < strlen($b36); $j++) {
      echo sprintf("%s/%s%s", $dir, $b36[$i], $b36[$j]);
      mkdir(sprintf("%s/%s%s", $dir, $b36[$i], $b36[$j]));
    }
  }
}


if (is_dir($argv[1]) && is_writable($argv[1])) {
  $dir = $argv[1];
  for ($i = 0; $i < strlen($b36); $i++) {
    for ($j = 0; $j < strlen($b36); $j++) {
      mkdir(sprintf("%s/%s%s", $dir, $b36[$i], $b36[$j]));
      create_subdir(sprintf("%s/%s%s", $dir, $b36[$i], $b36[$j]));
    }
  }
}

?>
  
