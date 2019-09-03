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
$PDF->Image('../resources/images/Livr_p1.png', 0, 0, -96, -96);
$PDF->SetXY(162, 9);
$PDF->Cell(27, 4, $reservation['id']);
$PDF->SetXY(62, 17);
$PDF->Cell(88, 4, $machine['cn']);
$PDF->SetXY(162, 17);
$PDF->Cell(27, 4, $reservation['target']);

$PDF->SetXY(50, 254);
$PDF->Cell(52, 4, $addrs['client'] ? $addrs['client'][0] : '');

$locality = getLocality($JClient, $reservation['locality']);
$PDF->SetXY(50, 265);
$PDF->Cell(52, 4, $locality ? $locality[1] : '');

$PDF->AddPage();
$PDF->Image('../resources/images/Livr_p2.png', 0, 0, -96, -96);

if(is_null($addrs['client'])) {
   $PDF->Output($reservation['id'] .  '.pdf', 'I'); 
} else {
   $PDF->Output($reservation['id'] . ' @ ' . $addrs['client'][0] . '.pdf', 'I'); 

}
?>
