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

$creator = null;
if (isset($reservation['creator']) && !empty($reservation['creator'])) {
  if (strpos($reservation['creator'], '/') !== FALSE) {
    $url = explode('/', sanitize_path($reservation['creator']), 2);
    $res = $JClient->get($url[1], $url[0]);
    if ($res['success'] && $res['length'] === 1) {
      $creator = $res['data'];
      $creator['phone'] = phoneHumanize($creator['phone']);
    }
  }
}
$technician = null;
if (isset($reservation['technician']) && !empty($reservation['technician'])) {
  if (strpos($reservation['technician'], '/') !== FALSE) {
    $url = explode('/', $reservation['technician'], 2);
    $res = $JClient->get($url[1], $url[0]);
    if ($res['success'] && $res['length'] === 1) {
      $technician = $res['data'];
      $technician['phone'] = phoneHumanize($technician['phone']);
    }
  }
}


$machine = $GEntry->getMachine($reservation['target']);

$addrs = array('client' => null, 'responsable' => null, 'place' => null);
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

/* to create a tempdir we create a tempfile unlink it, create a temp dir with it name */
$PDFDir = tempnam(sys_get_temp_dir(), 'pdf-dir-');
unlink($PDFDir);
mkdir($PDFDir);

/* PDF Generation */
$PDF = new LocationPDF();
$PDF->addVTab(21);
$PDF->addVTab(50);
$PDF->addVTab(88);
$PDF->addVTab(240);
$PDF->addVTab(244);
$PDF->addVTab(40, 'collab');
$PDF->addTab('right', 'right');
$PDF->addTab('middle');
$PDF->addTab(62);
$PDF->addTab(123);
$PDF->addTab(40);

$PDF->AddPage();
$PDF->SetFont('century-gothic');
$PDF->setFontSize(2);
$PDF->tab(1);
$PDF->setFontSize(5);

$PDF->setY($PDF->getMargin('t'));
$PDF->printTaggedLn(array('Location ', $reservation['id'], '%cb'), array('align' => 'right')); 

$PDF->vtab(1);

$PDF->hr();
$PDF->printTaggedLn(array('%cb', $machine['cn']), array('break' => false));
if(! is_null($addrs['client'])) {
   $PDF->printTaggedLn(array('%c', ' pour ', '%cb', $addrs['client'][0]), array('break' => false));
}
$PDF->br();
$PDF->hr();
$PDF->SetFont('century-gothic');
$PDF->setFontSize(3.6);

$PDF->vtab('collab');
$PDF->block('collaborateur');
$PDF->printTaggedLn(array('%c', 'Collaborateur : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 36, 0, 'dotted', array('color' => '#999') );
$PDF->SetX(90);
$PDF->printTaggedLn(array('%c', 'Véhicule : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 28 , 0, 'dotted', array('color' => '#999') );
$PDF->SetX(144);
$PDF->printTaggedLn(array('%c', 'Resp. Ch. : '), array('break' => false));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 36 , 0, 'dotted', array('color' => '#999') );
$PDF->br();
$PDF->br();
$PDF->close_block();

$PDF->setFontSize(3.2);

$PDF->block('addresse', 'collaborateur');
$stopY = $PDF->GetY();
$PDF->printTaggedLn(array('%cb', 'Client'), array('underline' => true));
if(!is_null($addrs['client'])) {
   foreach($addrs['client'] as $c) {
      $PDF->printTaggedLn(array('%c', $c), array('max-width' => 50));
   }  
} else {
   $PDF->squaredFrame(36, array('color' => '#999', 'line' => 0.1, 'lined' => true, 'x-origin' => $PDF->GetX(), 'line-type' => 'dotted', 'skip' => true, 'length' => 53, 'square' => 6));
   if($stopY < 36 + $PDF->GetY()) { $stopY = 36 + $PDF->GetY(); }
}

if($PDF->GetY() > $stopY) { $stopY = $PDF->GetY(); }

$PDF->block('addresse');
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
   if($stopY < 36 + $PDF->GetY()) { $stopY = 36 + $PDF->GetY(); }
}

$PDF->block('addresse');
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
   if($stopY < 36 + $PDF->GetY()) { $stopY = 36 + $PDF->GetY(); }
}
if($PDF->GetY() > $stopY) { $stopY = $PDF->GetY(); }

$PDF->close_block();

$PDF->hr();
$PDF->SetFontSize(3.4);
if(!empty($reservation['reference'])) {
   $PDF->printTaggedLn(array('%c', 'Référence : ', '%cb', $reservation['reference']));
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
  }
}

