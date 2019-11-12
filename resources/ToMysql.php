<?PHP
include("../store/string.php");

function _searchableString ($str) {
  $str = str_replace(['-', '_', '.', ' ', ','], '', $str);
  return addslashes(strtolower(remove_accents($str)));
}
echo "START TRANSACTION;\n";
$fp = fopen(dirname(__FILE__) . '/post-codes/post-codes.csv' , 'r');
if ($fp) {
  while(($line = fgetcsv($fp))) {
    if ($line[0] === 'KTKZ') { continue; }
    $uid = trim($line[10]);

    echo sprintf("INSERT INTO localite (" .
      "localite_uid,".
      "localite_state,".
      "localite_np,".
      "localite_npext,".
      "localite_part,".
      "localite_name,".
      "localite_postname,".
      "localite_township,".
      "localite_tsid,".
      "localite_trname,".
      "localite_trtownship ) VALUES (".
      "'%s', '%s', %d, %d, %d, '%s', '%s', '%s', %d, '%s', '%s');\n",
            $uid, strtolower($line[0]),
            $line[7], $line[8],
            strtolower($line[1]) === 'Q' ? 1 : 0,
            addslashes($line[2]), addslashes($line[9]), 
            addslashes($line[5]), $line[4],
            _searchableString($line[2]),_searchableString($line[9]));

  }
}
echo "COMMIT;\n";
?>
