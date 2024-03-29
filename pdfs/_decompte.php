<?PHP
include('base.php');

$GEntry = new GetEntry();
$JClient = new artnum\JRestClient(base_url('/store'));

$res = $JClient->get($_GET['id'], 'DeepReservation');
if($res['type'] != 'results') {
   exit(0);
}

if(!isset($res['data'][0]) && !isset($res['data']['id'])) {
   exit(0);
}
$reservation = FReservation(isset($res['data'][0]) ? $res['data'][0] : $res['data']);

$machine = $GEntry->getMachine($reservation['target']);
$addrs = array('client' => null, 'responsable' => null, 'facturation' => null);
foreach($addrs as $k => $v) {
   $res = $JClient->search(array('search.comment' => '_' . $k, 'search.reservation' => $reservation['id']), 'ReservationContact');
   if($res['type'] == 'results') {
      if(!empty($res['data'][0]['target'])) {
         $c = explode('/', $res['data'][0]['target']);
         if (empty($c[0])) { array_shift($c); }
         $res = $JClient->get($c[1], $c[0]);
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
$PDF = new LocationPDF(array('margins' => array(10, 10, 10)));
$PDF->addVTab(21);
$PDF->addVTab(28);
$PDF->addVTab(58);
$PDF->addVTab(242);
$PDF->addVTab(246);
$PDF->addTab('right', 'right');
$PDF->addTab('middle');
$PDF->addTab(62);
$PDF->addTab(123);
$PDF->SetHeaderFooterEvenOnly();
for ($pages = 0; $pages < 3; $pages++) {
  $PDF->AddPage();
  $PDF->setFontSize(5);

  $PDF->SetY($PDF->getMargin('t'));

  if(! is_null($addrs['client'])) {
    $PDF->printTaggedLn(array('Location ', $reservation['id'], '%cb', ' pour ' . $addrs['client'][0], '%c'), array('align' => 'right'));
  } else {
    $PDF->printTaggedLn(array('Location ', $reservation['id'], '%cb'), array('align' => 'right'));
  }

  $PDF->SetFont('century-gothic');

  $PDF->setFontSize(2);
  $PDF->vtab(1);
  $PDF->tab(1);
  $PDF->printLn('créée le ' . $reservation['created']->format('d.m.Y') . ' à '.  $reservation['created']->format('H:i'));
  $PDF->setFontSize(3.2);
  $PDF->hr();
  $PDF->br();

  $PDF->block('address');
  $PDF->SetFont('century-gothic');

  if(!is_null($addrs['client'])) {
    $PDF->block('address');
    $PDF->printTaggedLn(array('%cb', 'Client'), array('underline' => true));
    foreach($addrs['client'] as $c) {
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
    }  
  } else {
    $PDF->block('address');
    $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'length' => 53, 'square' => 6));
  }

  if(!is_null($addrs['facturation'])) {
    $PDF->block('address');
    $PDF->tab(3);
    $PDF->printTaggedLn(array('%cb', 'Facturation'), array('underline' => true));
    foreach($addrs['facturation'] as $c) {
      $PDF->tab(3);
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
    }  
  } else {
    $PDF->block('address');
    $PDF->tab(3); 
    $PDF->printTaggedLn(array('%cb', 'Facturation'), array('underline' => true));
    $PDF->block('address');
    $PDF->tab(3); 
    $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'square' => 6, 'length' => 53));
  }


  $PDF->block('address');
  $PDF->tab(4);
  $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'square' => 6));

  $PDF->to_block_end();
  $PDF->br();

  $PDF->block('details1', 'address');
  $PDF->hr();

  $b1Empty = true;
  if(!empty($reservation['reference'])) {
    $PDF->printTaggedLn(array('%c', 'Référence : ', '%cb', $reservation['reference']));
    $b1Empty = false;
  } else {
    $PDF->printTaggedLn(array('%c', 'Référence : '), array('break' => false));
    $PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, $PDF->getRemainingWidth() - 2, 0, 'dotted', array('color' => '#999') );
    $PDF->br();
    $b1Empty = false;
  }

  /* Locality handling */
  if (isset($reservation['warehouse']) && (!isset($reservation['locality']) && !empty($reservation['locality']))) {
    $reservation['locality'] = $reservation['warehouse'];
  }

  if(!empty($reservation['address']) || !empty($reservation['locality'])) {
    $line = '';
    if(!empty($reservation['address'])) {
      $l = explode("\n", $reservation['address']);
      $lout = [];
      foreach($l as $_l)  {
        $_l = trim($_l);
        if (!empty($_l)) {
          $lout[] = $_l;
        }
      }
      $line = implode(', ', $lout);
    }

    $locality = getLocality($JClient, $reservation['locality']);
    if ($locality === NULL) {
      /* NOP */
    } else if ($locality[0] === 'raw' || $locality[0] === 'locality') {
      if ($line === '') {
        $line = $locality[1];
      } else {
        $line = implode(', ', [$line, $locality[1]]);
      }
    } else {
      $line = '';
      $PDF->printTaggedLn(array('%c', 'Viens chercher au dépôt de : ' , '%cb' , $locality[1]));
    }

    if($line != '') {
      $PDF->printTaggedLn(array('%c', 'Chantier : ' , '%cb', $line));
      $b1Empty = false;
    }
  }

  if($addrs['responsable'] != null) {
    $res = '';
    foreach($addrs['responsable'] as $r) {
      if($res != '') { $res .= ', '; }
      $res .= $r;
    }
    $PDF->printTaggedLn(array('%c', 'Responsable : ', '%cb', $res));
    $b1Empty = false;
  }
  if (!$b1Empty) {
    $PDF->br();
    $PDF->hr();
    $PDF->br();
  }

  $PDF->printTaggedLn(array('%c', 'Début de location : '), array('break' => false));
  $XDatePos[0] = $PDF->GetX();
  $PDF->printTaggedLn(array('%cb', $reservation['begin']->format('d.m.Y'), '%c', ' Heure : ', '%cb', $reservation['begin']->format('H:i'), '%c'), array('break' => false));

  if(!is_null($reservation['deliveryBegin'])) {
    if(!is_null($reservation['deliveryBegin'])) {
      $PDF->tab(2);
      $PDF->printTaggedLn(array('%c', 'Livraison : '), array('break' => false));
      $XDatePos[1] = $PDF->GetX();
      $PDF->printTaggedLn(array('%cb', $reservation['deliveryBegin']->format('d.m.Y'), '%c', ' Heure : ', '%cb', $reservation['deliveryBegin']->format('H:i')), array('break' => true));
    }
  } else {
    $PDF->br();
  }
  $PDF->printTaggedLn(array('%c', 'Fin de location : '), array('break' => false));
  $PDF->SetX($XDatePos[0]);
  $PDF->printTaggedLn(array('%cb', $reservation['end']->format('d.m.Y'), '%c', ' Heure : ', '%cb', $reservation['end']->format('H:i'), '%c'), array('break' => false));

  if(!is_null($reservation['deliveryEnd'])) {
    if(!is_null($reservation['deliveryEnd'])) {
      $PDF->tab(2);
      $PDF->printTaggedLn(array('%c', 'Retour : '), array('break' => false));
      if (isset($XDatePos[1])) {
        $PDF->SetX($XDatePos[1]);
      }
      $PDF->printTaggedLn(array('%cb',$reservation['deliveryEnd']->format('d.m.Y'), '%c', ' Heure : ', '%cb', $reservation['deliveryEnd']->format('H:i')), array('break' => true));
    }
  } else {
    $PDF->br();
  }

  $PDF->br();
  $PDF->printTaggedLn(array('%c', 'Période facturée : '), array('break' => false));
  $PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, $PDF->getRemainingWidth() - 48, 0, 'dotted', array('color' => '#999') );
  $PDF->SetX(155);
  $PDF->printTaggedLn(array('%a', '', '%c', ' Décompte intermédiaire'));

  $PDF->br();
  $PDF->squaredFrame(68, array('color' => '#DDD', 'line' => 0.1, 'border-color' => 'black', 'border-line' => 0.2, 'border' => true));

  /* On the grid */
  $PDF->vspace(2);
  $PDF->setFontSize(5.6);
  $PDF->printTaggedLn(array('%cb', $reservation['target'], ' - ' . $machine['cn']), array('underline' => true));
  $PDF->resetFontSize();
  if(!empty($reservation['title'])) {
    $PDF->printTaggedLn(array('%c', 'Commandée : ', $reservation['title']));
  }

  $PDF->vspace(60);
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
      if(isset($association[$complement['type']['name']])) {
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
          $begin->setTimezone(new DateTimeZone(date_default_timezone_get()));
          $end = new DateTime($data['end']);
          $end->setTimezone(new DateTimeZone(date_default_timezone_get()));
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

  if ($reservation['folder']) {
    $PDF->printTaggedLn(array('%cb', 'Dossier'), array('underline' => true));
    $PDF->printTaggedLn(array('%c',  $reservation['folder']));
  }
  if ($reservation['creator']) {
    $creator = explode('/', sanitize_path($reservation['creator']));
    if (count($creator) > 0) {
      $r = $JClient->get($creator[count($creator) - 1], 'User');
      if ($r['type'] == 'results') {
        $PDF->printTaggedLn(array('%cb', 'Responsable'), array('underline' => true));
        $PDF->printTaggedLn(array('%c',  $r['data']['name']));
      }
    }
  }


  $PDF->vtab(4);
  $PDF->printTaggedLn(array('%a', '', '%c', ' Plein d\'essence effectué'), array('break' => false));

  $PDF->vtab(5);
  $PDF->hr();
  $PDF->br();
  $PDF->printTaggedLn(array('%c', 'Lieu et date : '), array('break' => false));
  $PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, $PDF->getRemainingWidth() - 2, 0, 'dotted', array('color' => '#999') );
  $PDF->br(); $PDF->br();
  $PDF->printTaggedLn(array('%c', 'Signature : '), array('break' => false));
  $PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, $PDF->getRemainingWidth() - 2, 0, 'dotted', array('color' => '#999') );
  $PDF->br();
  $PDF->reset_blocks();

  $PDF->AddPage();
}

if(is_null($addrs['client'])) {
   $PDF->Output('I', 'Reçu ' . $reservation['id'] .  '.pdf', true); 
} else {
   $PDF->Output('I', 'Reçu ' . $reservation['id'] . ' @ ' . $addrs['client'][0] . '.pdf', true); 

}
?>
