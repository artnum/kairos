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
$PDF->addVTab(19);
$PDF->addVTab(50);
$PDF->addVTab(88);
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
$PDF->printLn('Réservation ' . $reservation['id'] . ', créée le ' . $reservation['created']->format('d.m.Y') . ' à '.
         $reservation['created']->format('H:i'));
$PDF->setFontSize(5);
$PDF->hr();
$PDF->printTaggedLn(array('%cb', $machine['cn']), array('break' => false));
if(! is_null($addrs['client'])) {
   $PDF->printTaggedLn(array('%c', ' pour ', '%cb', $addrs['client'][0]), array('break' => false));
}
$PDF->br();
$PDF->SetFont('century-gothic');
$PDF->hr();
$PDF->br();

$PDF->setFontSize(3.6);
$PDF->printTaggedLn(array('%c', 'Collaborateur : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 64, 0, 'dotted', array('color' => '#999') );
$PDF->SetX(116);
$PDF->printTaggedLn(array('%c', 'Véhicule : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 64 , 0, 'dotted', array('color' => '#999') );

$PDF->setFontSize(3.2);

$PDF->vtab(2); 
$PDF->printTaggedLn(array('%cb', 'Client'), array('underline' => true));
if(!is_null($addrs['client'])) {
   foreach($addrs['client'] as $c) {
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
   }  
} else {
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'length' => 53, 'square' => 6));
}

$PDF->vtab(2);
$PDF->tab(3); 
$PDF->printTaggedLn(array('%cb', 'Contact s/place'), array('underline' => true));
if(!is_null($addrs['place'])) {
   foreach($addrs['place'] as $c) {
      $PDF->tab(3);
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
   }  
} else {
   $PDF->tab(3);
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'square' => 6, 'length' => 53));
}


$PDF->vtab(2);
$PDF->tab(4);
$PDF->printTaggedLn(array('%cb', 'Responsable'), array('underline' => true));
if(!is_null($addrs['responsable'])) {
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

$PDF->SetFontSize(3.4);
$PDF->printTaggedLn(array('%c', 'Machine : ', '%cb', $reservation['target'], ' - ' . $machine['cn']));
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

$txt = 'Début location date : ';
if(is_null($reservation['deliveryBegin'])) {
   $txt =  'Rendez-vous date : ';
}

$PDF->printTaggedLn(array( '%c', 
         $txt, '%cb', 
         $reservation['begin']->format('d.m.Y'), '%c', ' / heure : ', '%cb', $reservation['begin']->format('H:i'), 
         '%c'),
      array('break' => true));

if(is_null($reservation['deliveryBegin']) && is_null($reservation['deliveryEnd'])) {
   $PDF->br();
} else {
   if(!is_null($reservation['deliveryBegin'])) {
      $PDF->printTaggedLn(array(
               '%c', 'Rendez-vous date : ', '%cb',
               $reservation['deliveryBegin']->format('d.m.Y'), '%c', ' / heure : ', '%cb' ,
               $reservation['deliveryBegin']->format('H:i')
               ),
            array('break' => true));
   }
}

/* On the grid */
$PDF->vspace(2);
$PDF->setFontSize(5.6);
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
      $PDF->printTaggedLn(array('%cb', 'Matériel :'), array('underline' => true ));
      $XPos = ceil($PDF->GetX() / 4) * 4;
      foreach($equipment as $e) {
         $PDF->SetX($XPos);
         $PDF->printTaggedLn(array('%c', $e));
      }
   }
}

$remSize = 70;
$col = array( 12, 8, 24, $remSize, 0);

$PDF->printTaggedLn(array('%cb', 'Complément'), array('underline' => true, 'break' => false)); $col[0] += $PDF->GetX();  $PDF->SetX($col[0]);
$PDF->printTaggedLn(array('%cb', 'Quantité'), array('underline' => true, 'break' => false)); $col[1] += $PDF->GetX(); $PDF->SetX($col[1]);
$PDF->printTaggedLn(array('%cb', 'Durée'), array('underline' => true, 'break' => false)); $col[2] += $PDF->GetX(); $PDF->SetX($col[2]);
$PDF->printTaggedLn(array('%cb', 'Remarque'), array('underline' => true, 'break' => false)); $col[3] += $PDF->GetX(); $PDF->SetX($col[3]);
$PDF->printTaggedLn(array('%cb', 'Chargé'), array('underline' => true, 'break' => false, 'align' => 'right')); $col[4] = $PDF->GetX() - ceil($PDF->GetStringWidth('Chargé') / 2);
$PDF->br();

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
      $startY = $PDF->GetY();
      $stopY = $startY;
      foreach($v as $data) {
         $PDF->printTaggedLn(array('%c', $k ), array('break' => false)); $PDF->SetX($col[0]);
         $PDF->printTaggedLn(array('%c', $data['number']), array('break' => false)); $PDF->SetX($col[1]);

         if( ! (int)$data['follow']) {
            $begin = new DateTime($data['begin']) ;
            $end = new DateTime($data['end']);
            $PDF->printTaggedLn(array( '%c', 'du ', $begin->format('d.m.Y H:i'))); $PDF->SetX($col[1]);
            $PDF->printTaggedLn(array('au ',  $end->format('d.m.Y H:i')), array('break' => false)); $PDF->SetX($col[2]);
            $stopY = $PDF->GetY(); $PDF->SetY($startY);
         } else {
            $PDF->printTaggedLn(array('%c', 'toute la location'), array('break' => false)); $PDF->SetX($col[2]);
         }


         $comment = trim($data['comment']);
         if($remSize < $PDF->GetStringWidth($data['comment'])) {
            $c = ''; $_c = '';
            foreach(explode(' ', $comment) as $w) {
               if($PDF->GetStringWidth($c . ' ' . $w) < $remSize) {
                  if(empty($c)) {
                     $c .= $w;
                  } else {
                     $c .= ' ' . $w;
                  }
               } else {
                  $_c .= $c . "\n";
                  $c = $w;
               }
            }
            $comment = $_c . $c;;
         }
         foreach(explode("\n", $comment) as $c) {
            if($stopY < $PDF->GetY()) { $stopY = $PDF->GetY(); }
            $PDF->printTaggedLn(array('%c', $c)); $PDF->SetX($col[2]);
         }

         $PDF->SetY($startY);
         $PDF->SetX($col[4]);
         $PDF->printTaggedLn(array('%a', ''), array('break' => false));
         $PDF->br();
      }
      $PDF->SetY($stopY);
      $PDF->br();
   }
}

$PDF->printTaggedLn(array('%cb', 'Remarque :'));
$YPos = $PDF->GetY();
$PDF->squaredFrame($PDF->h - ($YPos + 20), array('color' => '#DDD', 'line' => 0.1, 'border-color' => 'black', 'border-line' => 0.2, 'border' => true));
if($reservation['comment']) {
   $PDF->SetY($YPos + 1);

   foreach(preg_split('/(\n|\r|\r\n|\n\r)/', $reservation['comment']) as $line) {
      $y = $PDF->GetY();
      $PDF->printTaggedLn(array('%c', $line));
      $PDF->SetY($y + 4);
   }
}

if(is_null($addrs['client'])) {
   $PDF->Output($reservation['id'] .  '.pdf', 'I'); 
} else {
   $PDF->Output($reservation['id'] . ' @ ' . $addrs['client'][0] . '.pdf', 'I'); 

}
?>
