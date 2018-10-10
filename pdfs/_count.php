<?PHP
include('base.php');
include('../lib/format.php');

$JClient = new artnum\JRestClient('http://localhost/location/store');
$Machine = new artnum\JRestClient('https://aircluster.local.airnace.ch/store', NULL, array('verifypeer' => false));

$res = $JClient->get($_GET['id'], 'Count');
if (!$res['success'] || $res['length'] != 1) {
   e404('décompte inexistant');
}
$count = $res['data'];
$res = $JClient->search(array('search.count' =>  $count['id']), 'CountReservation');
if (!$res['success'] || $res['length'] <= 0) {
}
$reservations = array();
foreach($res['data'] as $item) {
   $_r = $JClient->get($item['reservation'], 'DeepReservation');
   if ($_r['success'] && $_r['length'] == 1) {
      $reservations[] = FReservation($_r['data']);
   }
}

if (count($reservations) == 0) {
   e404('aucune réservation pour le décompte');
}

$res = $JClient->search(array('search.count' => $count['id']), 'Centry');
if (!$res['success'] || $res['length'] <= 0) {
   e404('aucune entrée pour le décompte');
}

$entries = $res['data'];
usort($entries, function ($a, $b) {
   if ($a['reservation'] == $b['reservation']) {
      return ($a['id'] < $b['id']) ? -1 : 1;
   }
   return ($a['reservation'] < $b['reservation']) ? -1 : 1;
});

$contacts = array();
$machines = array();

/* Preprocess reservation */
foreach ($reservations as $k => $reservation) {
   if (!isset($machines[$reservations[$k]['target']])) {
      $res = $Machine->search(array('search.description' => $reservations[$k]['target'], 'search.airaltref' => $reservations[$k]['target']), 'Machine');
      if ($res['type'] == 'results') {
         $machines[$reservations[$k]['target']] = $res['data'][0];
      }
   }

   foreach ($reservations[$k]['contacts'] as $contact) {
      foreach ($contact as $entry) {
         if (!isset($contacts[$entry['id']])) {
            if($entry['freeform']) {
               $contacts[$entry['id']] = format_address(array('type' => 'freeform', 'data' => $entry['freeform']));
            } else {
               $contacts[$entry['id']] = format_address(array('type' => 'db', 'data' => $entry['target']));
            }
         }
      }
   }
}

/* preprocess count */
foreach (array('created', 'modified', 'deleted', 'end', 'begin', 'date', 'printed') as $key) {
   if (!empty($count[$key])) {
      try {
         $count[$key] = new DateTime($count[$key]);
         $count[$key]->setTimezone(new DateTimeZone(date_default_timezone_get()));
      } catch (Exception $e) {
         $count[$key] = '';
      }
   }
}

/* PDF Generation */
$PDF = new LocationPDF(array('margins' => array(10, 10, 10)));
$PDF->addVTab(28);
$PDF->addVTab(58);
$PDF->addVTab(242);
$PDF->addVTab(246);
$PDF->addTab('right', 'right');
$PDF->addTab('middle');
$PDF->addTab(62);
$PDF->addTab(123);

$PDF->AddPage();
$PDF->hr();
$PDF->setPosition(60);
$PDF->setFontSize(5);
$y = $PDF->GetY();
$PDF->SetY($PDF->tMargin);
/* Title block */
$PDF->printTaggedLn(array('Décompte ', strval($count['id']), '%cb'), array('align' => 'right'));

$PDF->SetFont('century-gothic');
$PDF->setFontSize(2);

$PDF->SetY($y - 6);
$PDF->printLn('créée le ' . $count['created']->format('d.m.Y') . ' à '. $count['created']->format('H:i'), array('align' => 'right'));
$PDF->setFontSize(3.2);

$PDF->SetY($y);

$PDF->block('addresses');
$PDF->printTaggedLn(array('%cb', 'Facturation'), array('underline' => true));
if ($count['_invoice']['address'] && $contacts[$count['_invoice']['address']]) {
   foreach ($contacts[$count['_invoice']['address']] as $line) {
      if (!empty($line)) {
         $PDF->printTaggedLn(array('%c', $line), array('max-width' => $PDF->innerCenter));
      }
   }
} else {
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'length' => 85, 'square' => 6));
}

$PDF->left = $PDF->innerCenter;
$PDF->to_block_begin();

$PDF->printTaggedLn(array('%cb', 'Résumé'), array('underline' => true));
$PDF->printTaggedLn(array('%c', 'Montant : ', '%cb', $count['total']));
$PDF->printTaggedLn(array('%c', 'Date : ', '%cb', $count['date']->format('d.m.Y')));
if (!empty($count['begin']) || !empty($count['end'])) {
   if (empty($count['begin'])) {
      $PDF->printTaggedLn(array('%c', 'Jusqu\'au ', '%cb', $count['end']->format('d.m.Y')));
   } else if (empty($count['end'])) {
      $PDF->printTaggedLn(array('%c', 'Depuis le ', '%cb', $count['begin']->format('d.m.Y')));
   } else {
      $PDF->printTaggedLn(array('%c', 'Période du ', '%cb', $count['begin']->format('d.m.Y'), '%c', ' au ', '%cb', $count['end']->format('d.m.Y')));
   }
}