$txt = 'Début location : date ';
if(is_null($reservation['deliveryBegin'])) {
   $txt =  'Rendez-vous : date ';
} else {
      $PDF->printTaggedLn(array(
               '%c', 'Rendez-vous : date ', '%cb',
               $reservation['deliveryBegin']->format('d.m.Y'), '%c', ' / heure ', '%cb' ,
               $reservation['deliveryBegin']->format('H:i')
               ),
            array('break' => true));
}
$PDF->printTaggedLn(array( '%c', 
         $txt, '%cb', 
         $reservation['begin']->format('d.m.Y'), '%c', ' / heure ', '%cb', $reservation['begin']->format('H:i'), 
         '%c'),
      array('break' => false));
$PDF->SetX(120);
$PDF->printTaggedLn(array( '%c', 
    'Fin prévue : date : ', '%cb', 
    $reservation['end']->format('d.m.Y'), '%c', ' / heure ', '%cb', $reservation['end']->format('H:i'), 
    '%c'),
array('break' => true));
if (!empty($reservation['padlock'])) {
  $PDF->printTaggedLn(array('%c', 'Code du cadenas : ', '%cb', $reservation['padlock']));
}
if (!is_null($creator)) {
  $PDF->printTaggedLn(array('%c', 'Responsable Airnace : ', '%cb', $creator['name'], ' / ' . $creator['phone']));
}
if (!is_null($technician)) {
  $PDF->printTaggedLn(array('%c', 'Technicien Airnace : ', '%cb', $technician['name'], ' / ' . $technician['phone']));
}
$PDF->br();
$PDF->hr();
$PDF->br();

$PDF->printTaggedLn(array('%cb', 'Machine'), array('underline' => true));
$PDF->printTaggedLn(array('%c', $reservation['target'], ' - ' . $machine['cn']));
$PDF->br();

if(isset($reservation['equipment']) || ( is_array($reservation['complements']) && count($reservation['complements']) > 0)) {
   $remSize = 68;
   $col = array( 'c' => 18, 'q' => 4,  'd' => 32, 'r' => $remSize, 'l' => 0);

   $PDF->printTaggedLn(array('%cb', 'Complément'), array('underline' => true, 'break' => false)); $col['c'] += $PDF->GetX();  $PDF->SetX($col['c']);
   $PDF->printTaggedLn(array('%cb', 'Remarque'), array('underline' => true, 'break' => false)); $col['r'] += $PDF->GetX(); $PDF->SetX($col['r']);
   $PDF->printTaggedLn(array('%cb', 'Quantité'), array('underline' => true, 'break' => false)); $col['q'] += $PDF->GetX(); $PDF->SetX($col['q']);
   $PDF->printTaggedLn(array('%cb', 'Durée'), array('underline' => true, 'break' => false)); $col['d'] += $PDF->GetX(); $PDF->SetX($col['d']);
   $PDF->printTaggedLn(array('%cb', 'Chargé'), array('underline' => true, 'break' => false, 'align' => 'right')); $col['l'] = $PDF->GetX() - ceil($PDF->GetStringWidth('Chargé') / 2);
   $PDF->br();
}

