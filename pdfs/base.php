<?PHP
include('artnum/autoload.php');

header('Cache-Control', 'no-cache, max-age=0');

class LocationPDF extends artnum\PDF {
   function __construct($options = array()) {
      parent::__construct();

      if (!isset($options['margins'])) {
         $this->SetMargins(20, 10, 10);
      } else {
         $this->SetMargins($options['margins'][0], $options['margins'][1], $options['margins'][2]);
      }
      $this->addTaggedFont('c', 'century-gothic', '', 'century-gothic.ttf', true);
      $this->addTaggedFont('cb', 'century-gothic-bold', '', 'century-gothic-bold.ttf', true);
      $this->addTaggedFont('a', 'fontawesome', '', 'fontawesome-webfont.ttf', true);
      $this->SetFont('century-gothic');
   }

   function Header() {
      $w = ($this->w / 2.4) - $this->lMargin;
      $this->Image('logo.png', $this->lMargin, $this->rMargin, $w);
      if(!empty($this->title)) {
         $this->setFontSize(10);
         $this->SetFont('century-gothic');
         $this->printLn('Mission', array( 'align' => 'right'));
         $this->resetFontSize();
      }
   }

   function Footer() {
      $this->SetY(280);
      $this->setFontSize(2.4);
      $this->hr();
      $this->printTaggedLn(array('%cb', 'Airnace SA', '%c', ', Route du Rhône 20, 1902 Evionnaz'), array('break' => false));
      $this->printTaggedLn(array('%c', ' | Téléphone: +41 27 767 30 38, Fax: +41 27 767 30 28'), array('break' => false));
      $this->printTaggedLn(array('%c', ' | info@airnace.ch | https://www.airnace.ch'));
      $this->resetFontSize();
   }
}

function format_address($addr, $options = array()) {
   $lines = array();

   if($addr['type'] == 'db') {
      $addr = $addr['data'];
      if(isset($addr['o'])) {
         if(is_string($addr['o'])) {
            $lines[] = $addr['o'];
         } else if(is_array($addr['o'])) {
            foreach($addr['o'] as $o) {
               $lines[] = $o;
            }
         }
      }

      if(isset($addr['givenname']) || isset($addr['sn'])) {
         $cn = '';
         if(isset($addr['givenname'])) {
            $cn = trim($addr['givenname']);
         }
         if(isset($addr['sn'])) {
            if($cn != '') { $cn .= ' '; };
            $cn .= trim($addr['sn']);
         }
         
         $lines[] = $cn;
      }

      if(isset($addr['l']) || isset($addr['postalcode'])) {
         $locality = '';
         if(isset($addr['postalcode'])) {
            $locality = trim($addr['postalcode']);
         }
         if(isset($addr['l'])) {
            if($locality != '') { $locality .= ' '; }
            $locality .= trim($addr['l']);
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

      if(isset($addr['mobile']) || isset($addr['telephonenumber'])) {
         if (!isset($options['prefer-telephone']) && !$options['prefer-telephone']) {
            $lines[] = isset($addr['mobile']) ?  trim($addr['mobile']) : trim($addr['telephonenumber']);
         } else {
            $lines[] = isset($addr['telephonenumber']) ?  trim($addr['telephonenumber']) : trim($addr['mobile']);
         }
      }
      if(isset($addr['mail'])) {
         $lines[] = trim($addr['mail']);
      }
   } else {
      $l = explode("\n", $addr['data']['freeform']);
      foreach($l as $_l) {
         if(!empty($_l)) {
            $lines[] = trim($_l);
         }
      }

   }

   return $lines;
}

?>
