<?PHP
include('base.php');
include('FPDI/src/autoload.php');

$JClient = new artnum\JRestClient(base_url('/store'));
$GEntry = new GetEntry();

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

if (isset($_GET['forceType'])) {
  switch(strtolower(trim($_GET['forceType']))) {
    case 'livraison': case 'travail':
      $type = strtolower(trim($_GET['forceType']));
  }
}

$creator = null;
if (isset($reservation['creator']) && !empty($reservation['creator'])) {
  if (strpos($reservation['creator'], '/') !== FALSE) {
    $url = explode('/', sanitize_path($reservation['creator']), 2);
    $res = $JClient->get($url[1], $url[0]);
    if ($res['success'] && $res['length'] === 1) {
      $creator = $res['data'];
    }
  }
}


$machine = $GEntry->getMachine($reservation['target']);

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
$PDF->SetRightMargin(21);
$PDF->SetFont('century-gothic-bold');

for ($copies = 0; $copies < 3; $copies++) {
  $PDF->AddPage();
  $PDF->Image('../resources/images/' . $type . '-0.png', 0, 0, 210, 297);
  $PDF->SetXY(162, 9);
  $PDF->Cell(27, 6, $reservation['id']);
  $PDF->SetXY(46, 9);
  $PDF->Cell(100, 6, $machine['cn'] . ' - N°........');
  $PDF->SetY(17);
  if ($creator && isset($creator['name'])) {
    $PDF->SetFontSize(3);
    $PDF->printLn($creator['name'], array('align' => 'right'));
    $PDF->ResetFontSize();
  }
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
  $PDF->Cell(52, 4, isset($reservation['client_']) ? strFromArrayLimit(array($reservation['client_']), ', ', 68)  : '');

  $PDF->SetXY(52, 262);
  $PDF->Cell(52, 4, strFromArrayLimit(array($locality, '.........................................................................................................'), ', le ', 96));

  $PDF->AddPage();
  $PDF->Image('../resources/images/' . $type . '-1.png', 0, 0, 210, 297);
}

if(is_null($addrs['client'])) {
   $PDF->Output('I', ucfirst($type) . ' ' . $reservation['id'] .  '.pdf', true); 
} else {
   $PDF->Output('I', ucfirst($type) . ' ' . $reservation['id'] . ' @ ' . $addrs['client'][0] . '.pdf', true); 

}
?>
