<?PHP
include('base.php');
include('FPDI/src/autoload.php');
include('../lib/format.php');

$JClient = new artnum\JRestClient(base_url('/store'));

$res = $JClient->get($_GET['id'], 'DeepReservation');
if($res['type'] != 'results') {
   exit(0);
}

if(!isset($res['data'][0]) && !isset($res['data']['id'])) {
   exit(0);
}
$reservation = FReservation(isset($res['data'][0]) ? $res['data'][0] : $res['data']);

$type = 'livraison';
if (isset($reservation['complements']) && is_array($reservation['complements'])) {
  foreach($reservation['complements'] as $c) {
    if (isset($c['type']) && is_array($c['type'])) {
      if ($c['type']['type'] == '1') {
        $type = 'travail';
      }
    }
  }
}  

$creator = null;
if (isset($reservation['creator']) && !empty($reservation['creator'])) {
  if (strpos($reservation['creator'], '/') !== FALSE) {
    $url = explode('/', $reservation['creator'], 2);
    $res = $JClient->get($url[1], $url[0]);
    if ($res['success'] && $res['length'] === 1) {
      $creator = $res['data'];
    }
  }
}

$res = $JClient->search(array('search.description' => $reservation['target'], 'search.airaltref' => $reservation['target']), 'Machine'); 
$machine = null;
if($res['type'] == 'results') {
   $machine = $res['data'][0];
}


$addrs = array('client' => null, 'responsable' => null, 'place' => null);
foreach($addrs as $k => $v) {
   $res = $JClient->search(array('search.comment' => '_' . $k, 'search.reservation' => $reservation['id']), 'ReservationContact');
   if($res['type'] == 'results') {
      if(!empty($res['data'][0]['target'])) {
         $c = explode('/', $res['data'][0]['target']);
         $res = $JClient->get($c[2], $c[1]);
         if($res['type'] == 'results') {
            $addrs[$k] = format_address(array('type' => 'db', 'data' => $res['data'][0]));
         }
      } else {
         if(! empty($res['data'][0]['freeform'])) { 
            $addrs[$k] = format_address(array('type' => 'freeform', 'data' => $res['data'][0]['freeform']));
         }
      }
   }
}

/* PDF Generation */
$PDF = new BlankLocationPDF();
$PDF->SetFont('century-gothic-bold');

$PDF->AddPage();
$PDF->Image('../resources/images/' . $type . '-1.png', 0, 0, 210, 297);

$PDF->AddPage();
$PDF->Image('../resources/images/' . $type . '-0.png', 0, 0, 210, 297);
$PDF->SetXY(162, 9);
$PDF->Cell(27, 6, $reservation['id']);
$PDF->SetXY(46, 9);
$PDF->Cell(100, 6, $reservation['target'] . ' - ' . $machine['cn']);
$PDF->SetXY(52, 47);
$PDF->Cell(130, 6, $reservation['reference'] ? strFromArrayLimit(array($reservation['reference']), ', ', 68) : '');
$PDF->SetXY(52, 55);
$a = array();
$locality = '';
if ($reservation['address']) { $a[] = $reservation['address']; }
if ($reservation['locality']) {
  $l = getLocality($JClient, $reservation['locality']);
  if ($l) {
    if ($l[0] === 'warehouse') {
      $a[] = 'Dépôt ' . $l[1];
      $locality = 'Dépôt ' . $l[1];
    } else {
      $a[] = $l[1];
      $locality = $l[1];
    }
  }
}

$PDF->Cell(130, 6, count($a) > 0 ? strFromArrayLimit($a, ', ', 68) : '');                                                                                                                                    

$PDF->SetXY(52, 250);
$PDF->Cell(52, 4, $reservation['client_'] ? strFromArrayLimit(array($reservation['client_']), ', ', 68)  : '');

$PDF->SetXY(52, 262);
$PDF->Cell(52, 4, strFromArrayLimit(array($locality, '.........................................................................................................'), ', le ', 96));

if(is_null($addrs['client'])) {
   $PDF->Output($reservation['id'] .  '.pdf', 'I'); 
} else {
   $PDF->Output($reservation['id'] . ' @ ' . $addrs['client'][0] . '.pdf', 'I'); 

}
?>