if( is_array($reservation['complements']) && count($reservation['complements']) > 0) {
   $PDF->br();
   $PDF->SetFontSize(3);
   $association = array();
   foreach($reservation['complements'] as $complement) {
      if(isset($association[$complement['type']['name']])) {
         $association[$complement['type']['name']][] = $complement;
      } else {
         $association[$complement['type']['name']] = array($complement);
      }
   }

   $origin = $PDF->GetX();
   $i = 0;
  foreach($association as $k => $v) {
      $startY = $PDF->GetY();
      $stopY = $startY;
      $first = true;
      $PDF->block("b$i");
      foreach($v as $data) {
        $i++;
      
         if(!$first) {
            if($stopY == $startY) {
               $PDF->br();
               $startY = $PDF->GetY();
               $stopY = $startY;
            } else {
               $PDF->SetY($stopY);
               $startY = $stopY;
            }
         }
         $font = '%c';
         $bgcolor = '#FFFFFF';
         $color = '#000000';
         if (isset($data['type']) && isset($data['type']['id']) && $data['type']['id'] == 4) {
           $font ='%cb';
           $color = '#FFFFFF';
           $bgcolor = '#000000';
         }
         $PDF->SetColor($color, 'text');
         $PDF->background_block($bgcolor);
         $PDF->printTaggedLn(array($font, $k ), array('break' => false)); $PDF->SetX($col['c']);
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
            $PDF->printTaggedLn(array($font, $c)); $PDF->SetX($col['c']);
         }
         $PDF->SetY($startY);

         $PDF->SetX($col['r']);      
         $PDF->printTaggedLn(array($font, $data['number']), array('break' => false)); $PDF->SetX($col['q']);

         if( ! (int)$data['follow']) {
            $begin = new DateTime($data['begin']) ;
            $begin->setTimezone(new DateTimeZone(date_default_timezone_get()));
            $end = new DateTime($data['end']);
            $end->setTimezone(new DateTimeZone(date_default_timezone_get()));
            $PDF->printTaggedLn(array( $font, 'du ', $begin->format('d.m.Y H:i'))); $PDF->SetX($col['q']);
            $PDF->printTaggedLn(array($font, 'au ',  $end->format('d.m.Y H:i')), array('break' => false));$PDF->SetX($col['d']);
            if($stopY < $PDF->GetY()) { $stopY = $PDF->GetY(); } $PDF->SetY($startY);
         } else {
            $PDF->printTaggedLn(array($font, 'toute la location'), array('break' => false)); $PDF->SetX($col['d']);
         }
         $PDF->SetX(194);
         $PDF->printTaggedLn(array('%a', ''), array('break' => false));

         $first = false;
      }
      $PDF->SetY($stopY);
      $PDF->close_block();

   }
}

if(isset($reservation['equipment'])) {
  $noequ = false;
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
      $XPos = ceil($PDF->GetX() / 4) * 4;
      foreach($equipment as $e) {
        if ($e === '%') { $noequ = true; continue; }
        $noequ = false;
         $PDF->SetX($XPos);
         $PDF->printTaggedLn(array('%c', $e), array('break' => false));

         $PDF->drawLine($PDF->GetX() + 3, $PDF->GetY() + $PDF->GetFontSize(), 180 - $PDF->GetX()  , 0, 'dotted', array('color' => 'gray') );

         $PDF->SetX(194);
         $PDF->printTaggedLn(array('%a', ''), array('break' => false));
         $PDF->br();
      }
      $PDF->br();
   }
   if (!$noequ) {
    $PDF->br();
   }
}
$PDF->resetFontSize();

if($reservation['comment']) {
  $PDF->hr();
  $PDF->printTaggedLn(array('%cb', 'Remarque'), array('underline'=>true));
  
  foreach(preg_split('/(\n|\r|\r\n|\n\r)/', $reservation['comment']) as $line) {
    $PDF->printTaggedLn(array('%c', $line), array('multiline' => true));
  }
  $PDF->br();
  $PDF->hr();
  $PDF->br();
} else {
  $PDF->hr();
}

$PDF->printTaggedLn(array('%cb', 'À compléter'), array('underline'=>true));

$PDF->SetX(180);
$PDF->printTaggedLn(['%c', 'Oui'], ['break' => false]);
$PDF->SetX(190);
$PDF->printTaggedLn(['%c', 'Non']);

foreach([
    '- Chargement complet (selon la liste)',
    '- Pleins effectués (machine et véhicule)',
    '- Machine en ordre'
  ] as $line) {
  $PDF->printTaggedLn(['%c', $line], ['break' => false]);
  $PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.4, 180 - $PDF->GetX(), 0, 'dotted', array('color' => '#999') );
  $PDF->SetX(182);
  $PDF->printTaggedLn(array('%a', ''), ['break' => false]);
  $PDF->SetX(192);
  $PDF->printTaggedLn(array('%a', ''), ['break' => false]);
  $PDF->br();
}