if (count($reservations) <= 1) {
   $PDF->printTaggedLn(array('%c', 'Réservation : '), array('break' => false));
} else {
   $PDF->printTaggedLn(array('%c', 'Réservations : '), array('break' => false));
}
$first = true;
foreach ($reservations as $r) {
   if (!$first) { $PDF->printTaggedLn(array('%c', ', '), array('break' => false)); }
   $PDF->printTaggedLn(array('%cb', $r['id']), array('break' => false));
   $first = false;
}
unset($PDF->left);
$PDF->block('remarks', 'addresses');
$PDF->left = 10;
$PDF->right = 10;

$PDF->br();
$comments = explode("\n", $count['comment']);
$PDF->printTaggedLn(array('%cb', 'Remarque : '), array('underline' => true));
foreach($comments as $c) {
   $PDF->printTaggedLn(array('%c', $c), array('multiline' => true));
}

$PDF->to_block_end();
$PDF->hr();
unset($PDF->left);
unset($PDF->right);

$single = false;
if (count($reservations) == 1) {
   $single = true;
}

$previous = 'remarks';
$first = true;
foreach($reservations as $reservation) {
   $PDF->block('r' . $reservation['id'], $previous);
   if (!$first) { $PDF->br(); } $first = false;
   $previous = 'r' . $reservation['id'];

   $PDF->printTaggedLn(array('%cb', 'Réservation ° ' . $reservation['id']), array('underline' => true));
   $PDF->right = 8; 
   $PDF->left = 8; 

   $PDF->printTaggedLn(array('%c', 'Machine : ', '%cb',  $reservation['target'] . ' - ' . $machines[$reservation['target']]['cn']));
   $PDF->printTaggedLn(array('%c', 'Location du ', '%cb',  $reservation['begin']->format('d.m.Y'), '%c', ' au ', '%cb',  $reservation['end']->format('d.m.Y')));

   if (!empty($reservation['reference'])) {
      $PDF->printTaggedLn(array('%c', 'Référence : ', '%cb', $reservation['reference']), array('multiline' => true));
   } else {
       $PDF->printTaggedLn(array('%c', 'Référence : '));
   }
   if (!empty($reservation['contacts']) && !empty($reservation['contacts']['_client'])) {
       $PDF->printTaggedLn(array('%c', 'Client : ', '%cb', join(', ', $contacts[$reservation['contacts']['_client'][0]['id']])), array('multiline' => 'true'));
   } else {
       $PDF->printTaggedLn(array('%c', 'Client : '));
   }


   unset($PDF->left);
   unset($PDF->right);

   $PDF->br();
   $PDF->block('e' . $reservation['id'], $previous);
   $PDF->background_block('#DDDDDD');
   $previous = 'e' . $reservation['id'];
   $subtotal = 0;
   foreach ($entries as $entry) {
      if ($single || ($entry['reservation'] == $reservation['id'])) {
         if (!isset($entry['total'])) {
            $entry['total'] = floatval($entry['quantity']) * floatval($entry['price']);
         }

         $subtotal += $entry['total'];

         $PDF->printTaggedLn(array('%c', $entry['description']), array('max-width' => 99, 'multiline' => true, 'break' => false));
         if (isset($entry['quantity']) && $entry['quantity'] != 0) {
            $PDF->SetX(112);
            $PDF->printTaggedLn(array('%c', sprintf('%.02F', $entry['quantity'])), array('max-width' => 15, 'multiline' => true, 'break' => false, 'align' => 'right'));
         }
         if (isset($entry['price']) && $entry['price'] != 0) {
            $PDF->SetX(136);
            $PDF->printTaggedLn(array('%c', sprintf('%.02F', $entry['price'])), array('max-width' => 15, 'align' => 'right', 'multiline' => true, 'break' => false));
         }
         if (isset($entry['total']) && $entry['total'] != 0) {
            $PDF->printTaggedLn(array('%c', sprintf('%.02F', floatval($entry['total']))), array('multiline' => true, 'break' => false, 'align' => 'right'));
         }

         $PDF->br();
      }
   }
   $PDF->hr();
   $PDF->printTaggedLn(array('%cb', 'Total pour réservation N°' . $reservation['id']), array('max-width' => 99, 'multiline' => true, 'break' => false));
   $PDF->SetX($PDF->right);
   $PDF->printTaggedLn(array('%cb', sprintf('%.02F', $subtotal)), array('multiline' => true, 'break' => false, 'align' => 'right'));
   $PDF->br();
   $PDF->close_block();
}

$PDF->br();
unset($PDF->left);
unset($PDF->right);
$PDF->hr();
$PDF->SetFontSize(6);
$PDF->printTaggedLn(array('%cb', 'Total'), array('break' => false));
$PDF->printTaggedLn(array('%cb', $count['total']), array('align' => 'right'));
$PDF->Output($count['id'] .  '.pdf', 'I'); 

$JClient->patch(array('id' => $count['id'], 'printed' => (new DateTime())->format('c')), $count['id'], 'Count');
?>
