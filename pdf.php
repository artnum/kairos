<?PHP


include('artnum/autoload.php');
class MyPDF extends artnum\PDF {
   function __construct() {
      parent::__construct();

      $this->SetMargins(20, 15, 10);
      $this->addTaggedFont('c', 'century-gothic', '', 'century-gothic.ttf', true);
      $this->addTaggedFont('cb', 'century-gothic-bold', '', 'century-gothic-bold.ttf', true);
      $this->addTaggedFont('a', 'fontawesome', '', 'fontawesome-webfont.ttf', true);
      $this->SetFont('century-gothic');
   }

   function Header() {
      $w = ($this->w / 2) - $this->lMargin;
      $this->Image('logo.png', $this->lMargin, $this->rMargin, $w);
   }

   function Footer() {
      $this->SetY(270);
      $this->setFontSize(2.6);
      $this->hr();
      $this->printTaggedLn(array('%c', 'Airnace SA, Route du Rhône 20, 1902 Evionnaz'));
      $this->printTaggedLn(array('%c', 'Téléphone: +41 27 767 30 38, Fax: +41 27 767 30 28'));
      $this->printTaggedLn(array('%c', 'Mail: info@airnace.ch, Site: https://airnace.ch'));
      $this->resetFontSize();
   }
}

function format_address($addr) {
   $lines = array();

   if($addr['type'] == 'db') {
      $addr = $addr['data'];
      if(isset($addr['o'])) {
         $lines[] = $addr['o'];
      }

      if(isset($addr['givenname']) || isset($addr['sn'])) {
         $cn = '';
         if(isset($addr['givenname'])) {
            $cn = $addr['givenname'];
         }
         if(isset($addr['sn'])) {
            if($cn != '') { $cn .= ' '; };
            $cn .= $addr['sn'];
         }
         
         $lines[] = $cn;
      }

      if(isset($addr['l']) || isset($addr['postalcode'])) {
         $locality = '';
         if(isset($addr['postalcode'])) {
            $locality = $addr['postalcode'];
         }
         if(isset($addr['l'])) {
            if($locality != '') { $locality .= ' '; }
            $locality .= $addr['l'];
         }
         
         $lines[] = $locality;
      }

      if(isset($addr['c'])) {
         switch(strtolower($addr['c'])) {
            default: case 'ch': break;
            case 'fr': $lines[] = 'France'; break;
            case 'uk': $lines[] = 'Angleterre'; break;
            case 'it': $lines[] = 'Italie'; break;
            case 'de': $lines[] = 'Allemagne'; break;
         }
      }
   } else {
      $l = explode("\n", $addr['data']['freeform']);
      foreach($l as $_l) {
         if(!empty(trim($_l))) {
            $lines[] = $_l;
         }
      }

   }

   return $lines;
}



$JClient = new artnum\JRestClient('http://localhost/location/store');
$Machine = new artnum\JRestClient('https://aircluster.local.airnace.ch/store', NULL, array('verifypeer' => false));

$res = $JClient->get($_GET['id'], 'Reservation');
if($res['type'] != 'results') {
   exit(0);
}
if(!isset($res['data'][0])) {
   exit(0);
}
$reservation = $res['data'][0];

if(!empty($reservation['deliveryBegin'])) {
   if($reservation['deliveryBegin'] != $reservation['begin']) {
      $reservation['deliveryBegin'] = new DateTime($reservation['deliveryBegin']);
   } else {
      $reservation['deliveryBegin'] = null;
   }
}

if(!empty($reservation['deliveryEnd'])) {
   if($reservation['deliveryEnd'] != $reservation['end']) {
      $reservation['deliveryEnd'] = new DateTime($reservation['deliveryEnd']);
   } else {
      $reservation['deliveryEnd'] = null;
   }
}
$reservation['begin'] = new DateTime($reservation['begin']);
$reservation['end'] = new DateTime($reservation['end']);
$reservation['created'] = new DateTime($reservation['created']);

$res = $Machine->search(array('search.description' => $reservation['target'], 'search.airaltref' => $reservation['target']), 'Machine'); 
$machine = null;
if($res['type'] == 'results') {
   $machine = $res['data'][0];
}


$client = null;
if(!empty($reservation['contact'])) {
   if($reservation['contact'][0] == ':') {
      $res = $JClient->get(substr($reservation['contact'], 1), 'ReservationContact');
      if($res['type'] == 'results') {
         $client = array('type' => 'freeform', 'data' => $res['data'][0]);
      }
   } else {
      $c = explode('/', $reservation['contact']);
      $res = $JClient->get($c[count($c) - 1], 'Contacts');
      if($res['type'] == 'results') {
         $client = array('type' => 'db', 'data' => $res['data'][0]);
      }
   }
}

$addrs = array('responsable' => null, 'facturation' => null);
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

if(!is_null($client)) {
   $client = format_address($client);
}

/* PDF Generation */
$PDF = new MyPDF();
$PDF->addVTab(24);
$PDF->addVTab(50);
$PDF->addVTab(85);
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
if(! is_null($client)) {
   $PDF->printLn(' pour ' . $client[0], array('break' => false));
}
$PDF->br();
$PDF->setFontSize(3.6);
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

if(!is_null($client)) {
   $PDF->vtab(2);
   $PDF->printTaggedLn(array('%cb', 'Client'), array('underline' => true));
   foreach($client as $c) {
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
   }  
} else {
   $PDF->vtab(2); 
   $PDF->squaredFrame(30, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'length' => 53));
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
   $PDF->squaredFrame(30, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'length' => 53));
}


$PDF->vtab(2);
$PDF->tab(4);
$PDF->squaredFrame(30, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true  ));

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
$PDF->squaredFrame(96, array('color' => '#DDD', 'line' => 0.1, 'border-color' => 'black', 'border-line' => 0.2, 'border' => true));

/* On the grid */
$PDF->vspace(2);
$PDF->setFontSize(5.6);
$PDF->printTaggedLn(array('%cb', $reservation['target'], ' - ' . $machine['cn']), array('underline' => true));
$PDF->resetFontSize();

$PDF->vspace(96);
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
   
   $PDF->printTaggedLn(array('%c', 'Équipement : ', '%cb', $txt));
}
$PDF->br();
$PDF->printTaggedLn(array('%a', '', '%c', ' Plein d\'essence effectué'), array('break' => false));
$PDF->tab(2);
$PDF->printTaggedLn(array('%a', '', '%c', ' Décompte intermédiaire'));
$PDF->hr();

$PDF->printTaggedLn(array('%c', 'Lieu et date : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, $PDF->getRemainingWidth() - 2, 0, 'dotted', array('color' => '#999') );
$PDF->br();
$PDF->printTaggedLn(array('%c', 'Signature : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, $PDF->getRemainingWidth() - 2, 0, 'dotted', array('color' => '#999') );
$PDF->br();

$PDF->Output(); 
?>