$PDF->br();
$PDF->printTaggedLn(array('%c', '- Remarques particulières'));
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 180, 0, 'dotted', array('color' => '#999') );
$PDF->br();
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 180, 0, 'dotted', array('color' => '#999') );
$PDF->br();
$PDF->br();
$PDF->printTaggedLn(['%cb', 'Signature collaborateur : '], ['break' => false]);
$PDF->drawLine($PDF->GetX() + 2, $PDF->GetY() + 3.8, 139, 0, 'dotted', array('color' => '#999') );
$PDF->br();

$YPos = $PDF->GetY();


$ini_conf = parse_ini_file('../conf/location.ini', true);
if (!isset($ini_conf['pictures'])) {
  $ini_conf['pictures'];
}
if (!isset($ini_conf['pictures']['storage'])) {
  $ini_conf['pictures']['storage'] = '../private/pictures';
}
$uploadDir = $ini_conf['pictures']['storage'];

/* Load images */
$files = array();
$res = $JClient->search(array('search.reservation' => $reservation['id']), 'Mission');
if ($res['success'] && $res['length'] > 0) {
  $mission = $res['data'][0]['uid'];
  $images = $JClient->search(array('search.mission' => $mission), 'MissionFichier');
  if ($images['success'] && $images['length'] > 0) {
    $array = $images['data'];
    usort($array, function ($a, $b) { return intval($a['ordre']) - intval($b['ordre']); });
    foreach($array as $image) {
      $image['disposition'] = 'full';
      $dir = substr($image['fichier'], 0, 2);
      if (is_dir($uploadDir . '/' . $dir)) {
        $dir .= '/' . substr($image['fichier'], 2, 2);
        if (is_dir($uploadDir . '/' . $dir)) {
          $file = $uploadDir . '/' . $dir . '/' . $image['fichier'];
          if (is_readable($file)) {
            $image['fichier'] = $file;
            $files[] = $image;
          }
        }
      }
    }
  }
}

$dpi = 300;
/* mm */
$cmWidth = 200;
$cmHeight = 287;
define('INCH', 25.4);

$unlink_files = array();
$PDF->DisableHeaderFooter();
if (count($files) > 0) {
  $PDF->AddPage();
}

$count = 0;
$PDF->Output('F', sprintf('%s/%05d.pdf', $PDFDir, $count), true);
$PDFUniteList = array(escapeshellarg(sprintf('%s/%05d.pdf', $PDFDir, $count)));

$dispfile = array('full' => array(), 'quarter' => array());
foreach ($files as $file) {
  switch (strtolower($file['disposition'])) {
    default: case 'fullpage':
      $dispfile['full'][] = $file;
      break;
    case 'quarter':
      $dispfile['quarter'][] = $file;
      break;
  }
}

$DispositionSizes = array(
                                                                            /* x, y */
  'full' => array('width' => 200, 'height' => 287, 'positions' => array(array(5, 5))),
  'quarter' => array('width' => 99, 'height' => 140, 'positions' => array(array(5, 5),
                                                                          array(101, 5),
                                                                          array(5, 146),
                                                                          array(101, 146)))
);

