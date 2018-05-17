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
            $addrs[$k] = format_address(array('type' => 'freeform', 'data' => $res['data'][0]));
         }
      }
   }
}

/* PDF Generation */
$PDF = new LocationPDF();
$PDF->title = "Mission";
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
$PDF->printTaggedLn(array('%cb', $PDF->title . ' ', $reservation['id'], '%c'), array('break' => false));
if(! is_null($addrs['client'])) {
   $PDF->printLn(' pour ' . $addrs['client'][0], array('break' => false));
}
$PDF->br();
$PDF->setFontSize(3.2);
$PDF->SetFont('century-gothic');
$PDF->hr();
$PDF->br();

$PDF->printTaggedLn(array('%c', 'Collaborateur : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 66, 0, 'dotted', array('color' => '#999') );
$PDF->SetX(116);
$PDF->printTaggedLn(array('%c', 'Véhicule : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 66 , 0, 'dotted', array('color' => '#999') );


$PDF->vtab(2); 
if(!is_null($addrs['client'])) {
   $PDF->printTaggedLn(array('%cb', 'Client'), array('underline' => true));
   foreach($addrs['client'] as $c) {
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
   }  
} else {
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'length' => 53, 'square' => 6));
}

$PDF->vtab(2);
if(!is_null($addrs['place'])) {
   $PDF->tab(3);
   $PDF->printTaggedLn(array('%cb', 'Contact s/place'), array('underline' => true));
   foreach($addrs['place'] as $c) {
      $PDF->tab(3);
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
   }  
} else {
   $PDF->tab(3); 
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'square' => 6, 'length' => 53));
}


$PDF->vtab(2);
if(!is_null($addrs['responsable'])) {
   $PDF->tab(4);
   $PDF->printTaggedLn(array('%cb', 'Responsable'), array('underline' => true));
   foreach($addrs['responsable'] as $c) {
      $PDF->tab(4);
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
   }  
} else {
   $PDF->tab(4); 
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'square' => 6, 'length' => 53));
}

$PDF->vtab(3);
$PDF->hr();

if(!empty($reservation['reference'])) {
   $PDF->printTaggedLn(array('%c', 'Référence : ', '%cb', $reservation['reference']));
}

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

$PDF->printTaggedLn(array( '%c', 
         'Location date : ', '%cb', 
         $reservation['begin']->format('d.m.Y'), '%c', ' / heure :', '%cb', $reservation['begin']->format('H:i'), 
         '%c'),
      array('break' => true));

if(is_null($reservation['deliveryBegin']) && is_null($reservation['deliveryEnd'])) {
   $PDF->br();
} else {
   if(!is_null($reservation['deliveryBegin'])) {
      $PDF->printTaggedLn(array(
               '%c', 'Livraison date : ', '%cb',
               $reservation['deliveryBegin']->format('d.m.Y'), '%c', ' / heure : ', '%cb' ,
               $reservation['deliveryBegin']->format('H:i')
               ),
            array('break' => true));
   }
}


$PDF->br();
$PDF->br();
$PDF->squaredFrame(148, array('color' => '#DDD', 'line' => 0.1, 'border-color' => 'black', 'border-line' => 0.2, 'border' => true));

/* On the grid */
$PDF->vspace(2);
$PDF->setFontSize(5.6);
$PDF->printTaggedLn(array('%cb', $reservation['target'], ' - ' . $machine['cn']), array('underline' => true));
$PDF->resetFontSize();
if(!empty($reservation['title'])) {
   $PDF->printTaggedLn(array('%c', 'Commandée : ', $reservation['title']));
}

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
   
   if(count($equipment) > 0) {
      $PDF->printTaggedLn(array('%cb', 'Matériel :'), array('break' => false ));
      $XPos = ceil($PDF->GetX() / 4) * 4;
      foreach($equipment as $e) {
         $PDF->SetX($XPos);
         $PDF->printTaggedLn(array('%c', $e));
      }
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
      $PDF->printTaggedLn(array('%cb', $k . ' : '), array('break' => false));
      $XPos = ceil($PDF->GetX() / 4) * 4;
      foreach($v as $data) {
         $PDF->SetX($XPos);
         if( ! (int)$data['follow']) {
            $begin = new DateTime($data['begin']) ;
            $end = new DateTime($data['end']);
            $PDF->printTaggedLn(array( '%c', $data['number'],  '%c', 'x du ', '%cb', $begin->format('d.m.Y H:i'), '%c',  ' au ', '%cb', $end->format('d.m.Y H:i')), array('break' => false));
         } else {
            $PDF->printTaggedLn(array( '%c', $data['number'],  '%c', 'x durant toute la réservation'), array('break' => false));
         }
         if($data['comment']) {
            $PDF->br();
            $PDF->SetX($XPos);
            $PDF->printTaggedLn(array($data['comment'] ), array('break' => false));
         }
         $PDF->br();
      }
      $PDF->br();
   }
}

if(is_null($addrs['client'])) {
   $PDF->Output($reservation['id'] .  '.pdf', 'I'); 
} else {
   $PDF->Output($reservation['id'] . ' @ ' . $addrs['client'][0] . '.pdf', 'I'); 

}
?>
