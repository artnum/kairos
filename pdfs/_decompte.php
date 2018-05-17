<?PHP
include('base.php');

$JClient = new artnum\JRestClient('http://localhost/location/store');
$Machine = new artnum\JRestClient('https://aircluster.local.airnace.ch/store', NULL, array('verifypeer' => false));

$res = $JClient->get($_GET['id'], 'DeepReservation');
if($res['type'] != 'results') {
   exit(0);
}

if(!isset($res['data'][0]) && !isset($res['data']['id'])) {
   exit(0);
}
$reservation = isset($res['data'][0]) ? $res['data'][0] : $res['data'];
if(!empty($reservation['deliveryBegin'])) {
   if($reservation['deliveryBegin'] != $reservation['begin']) {
      $reservation['deliveryBegin'] = new DateTime($reservation['deliveryBegin']);
   } else {
      $reservation['deliveryBegin'] = null;
   }
} else {
   $reservation['deliveryBegin'] = null;
}

if(!empty($reservation['deliveryEnd'])) {
   if($reservation['deliveryEnd'] != $reservation['end']) {
      $reservation['deliveryEnd'] = new DateTime($reservation['deliveryEnd']);
   } else {
      $reservation['deliveryEnd'] = null;
   }
} else {
   $reservation['deliveryEnd'] = null;
}

$reservation['begin'] = new DateTime($reservation['begin']);
$reservation['end'] = new DateTime($reservation['end']);
$reservation['created'] = new DateTime($reservation['created']);

$res = $Machine->search(array('search.description' => $reservation['target'], 'search.airaltref' => $reservation['target']), 'Machine'); 
$machine = null;
if($res['type'] == 'results') {
   $machine = $res['data'][0];
}


$addrs = array('client' => null, 'responsable' => null, 'facturation' => null);
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
            $addrs[$k] = format_address(array('type' => 'freeform', 'data' => $res['data'][0]));
         }
      }
   }
}

/* PDF Generation */
$PDF = new LocationPDF();
$PDF->addVTab(19);
$PDF->addVTab(50);
$PDF->addVTab(85);
$PDF->addVTab(240);
$PDF->addVTab(244);
$PDF->addTab('right', 'right');
$PDF->addTab('middle');
$PDF->addTab(62);
$PDF->addTab(123);

$PDF->AddPage();
$PDF->vtab(1);

$PDF->SetFont('century-gothic');
$PDF->setFontSize(2);
$PDF->tab(1);
$PDF->printLn('créée le ' . $reservation['created']->format('d.m.Y') . ' à '.
         $reservation['created']->format('H:i'));
$PDF->setFontSize(5);
$PDF->hr();
$PDF->printTaggedLn(array('%cb', 'Location ', $reservation['id'], '%c'), array('break' => false));
if(! is_null($addrs['client'])) {
   $PDF->printLn(' pour ' . $addrs['client'][0], array('break' => false));
}
$PDF->br();
$PDF->setFontSize(3.2);
$PDF->hr();
$PDF->SetFont('century-gothic');

$PDF->printTaggedLn(array(
         'Début de location : ', '%cb', 
         $reservation['begin']->format('d.m.Y') . ' ' . $reservation['begin']->format('H:i'), 
         '%c'),
      array('break' => true));

if(is_null($reservation['deliveryBegin']) && is_null($reservation['deliveryEnd'])) {
   $PDF->br();
} else {
   if(!is_null($reservation['deliveryBegin'])) {
      $PDF->printTaggedLn(array(
               '%c', 'Livraison : ', '%cb',
               $reservation['deliveryBegin']->format('d.m.Y') . ' ',
               $reservation['deliveryBegin']->format('H:i')
               ),
            array('break' => true));
   }
}

if(!is_null($addrs['client'])) {
   $PDF->vtab(2);
   $PDF->printTaggedLn(array('%cb', 'Client'), array('underline' => true));
   foreach($addrs['client'] as $c) {
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
   }  
} else {
   $PDF->vtab(2); 
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'length' => 53, 'square' => 6));
}

if(!is_null($addrs['facturation'])) {
   $PDF->vtab(2);
   $PDF->tab(3);
   $PDF->printTaggedLn(array('%cb', 'Facturation'), array('underline' => true));
   foreach($addrs['facturation'] as $c) {
      $PDF->tab(3);
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
   }  
} else {
   $PDF->vtab(2);
   $PDF->tab(3); 
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'square' => 6, 'length' => 53));
}


$PDF->vtab(2);
$PDF->tab(4);
$PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'square' => 6));