$PDF = null;
$count = 1;
foreach (array('full', 'quarter') as $dispo) {
  $posCount = -1;
  $addPage = false;
  foreach ($dispfile[$dispo] as $file) {
    $img = $file['fichier'];
    $cmWidth = $DispositionSizes[$dispo]['width'];
    $cmHeight = $DispositionSizes[$dispo]['height'];

    if ($posCount === -1 || $posCount + 1 >= count($DispositionSizes[$dispo]['positions'])) {
      $posCount = 0;
      if ($PDF !== null) {
        $PDF->Output('F', sprintf('%s/%05d.pdf', $PDFDir, $count), true);
        $PDFUniteList[] = escapeshellarg(sprintf('%s/%05d.pdf', $PDFDir, $count));
      }
      $PDF = new LocationPDF();
      $PDF->DisableHeaderFooter();
      $PDF->AddPage();
      $count++;
    } else {
      $posCount++;
    }
    
    $position = $DispositionSizes[$dispo]['positions'][$posCount];
    $type = mime_content_type($img);
    $gd = null;
    switch ($type) {
      case 'image/png':
        $gd = imagecreatefrompng($img);
        break;
      case 'image/jpeg':
        $gd = imagecreatefromjpeg($img);
        break;
      case 'image/gif':
        $gd = imagecreatefromgif($img);
        break;
      case 'image/bmp':
      case 'image/x-ms-bmp':
        $jpegfile = tempnam(sys_get_temp_dir(), 'image');
        exec(sprintf('convert %s %s', escapeshellarg($img), escapeshellarg($jpegfile . '.jpeg')));
        $gd = imagecreatefromjpeg($jpegfile . '.jpeg');
        unlink($jpegfile . '.jpeg');
        break;
      case 'application/pdf':
        $PDF = null;
        $gd = null;
        $posCount = -1;
        $retval = 0;
        $output = null;
        exec(sprintf('pdfinfo %s', escapeshellarg($img)), $output, $retval);
        if (intval($retval) === 0) {
          symlink($img, sprintf('%s/%05d.pdf', $PDFDir, $count));
          $PDFUniteList[] = escapeshellarg(sprintf('%s/%05d.pdf', $PDFDir, $count));
        }
        break;
    }
    if (!is_null($gd)) {
      $endWidth = round(($cmWidth / INCH) * $dpi);
      $endHeight = round(($cmHeight / INCH) * $dpi); 
      $outfile = tempnam(sys_get_temp_dir(), 'image');

      if (imagesx($gd) > imagesy($gd)) {
        $gdx = imagerotate($gd, 90, 0);
        imagedestroy($gd);
        $gd = $gdx;
      }

      $ra = imagesx($gd) / imagesy($gd);
      if ($endHeight * $ra > $endWidth) {
        $endWidth = round(($cmWidth / INCH) * $dpi);
        $endHeight = $endWidth / $ra;
      } else if ($endWidth / $ra > $endHeight) {
        $endHeight = round(($cmHeight / INCH) * $dpi);
        $endWidth = $endHeight * $ra;
      } else {
        $endHeight = round((($cmHeight / INCH) * $dpi) / $ra);
        $endWidth = round((($cmWidth / INCH) * $dpi) * $ra);
      }
      
      $gd2 = imagecreatetruecolor($endWidth, $endHeight);
      imagecopyresampled($gd2, $gd, 0, 0, 0, 0, $endWidth, $endHeight, imagesx($gd), imagesy($gd));
      imagedestroy($gd);

      $result = imagejpeg($gd2, $outfile);
      imagedestroy($gd2);
      if ($result && is_readable($outfile)) {
        $endMmWidth = round($endWidth / $dpi * INCH);
        $endMmHeight = round($endHeight / $dpi * INCH);
        $left = abs(round(($cmWidth - $endMmWidth)) / 2) + $position[0];
        $top = abs(round(($cmHeight - $endMmHeight) / 2)) + $position[1];
        $PDF->Image($outfile, $left, $top, $endMmWidth, $endMmHeight, 'JPEG');
      }
      if (is_readable($outfile)) {
        $unlink_files[] = $outfile;
      }
    }
  }
}
if ($PDF !== null) {
  $PDF->Output('F', sprintf('%s/%05d.pdf', $PDFDir, $count), true);
  $PDFUniteList[] = escapeshellarg(sprintf('%s/%05d.pdf', $PDFDir, $count));
}

if (count($PDFUniteList) > 1) {
  exec(sprintf('pdfunite %s %s/out.pdf', implode(' ', $PDFUniteList), escapeshellarg($PDFDir)));
} else {
  rename(sprintf('%s/00000.pdf', $PDFDir), sprintf('%s/out.pdf', $PDFDir));
}

header('Content-Type: application/pdf');
if(is_null($addrs['client'])) {
  header('Content-Disposition: inline; filename="' . $reservation['id'] .  '.pdf"');
} else {
  header('Content-Disposition: inline; filename="' . $reservation['id'] . ' @ ' . $addrs['client'][0] . '.pdf"', 'I'); 
}
header(sprintf('Content-Length: %d', filesize(sprintf('%s/out.pdf', $PDFDir))));
readfile(sprintf('%s/out.pdf', $PDFDir));

if (($dh = opendir($PDFDir))) {
  while (($f = readdir($dh)) !== FALSE) {
    if ($f === '.' || $f === '..') { continue; }
    unlink(sprintf('%s/%s', $PDFDir, $f));
  }
}
rmdir($PDFDir);
foreach($unlink_files as $f) {
  unlink($f);
}
?>
