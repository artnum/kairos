<?PHP
require('artnum/autoload.php');
require('../../lib/url.php');
require('../../lib/dbs.php');
require('../../lib/ini.php');
require('../../lib/cacheid.php');

$ini_conf = load_ini_configuration();

$pdo = init_pdo($ini_conf);
if (is_null($pdo)) {
  throw new Exception('Storage database not reachable');
  exit(0);
}

$STATUS = [];

$TOCLOSE = [];
$date = '2020-11-01';
foreach ($pdo->query('SELECT "evenement".*, COALESCE(NULLIF("evenement_target", \'\'), "reservation_target") 
AS "evenement_resolvedTarget", "status_severity" AS "evenement_severity"
  FROM "evenement" LEFT JOIN "status" ON "status_id" = idFromURL("evenement_type")
  LEFT JOIN "reservation" ON "reservation_id" = "evenement_reservation"
  WHERE "evenement_id" NOT IN (SELECT "evenement_previous" FROM "evenement" WHERE "evenement_previous" IS NOT NULL)
  AND "reservation"."reservation_deleted" IS NULL;') as $row) {
    $severity = $row[11];
    if (is_null($row[1])) { continue; }
    if (intval($severity) >= 2000) { continue; }
    
    $arrival = [];
    $r = $pdo->query("SELECT * FROM arrival where arrival_target = $row[1]");
    if ($r) {
      $arrival = $r->fetchAll()[0];
    }

    $TOCLOSE[] = [
      'evenement' => $row,
      'arrival' => $arrival
    ];
  }

  do {
    $rerun = false;
    foreach ($TOCLOSE as $c) {
      $noAdd = false;
      foreach ($TOCLOSE as $c2) {
        if ($c2['evenement'][0] == $c['evenement'][8]) {
          $noAdd = true;
          echo '    -> NO ADD' .PHP_EOL;
          $rerun = true;
        break;
        }
      }

      if (!$noAdd) {
        $out[] = $c;
      }
    }
    $TOCLOSE = $out;
  } while ($rerun);

  $pdo->beginTransaction();
  foreach ($out as $close) {
    $prev = $close['evenement'][0];
    $res = $close['evenement'][1];
    $status = 'Status/23';
    $comment = 'auto-résolution';
    $tech = 'User/4';
    $process = 'kairos:autoResolve';
    $date = '2020-11-10T23:59:59.000Z';
    
    $query = "INSERT INTO evenement (evenement_reservation, evenement_previous, evenement_technician, evenement_type, evenement_comment, evenement_process, evenement_date) " . 
      "VALUES ($res, $prev, '$tech', '$status', '$comment', '$process', '$date')";
    $pdo->exec($query);
  }
  $pdo->commit();
?>