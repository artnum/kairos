<?PHP
include('artnum/autoload.php');
include('../lib/format.php');
include('../lib/get-entry.php');
include('../lib/k/kstore.php');

header('Cache-Control: no-cache, max-age=0');


function dbHourToHour ($dbDT) {
   $hour = explode('T', $dbDT)[1];
   $hour = explode(':', $hour);
   return $hour[0] . ':' . $hour[1];
}

function decToHM ($dec) {
   $H = intval($dec);
   return str_pad(strval($H), 2, '0', STR_PAD_LEFT) . ':' .  str_pad(strval(round(($dec - $H) * 60)), 2, '0', STR_PAD_RIGHT);
}

$KAppConf = new KAppConf('../conf/app.json');

function e404($msg = 'aucun') {
   ob_end_clean();
   header('HTTP/1.1 404 Not Found');
   echo '<!DOCTYPE html><html><head><title>Inexistant</title></head><body><h1>Inexistant</h1><p>L\'entrée est incomplète ou inexistante</p><p>Détails : ' . $msg . '</p></body></html>';
   flush();
   exit(0);
}

class BlankLocationPDF extends artnum\PDF {
   function __construct($options = array()) {
      parent::__construct($options);

      if (!isset($options['margins'])) {
         $this->SetMargins(20, 10, 10);
      } else {
         $this->SetMargins($options['margins'][0], $options['margins'][1], $options['margins'][2]);
      }
      $this->addTaggedFont('c', 'dejavu', '', 'DejaVuSans.ttf', true);
      $this->addTaggedFont('cb', 'dejavu-bold', '', 'DejaVuSans-Bold.ttf', true);
      $this->addTaggedFont('a', 'fontawesome', '', 'fontawesome-webfont.ttf', true);
      $this->SetFont('helvetica');
   }
}

class LocationPDF extends BlankLocationPDF {
    protected $NoHeaderFooter = false;
    protected $EvenOnly = true;
  
    function __construct($options = array()) {
      parent::__construct($options);
      $this->NoHeaderFooter = false;
    }

    function DisableHeaderFooter() {
      $this->NoHeaderFooter = true;
    }
 
    function EnableHeaderFooter() {
      $this->NoHeaderFooter = true;
    }

    function SetHeaderFooterEvenOnly() {
      $this->EvenOnly = true;
    }
  
    function Header() {
      global $KAppConf;

      if ($this->NoHeaderFooter) { return; }
      if ($this->EvenOnly && $this->PageNo() % 2 === 0) { return; }
      $w = ($this->w / 2.4) - $this->lMargin;
      
      $logo = $KAppConf->get('company.logoFile');
      if ($logo) {
         $this->Image($logo, $this->lMargin, $this->rMargin, $w);
      }
      if(!empty($this->title)) {
         $this->setFontSize(10);
         $this->SetFont('helvetica');
         $this->printLn($this->title, array( 'align' => 'right'));
         $this->resetFontSize();
      }
      $this->SetY(30);
   }

   function Footer() {
      global $KAppConf;
      if ($this->NoHeaderFooter) { return; }
      if ($this->EvenOnly && $this->PageNo() % 2 === 0) { return; }
      $this->SetY(280);
      $this->setFontSize(2.4);
      $this->hr();
      $this->printTaggedLn(['%cb', $KAppConf->get('company.name') , '%c', ', ' . $KAppConf->get('company.street') . ', ' . $KAppConf->get('company.locality')]);
      $this->printTaggedLn(['%c', 'Téléphone: ' . $KAppConf->get('company.phone')], ['break' => false]);
      $this->printTaggedLn(['%c', ' | ' . $KAppConf->get('company.mail') . ' | '. $KAppConf->get('company.website')]);
      $this->resetFontSize();
   }
}

function getLocality ($JClient, $locality) {
   return $locality;
  /*if (empty($locality)) { return NULL; }

  if (preg_match('/PC\/[0-9a-f]{32,32}$/', $locality) || preg_match('/^Warehouse\/[a-zA-Z0-9]*$/', $locality)) {
    $l = explode('/', $locality);
    $res = $JClient->get($l[1], $l[0]);
    if ($res['success'] && $res['length'] === 1) {
      $entry = $res['data'];
      if (isset($entry['np'])) {
        return array('locality', "$entry[np] $entry[name] (" . strtoupper($entry['state']) . ")");
      } else {
        return array('warehouse', $entry['name']);
      }
    } else {
      return NULL;
    }
  } else {
    return array('raw', $locality);
  }*/
}

function format_address($addr, $options = array()) {
   $lines = array();

   if($addr['type'] == 'db' && is_array($addr['data'])) {
      $kaddr = new Kairos\KObject($addr['data']);

      if ($kaddr->has('o')) {
         $lines = array_merge($lines, $kaddr->getMultiString('o'));
      }

      if ($kaddr->hasAny('givenname', 'sn')) {$lines[] = trim(trim($kaddr->getString('givenname')) . ' ' . trim($kaddr->getString('sn'))); }
      if ($kaddr->has('postaladdress')) {
         foreach (explode("\n", $kaddr->getString('postaladdress')) as $line) {
            $lines[] = trim($line);
         }
      }

      if ($kaddr->hasAny('l', 'postalcode')) { $lines[] = trim(trim($kaddr->getString('postalcode') . ' ' . trim($kaddr->getString('l')))); }
      if ($kaddr->has('c')) {
         switch(strtolower($kaddr->getString('c'))) {
            default: case 'ch': break;
            case 'fr': $lines[] = 'France'; break;
            case 'uk': $lines[] = 'Angleterre'; break;
            case 'it': $lines[] = 'Italie'; break;
            case 'de': $lines[] = 'Allemagne'; break;
         }
      }

      if ($kaddr->hasAny('mobile', 'telephonnumber')) {
         if (!isset($options['prefer-telephone']) || !$options['prefer-telephone']) {
            $lines[] = $kaddr->has('mobile') ?  trim($kaddr->getString('mobile')) : trim($kaddr->getString('telephonenumber'));
         } else {
            $lines[] = $kaddr->has('telephonenumber') ?  trim($kaddr->getString('telephonenumber')) : trim($kaddr->getString('mobile'));
         }
      }

      if ($kaddr->has('mail')) { $lines[] = $kaddr->getString('mail'); }
   } else {
      foreach(explode("\n", $addr['data']) as $l) {
         if(!empty($l)) {
            $lines[] = trim($l);
         }
      }
   }

   return $lines;
}

function strFromArrayLimit($array, $thingy, $max) {
  $result = '';
  foreach ($array as $line) {
    if (strlen($result) + strlen($line) + strlen($thingy) > $max) {
      $line = preg_replace('/[\n\r\t\f]/', ' / ', $line);
      if ($result == '') {
        return substr($line, 0, $max - 4) . ' ...';
      } else {
        if (strlen($result) + strlen($thingy) < $max) {
          $result .= $thingy . substr($line, 0, $max - (strlen($result) + strlen($thingy)));
        }
        return $result;
      }
    } else {
      if ($result != '') {
        $result .= $thingy;
      }
      $result .= $line;
    }
  }
  return $result;
}

function phoneHumanize ($str) {
  return substr($str, 0, 3) . ' ' . substr($str, 3, 2) . ' ' . substr($str, 5, 3) . ' '  . substr($str, 8, 2) . ' ' . substr($str, 10);
}

?>
