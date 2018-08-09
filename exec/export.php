<?PHP
require('PHP_XLSXWriter/xlsxwriter.class.php');
require('artnum/autoload.php');

function formatContact ($cust) {
   $c = array();
   if (!empty($cust['o'])) {
      if (is_array($cust['o'])) {
         foreach($cust['o'] as $o) {
            $c[] = $o;
         }
      } else {
         $c[] = $cust['o'];
      }
   }
   if (!empty($cust['sn']) || !empty($cust['givenname'])) {
      $x = '';
      if (!empty($cust['givenname'])) {
         $x .= $cust['givenname'];
      }
      if (!empty($cust['cn'])) {
         if ($x != '') {  $x .= ' '; }
         $x .= $cust['cn'];
      }
      $c[] = $x;
   }

   if (!empty($cust['c']) || !empty($cust['l']) || !empty($cust['postalcode'])) {
      $x = '';
      if (!empty($cust['c'])) {
         $x .= $cust['c'];
      }
      if (!empty($cust['postalcode'])) {
         if ($x != '') {  $x .= ' '; }
         $x .= $cust['postalcode'];
      }
      if (!empty($cust['l'])) {
         if ($x != '') {  $x .= ' '; }
         $x .= $cust['l'];
      }
      $c[] = $x;
   }

   foreach (array(
      'telephonenumber' => 'Tel',
      'mobile' => 'Mobile',
      'mail' => 'Mail') as $k => $v) {
      if (isset($cust[$k])) {
         if (is_array($cust[$k])) {
            foreach ($cust[$k] as $_v) {
               $c[] = $v . ': ' . $_v;
            }
         } else {
            $c[] = $v . ': ' . $cust[$k]; 
         }
      }
   }

   return join("\n", $c);
}

$Machines = array();

$JRCLocation = new artnum\JRestClient('https://airserve01.local.airnace.ch/location/store/', null, array('verifypeer' => false));
$JRCMachine = new artnum\JRestClient('https://aircluster.local.airnace.ch/store/', 'Machine', array('verifypeer' => false));

//$entries = $JRCLocation->search(array('search.id' => '>4300'), 'DeepReservation')['data'];
$entries = $JRCLocation->search(array('search.deleted' => '-'), 'DeepReservation')['data'];

uasort($entries, function ($a, $b) {
   if ($a['target'] == $b['target']) { return 0; }
   return ($a['target'] < $b['target']) ? -1 : 1; 
});

$RHeader = array(
   'Numéro' => 'integer', 
   'Début' => 'date', 
   ' ' => 'string',
   'Fin' => 'date', 
   '  ' => 'string', 
   'L Début' => 'date',
   '   ' => 'string', 
   'L Fin' => 'date',
   '    ' => 'string', 
   'Ref' => 'integer',
   'Machine' => 'string',
   'Adresse' => 'string',
   'Localité' => 'string',
   'Référence' => 'string',
   'Relation' => 'string',
   'Client' => 'string',
   'Sur place' => 'string',
   'Responsable' => 'string',
   'Facturation' => 'string');

$writer = new XLSXWriter();
$writer->writeSheetHeader('Réservations Actives', $RHeader, array('auto_filter' => true, 'widths' => [10, 12, 10, 12, 10, 12, 10, 12, 10, 8, 25, 25, 25, 25, 12, 36, 36, 36, 36]));
foreach ($entries as $entry) {
   if (empty($entry['target'])) {
      continue;
   }

   if ((isset($entry['return']) && !empty($entry['return']['done'])) || intval($entry['special'] & 0x1)) {
      continue;
   }

   $today = false;
   $begin = !empty($entry['deliveryBegin']) ?
      (new DateTime($entry['deliveryBegin']))->format('Y-m-d') : 
      (new DateTime($entry['begin']))->format('Y-m-d');
   $end = !empty($entry['deliveryEnd']) ? 
      (new DateTime($entry['deliveryEnd']))->format('Y-m-d') : 
      (new DateTime($entry['end']))->format('Y-m-d');
   $now = (new DateTime('now'))->format('Y-m-d');

   if ($now == $end || $now == $begin) {
      $today = true;
   }

   foreach (array('begin', 'end', 'deliveryBegin', 'deliveryEnd', 'created', 'deleted', 'closed', 'modification') as $attr) {
      if (!empty($entry[$attr])) {
         $entry[$attr . '_date'] = (new DateTime($entry[$attr]))->format('Y-m-d');
         $entry[$attr . '_time'] = (new DateTime($entry[$attr]))->format('H:i');
      } else {
         $entry[$attr . '_date'] = '';
         $entry[$attr . '_time'] = '';
      }
   }

   if (!isset($Machine[$entry['target']])) {
      $machines = $JRCMachine->search(array('search.description' => $entry['target'], 'search.airaltref' => $entry['target']));

      if ($machines && count($machines['data']) > 0) {
         foreach ($machines['data'] as $machine) {
            $Machines[$machine['description']] = $machine['cn'];
           /* if (isset($machine['airaltref'])) {
               foreach ($machine['airaltref'] as $altref) {
                  $Machines[$altref] = $machine['cn'];
               }
            }*/
         }
      }
   }
   $machine = '';
   if (isset($Machines[$entry['target']])) {
      $machine = $Machines[$entry['target']];
   }

   foreach (array('_client', '_place', '_responsable', '_facturation') as $c) {
      if (isset($entry['contacts']) && isset($entry['contacts'][$c])) {
         if (!empty($entry['contacts'][$c][0]['freeform'])) {
            $entry[$c] = $entry['contacts'][$c][0]['freeform'];
         } else {
            $entry[$c] = formatContact($entry['contacts'][$c][0]['target']);
         }
      } else {
         $entry[$c] = '';
      }
   }

   $br = 1;

   foreach (array('address', 'locality', 'creator', '_client', '_place', '_responsable', '_facturation') as $attr) {
      $entry[$attr] = trim($entry[$attr]);
      $n = count(explode("\n", $entry[$attr]));
      if ($n >= $br) {
         $br = $n;
      }
   }

   $style = array('height' => 14 * $br, 'valign' => 'top', 'border' => 'top,bottom,left,right', 'border-style' => 'thin');
   if ($today) {
      $style['fill'] = '#ddd';
   }

   $writer->writeSheetRow('Réservations Actives', array(
      $entry['id'], 
      $entry['begin_date'], 
      $entry['begin_time'], 
      $entry['end_date'], 
      $entry['end_time'], 
      $entry['deliveryBegin_date'],
      $entry['deliveryBegin_time'],
      $entry['deliveryEnd_date'],
      $entry['deliveryEnd_time'],
      $entry['target'],
      $machine,
      $entry['address'],
      $entry['locality'],
      $entry['reference'],
      $entry['creator'], 
      $entry['_client'],
      $entry['_place'],
      $entry['_responsable'],
      $entry['_facturation']
   ), $style);

   set_time_limit(30);
}

header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
$path = './reservations.xlsx';
if (getenv('LOCATION_EXPORT_PATH')) {
   if (is_file(getenv('LOCATION_EXPORT_PATH')) && is_writable(getenv('LOCATION_EXPORT_PATH'))) {
      $path = getenv('LOCATION_EXPORT_PATH');
   }
}

$writer->writeToFile($path);
?>
