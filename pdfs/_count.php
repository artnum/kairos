<?PHP
include('base.php');
include('../lib/format.php');

$JClient = new artnum\JRestClient(base_url('/store'));
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

$res = $JClient->get('', 'Unit');
$units = array();
if ($res['success'] && $res['length'] > 0) {
   foreach($res['data'] as $v) {
      $units[$v['id']] = $v;
   }
}
$has_null_entry = false;
$reservations_with_entries = array();
foreach ($entries as $entry) {
   if (is_null($entry['reservation'])) {
      $has_null_entry = true;
   } else {
      if (!in_array($entry['reservation'], $reservations_with_entries)) {
        $reservations_with_entries[] = $entry['reservation'];
      }
   }
}

$has_global_reference = false;
if (!is_null($count['reference'])) {
   $has_global_reference = true;
}

$contacts = array();
$machines = array();

/* Preprocess reservation */
$clientManager = null;
foreach ($reservations as $k => $reservation) {
   if (!isset($machines[$reservations[$k]['target']])) {
      $res = $Machine->search(array('search.description' => $reservations[$k]['target'], 'search.airaltref' => $reservations[$k]['target']), 'Machine');
      if ($res['type'] == 'results') {
         $machines[$reservations[$k]['target']] = $res['data'][0];
      }
   }

   foreach ($reservations[$k]['contacts'] as $type => $contact) {
      foreach ($contact as $entry) {
         /* clientManager will contain the name and givenname of manager */
         if ($type == '_responsable' && is_null($clientManager)) {
            if ($entry['freeform']) {
               $clientManager = format_address(array('type' => 'freeform', 'data' => $entry['freeform']))[0];
            } else {
               $e = $entry['target'];
               if (isset($e['givenname']) || isset($e['sn'])) {
                  if (isset($e['givenname'])) {
                     $clientManager = $e['givenname'];
                  }
                  if (isset($e['sn'])) {
                     if (!is_null($clientManager)) {
                        $clientManager .= ' ';
                     }
                     $clientManager .= $e['sn'];
                  }
               } else {
                  $clientManager = format_address(array('type' => 'db', 'data' => $e))[0];
               }
            }
         }
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
$PDF->setFontSize(5);
/* Title block */
$PDF->block('title');
$final = ' intermédiaire ';
if ($count['state'] === 'FINAL') {
  $final = '';
}
$PDF->printTaggedLn(array('Décompte ', $final, strval($count['id']), '%cb'), array('align' => 'right'));

$PDF->SetFont('century-gothic');
$PDF->setFontSize(2);

$PDF->printLn('créée le ' . $count['created']->format('d.m.Y') . ' à '. $count['created']->format('H:i'), array('align' => 'right'));
$PDF->setFontSize(3.2);


$PDF->block('addresses');
$PDF->SetY(40);
$PDF->hr();
$y = $PDF->GetY();
$PDF->br();
$previous = 'addresses';
$PDF->printTaggedLn(array('%cb', 'Facturation'), array('underline' => true));
if ($count['_invoice']['address'] && $contacts[$count['_invoice']['address']]) {
   foreach ($contacts[$count['_invoice']['address']] as $line) {
      if (!empty($line)) {
         $PDF->printTaggedLn(array('%c', $line), array('max-width' => $PDF->w / 3));
      }
   }
} else {
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'length' => $PDF->w / 3, 'square' => 6));
}

$PDF->close_block();
$PDF->left = $PDF->w / 3;
$PDF->SetY($y);
$PDF->br();
$PDF->block('our_ref');
$PDF->background_block('#EEEEEE');


$creator = $reservations[0]['creator'];
$creator = explode('/', $creator);
$creator = $JClient->get($creator[count($creator) - 1], $creator[count($creator) - 2]);
if ($creator && $creator['success'] && $creator['length'] == 1) {
   $creator = $creator['data'];
}

$PDF->printTaggedLn(array('%c', 'Notre référence : ', '%cb',  'DEC ' . $count['id']));
if ($creator && isset($creator['name'])) {
   $PDF->printTaggedLn(array('%c', 'Notre responsable : ', '%cb', $creator['name']), array('multiline' => true));
}
$PDF->close_block();
$PDF->br();

$PDF->block('their_ref');
$PDF->background_block('#EEEEEE');
if ($has_global_reference) {
   $PDF->printTaggedLn(array('%c', 'Votre référence : ', '%cb', $count['reference']), array('multiline' => true));
}
if (!is_null($clientManager)) {
   $PDF->printTaggedLn(array('%c', 'Votre responsable : ', '%cb', $clientManager), array('multiline' => true));
}

$PDF->close_block();
$PDF->br();

$PDF->block('range');
$PDF->background_block('#EEEEEE');

if (!empty($count['begin']) || !empty($count['end'])) {
   if (empty($count['begin'])) {
      $PDF->printTaggedLn(array('%c', 'Jusqu\'au ', '%cb', $count['end']->format('d.m.Y')));
   } else if (empty($count['end'])) {
      $PDF->printTaggedLn(array('%c', 'Depuis le ', '%cb', $count['begin']->format('d.m.Y')));
   } else {
      $PDF->printTaggedLn(array('%c', 'Période du ', '%cb', $count['begin']->format('d.m.Y'), '%c', ' au ', '%cb', $count['end']->format('d.m.Y')));
   }
}


$PDF->block('remarks', array($previous, 'range'));
$PDF->left = 10;
$PDF->right = 10;

$PDF->br();
if (!empty($count['comment'])) {
   $comments = explode("\n", $count['comment']);
   $PDF->printTaggedLn(array('%cb', 'Remarque interne: '), array('underline' => true));
   foreach($comments as $c) {
      $PDF->printTaggedLn(array('%c', $c), array('multiline' => true));
   }
}

$PDF->to_block_end();
$PDF->hr();
unset($PDF->left);
unset($PDF->right);

$single = false;
if (count($reservations) == 1) {
   $single = true;
}

function tableHead($PDF, $entries) {
   $discount = false;

   foreach ($entries as $entry) {
      if (isset($entry['discount']) && !is_null($entry['discount']) && $entry['discount'] > 0) {
         $discount = true;
         break;
      }
   }

   $PDF->setFontSize(2);
   $PDF->printTaggedLn(array('%cb', 'Référence'), array('max-width' => 20, 'break' => false));
   $PDF->SetX(30);
   $PDF->printTaggedLn(array('%cb', 'Description'), array('max-width' => 61, 'break' => false));
   $PDF->SetX(94);
   $PDF->printTaggedLn(array('%cb', 'Quantité'), array('max-width' => 16, 'break' => false));
   $PDF->SetX(111);
   $PDF->printTaggedLn(array('%cb', 'Unité'), array('max-width' => 25, 'break' => false));
   $PDF->SetX(136);
   $PDF->printTaggedLn(array('%cb', 'Prix unitaire'), array('max-width' => 18, 'break' => false, 'align' => 'right'));
   if ($discount) {
      $PDF->SetX(160);
      $PDF->printTaggedLn(array('%cb', 'Rabais'), array('max-width' => 10, 'break' => false, 'align' => 'right'));
   }
   $PDF->SetX(180);
   $PDF->printTaggedLn(array('%cb', 'Total'), array('align' => 'right'));
   $PDF->br();
   $PDF->resetFontSize();
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
   if (isset($reservation['title']) && !empty($reservation['title'])) {
      $PDF->printTaggedLn(array('%c', 'Commandée : ', '%cb',  $reservation['title']));
   }

   unset($PDF->left);
   unset($PDF->right);

   if ($single || in_array($reservation['id'], $reservations_with_entries)) {
      $PDF->br();

      tableHead($PDF, $entries);

      $PDF->block('e' . $reservation['id'], $previous);
      $PDF->background_block('#EEEEEE');
      $previous = 'e' . $reservation['id'];
      $subtotal = 0;

      if (!$has_global_reference && !$single) {
         $reference = '';
         if (!empty($reservation['reference']) && empty($reservation['address'])) {
            $reference = $reservation['reference'];
         } else if(!empty($reservation['reference']) && !empty($reservation['address'])) {
            $reference = $reservation['reference'] . ' / ' . flat_text($reservation['address']);
         }


         if ($reference) {
            $PDF->printTaggedLn(array('%c', 'Votre référence : ', '%cb', $reference), array('multiline' => true));
            $PDF->hr();
         }
      }

      foreach ($entries as $entry) {
         if ($single || ($entry['reservation'] == $reservation['id'])) {
            if (!isset($entry['total'])) {
               $entry['total'] = floatval($entry['quantity']) * floatval($entry['price']);
            }

            $subtotal += $entry['total'];
            if (!isset($entry['reference'])) { $entry['reference'] = ''; }

            $PDF->printTaggedLn(array('%c', $entry['reference']), array('max-width' => 20, 'multiline' => true, 'break' => false));
            $PDF->SetX(30);
            $PDF->printTaggedLn(array('%c', $entry['description']), array('max-width' => 61, 'multiline' => true, 'break' => false));
            $unitname = 'name';
            if (isset($entry['quantity']) && $entry['quantity'] != 0) {
               if ($entry['quantity'] > 1) { $unitname = 'names'; }
               $PDF->SetX(94);
               $PDF->printTaggedLn(array('%c', ffloat($entry['quantity'])), array('max-width' => 16, 'multiline' => true, 'break' => false, 'align' => 'left'));
            }
            
            if (isset($entry['unit']) && $entry['unit']) {
               $PDF->SetX(111);
               $PDF->printTaggedLn(array('%c', $units[$entry['unit']][$unitname]), array('max-width' => 25, 'break' => false, 'align' => 'left'));
            }

            if (isset($entry['price']) && $entry['price'] != 0) {
               $PDF->SetX(136);
               $PDF->printTaggedLn(array('%c', fprice($entry['price'])), array('max-width' => 18, 'align' => 'right', 'multiline' => true, 'break' => false));
            }
            if (isset($entry['discount']) && $entry['discount'] != 0) {
               $PDF->SetX(160);
               $PDF->printTaggedLn(array('%c', $entry['discount'] . '%'), array('max-width' => 10, 'align' => 'right', 'multiline' => true, 'break' => false));
            }
            if (isset($entry['total']) && $entry['total'] != 0) {
               $PDF->printTaggedLn(array('%c', fprice(floatval($entry['total']))), array('multiline' => true, 'break' => false, 'align' => 'right'));
            }

            $PDF->br();
         }
      }
      $PDF->close_block();
   }
}
unset($PDF->left);
unset($PDF->right);
$PDF->br();
if ($has_null_entry && !$single) {
   $PDF->hr();
   $PDF->br();

   tableHead($PDF, $entries);

   $PDF->block('eNULL');
   $PDF->background_block('#EEEEEE');
   $previous = 'eNULL';
   $subtotal = 0;
   foreach ($entries as $entry) {
      if (is_null($entry['reservation'])) {
         if (!isset($entry['total'])) {
            $entry['total'] = floatval($entry['quantity']) * floatval($entry['price']);
         }

         $subtotal += $entry['total'];

         $PDF->printTaggedLn(array('%c', $entry['reference']), array('max-width' => 20, 'multiline' => true, 'break' => false));
         $PDF->SetX(30);
         $PDF->printTaggedLn(array('%c', $entry['description']), array('max-width' => 61, 'multiline' => true, 'break' => false));
         $unitname = 'name';
         if (isset($entry['quantity']) && $entry['quantity'] != 0) {
            if ($entry['quantity'] > 1) { $unitname = 'names'; }
            $PDF->SetX(94);
            $PDF->printTaggedLn(array('%c', ffloat($entry['quantity'])), array('max-width' => 16, 'multiline' => true, 'break' => false, 'align' => 'left'));
         }

         if (isset($entry['unit']) && $entry['unit']) {
            $PDF->SetX(111);
            $PDF->printTaggedLn(array('%c', $units[$entry['unit']][$unitname]), array('max-width' => 25, 'break' => false, 'align' => 'left'));
         }
         if (isset($entry['price']) && $entry['price'] != 0) {
            $PDF->SetX(136);
            $PDF->printTaggedLn(array('%c', fprice($entry['price'])), array('max-width' => 18, 'align' => 'right', 'multiline' => true, 'break' => false));
         }
         if (isset($entry['discount']) && $entry['discount'] != 0) {
            $PDF->SetX(160);
            $PDF->printTaggedLn(array('%c', $entry['discount'] . '%'), array('max-width' => 10, 'align' => 'right', 'multiline' => true, 'break' => false));
         }
         if (isset($entry['total']) && $entry['total'] != 0) {
            $PDF->printTaggedLn(array('%c', fprice(floatval($entry['total']))), array('multiline' => true, 'break' => false, 'align' => 'right'));
         }

         $PDF->br();
      }
   }
   $PDF->close_block();
   $PDF->br();
}


$PDF->hr();
$PDF->SetFontSize(6);
$PDF->printTaggedLn(array('%cb', 'Total HT'), array('break' => false));
$PDF->printTaggedLn(array('%cb', fprice($count['total'])), array('align' => 'right'));
$PDF->Output($count['id'] .  '.pdf', 'I'); 

$JClient->patch(array('id' => $count['id'], 'printed' => (new DateTime())->format('c')), $count['id'], 'Count');
?>