$PDF->vtab(3);
$PDF->hr();
if(!empty($reservation['address']) || !empty($resevation['locality'])) {
   $line = '';
   if(!empty($reservation['address'])) {
      $l = explode("\n", $reservation['address']);
      foreach($l as $_l)  {
         if($line != '') { $line .= ', '; }
         $line .= trim($_l);
      }    
   }
   if(!empty($reservation['locality'])) {
      if($line != '') { $line .= ', '; }
      $line .= $reservation['locality'];
   }

   if($line != '') {
      $PDF->printTaggedLn(array('%c', 'Chantier : ' , '%cb' ,$line));
   }
}

if(!empty($reservation['gps'])) {
   $PDF->printTaggedLn(array('%c', 'GPS : ', '%cb', $reservation['gps']));
}

if(!empty($reservation['reference'])) {
   $PDF->printTaggedLn(array('%c', 'Référence : ', '%cb', $reservation['reference']));
}

if($addrs['responsable'] != null) {
   $res = '';
   foreach($addrs['responsable'] as $r) {
      if($res != '') { $res .= ', '; }
      $res .= $r;
   }
   $PDF->printTaggedLn(array('%c', 'Responsable : ', '%cb', $res));
}

$PDF->printTaggedLn(array('%c', 'Période facturée : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, $PDF->getRemainingWidth() - 2, 0, 'dotted', array('color' => '#999') );
$PDF->br();
$PDF->br();
$PDF->squaredFrame(88, array('color' => '#DDD', 'line' => 0.1, 'border-color' => 'black', 'border-line' => 0.2, 'border' => true));

/* On the grid */
$PDF->vspace(2);
$PDF->setFontSize(5.6);
$PDF->printTaggedLn(array('%cb', $reservation['target'], ' - ' . $machine['cn']), array('underline' => true));
$PDF->resetFontSize();
if(!empty($reservation['title'])) {
   $PDF->printTaggedLn(array('%c', 'Commandée : ', $reservation['title']));
}

$PDF->vspace(80);
if(isset($reservation['equipment'])) {
   $equipment = array();
   $eq = explode("\n", $reservation['equipment']);
   foreach($eq as $e) {
      if(empty($e)) { continue; }
      $_e = explode(',', $e);
      foreach($_e as $__e) {
         if(empty($__e)) { continue; }
         $equipment[] = trim($__e);
      }
   }
   
   $txt = '';
   foreach($equipment as $e) {
      if($txt != '') { $txt .= ', '; }
      $txt .= $e;
   }
   if($txt != '') {
      $PDF->printTaggedLn(array('%cb', 'Équipement'), array('underline' => true));
      $PDF->printTaggedLn(array('%c', $txt));
      $PDF->vspace(2);
   }
}
if(is_array($reservation['complements']) && count($reservation['complements']) > 0) {
   $association = array();
   foreach($reservation['complements'] as $complement) {
      if($association[$complement['type']['name']]) {
         $association[$complement['type']['name']][] = $complement;
      } else {
         $association[$complement['type']['name']] = array($complement);
      }
   }

   foreach($association as $k => $v) {
      $PDF->printTaggedLn(array('%cb', $k), array('underline'=>true) );
      $x = false;
      foreach($v as $data) {
         if( ! (int)$data['follow']) {
            $begin = new DateTime($data['begin']) ;
            $end = new DateTime($data['end']);
            $PDF->printTaggedLn(array( '%cb', $data['number'],  '%c', 'x du ', '%cb', $begin->format('d.m.Y H:i'), '%c',  ' au ', '%cb', $end->format('d.m.Y H:i')), array('break' => false));
         } else {
            $PDF->printTaggedLn(array( '%cb', $data['number'],  '%c', 'x durant toute la réservation'), array('break' => false));
         }
         if($x) {
            $PDF->br();
            $x = false;
         } else {
            $PDF->tab(2);
            $x = true; 
         }
      }
      $PDF->br();
   }
}

$PDF->vtab(4);
$PDF->printTaggedLn(array('%a', '', '%c', ' Plein d\'essence effectué'), array('break' => false));
$PDF->tab(2);
$PDF->printTaggedLn(array('%a', '', '%c', ' Décompte intermédiaire'));

$PDF->vtab(5);
$PDF->hr();
$PDF->br();
$PDF->printTaggedLn(array('%c', 'Lieu et date : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, $PDF->getRemainingWidth() - 2, 0, 'dotted', array('color' => '#999') );
$PDF->br(); $PDF->br();
$PDF->printTaggedLn(array('%c', 'Signature : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, $PDF->getRemainingWidth() - 2, 0, 'dotted', array('color' => '#999') );
$PDF->br();

if(is_null($addrs['client'])) {
   $PDF->Output($reservation['id'] .  '.pdf', 'I'); 
} else {
   $PDF->Output($reservation['id'] . ' @ ' . $addrs['client'][0] . '.pdf', 'I'); 

}
?>
