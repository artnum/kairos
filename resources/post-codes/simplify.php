<?PHP
$fp1 = fopen($argv[1], 'r');
$fp2 = fopen($argv[2], 'w');

$doubles = [];
while (($line = fgetcsv($fp1))) {
  if ($line[0] === 'KTKZ') {
    fputcsv($fp2, $line);
    continue;
  }
 
  $line [] = md5($line[2] . '-' . $line[5]);
  if ($line[3] === '+') {
    if (!in_array($line[0] . $line[2], $doubles)) {
      fputcsv($fp2, $line);
      $doubles[] = $line[0] . $line[2];
    }
  } else {
    fputcsv($fp2, $line);
  }
  
}

?>
