<?php
include ('base.php');

class FullPlan extends artnum\PDF {
   function __construct($options = array()) {
      parent::__construct('L', 'mm', [594,841]);

      if (!isset($options['margins'])) {
         $this->SetMargins(12, 10, 12);
      } else {
         $this->SetMargins($options['margins'][0], $options['margins'][1], $options['margins'][2]);
      }
      $this->setBottomMargin(20);
      $this->addTaggedFont('c', 'dejavu', '', 'DejaVuSans.ttf', true);
      $this->addTaggedFont('cb', 'dejavu-bold', '', 'DejaVuSans-Bold.ttf', true);
      $this->addTaggedFont('a', 'fontawesome', '', 'fontawesome-webfont.ttf', true);
      $this->SetFont('helvetica');
   }
}

function array_find($array, $func) {
   foreach ($array as $item) {
      if ($func($item)) { return $item; }
   }
}

$pdf = new FullPlan();
if (!empty($_GET['begin'])) {
   $dayBegin = new DateTime($_GET['begin'], new DateTimeZone('UTC'));
} else {
   $dayBegin = new DateTime('now', new DateTimeZone('UTC'));
   $dayBegin->sub(new DateInterval('P2D'));
}

if (!empty($_GET['end'])) {
   $dayEnd = new DateTime($_GET['end'], new DateTimeZone('UTC'));

} else {
   $dayEnd = new DateTime('now', new DateTimeZone('UTC'));
   $dayEnd->add(new DateInterval('P13D'));
}

$dayBegin->setTime(0, 0, 0, 0);
$dayEnd->setTime(24, 0, 0, 0);

$BEGIN = new DateTime('now', new DateTimeZone('UTC'));
$BEGIN->setTimestamp($dayBegin->getTimestamp());
$END = new DateTime('now', new DateTimeZone('UTC'));
$END->setTimestamp($dayEnd->getTimestamp());

$daysNumber = floor(($END->getTimestamp() - $BEGIN->getTimestamp()) / 86400);

$dayBegin = explode('+', $BEGIN->format('c'))[0];
$dayEnd = explode('+', $END->format('c'))[0];

$kreservation = new KStore($KAppConf, 'kreservation', ['deleted' => '--'], $_GET['auth']);
$kentry = new KStore($KAppConf, 'kentry', [], $_GET['auth']);
$kuser = new KStore($KAppConf, 'kperson', [], $_GET['auth']);

$kaffaire = new KStore($KAppConf, 'kaffaire', [], $_GET['auth']);
$kproject = new KStore($KAppConf, 'kproject', [], $_GET['auth']);
$kstatus = new KStore($KAppConf, 'kstatus', [], $_GET['auth']);
$kalloc = new KStore($KAppConf, 'krallocation', [], $_GET['auth']);

$reservations = $kreservation->query([
   '#and' => [
       'begin' => ['<', $dayEnd],
       'end' => ['>', $dayBegin],
       'deleted' => '--',
   ]
]);

$users = $kuser->query([
   'disabled' => '0',
   'deleted' => '--',
   'order' => ['>', -1, 'int']
]);


uasort($users, function ($a, $b) {
   return intval($a->get('order')) - intval($b->get('order'));
});

$boxes = [];
for($i = 0; $i < count($users); $i++) {
   $subarray = [];
   for ($j = 0; $j < $daysNumber; $j++) {
      $subarray[] = [];
   }
   $boxes[$users[$i]->get('id')] = $subarray;
}

foreach($reservations as $reservation) {
   $begin = new DateTime($reservation->get('begin'));
   $end = new DateTime($reservation->get('end'));

   $start = floor(($begin->getTimestamp() - $BEGIN->getTimestamp()) / 86400);
   $end =$start + floor(($end->getTimestamp() - $begin->getTimestamp()) / 86400);
   if ($start < 0) { 
	   $start = 0; 
	   if ($end <= 0) { $reservation->set('-no-display', true); continue; }
   }
   if ($end > $daysNumber) { $end = $daysNumber; }
   for ($j = $start; $j <= $end; $j++) {
      $boxes[$reservation->get('target')][$j][] = $reservation;
   }
}

foreach ($boxes as $box) {
   $biggest = 0;
   $used = [];

   while (count($used) < count($box)) {
      foreach ($box as $k => $cell) {
         if (!is_array($cell)) { $used[] = $k; continue; }
         if (in_array($k, $used)) { continue; }
         if (!isset($box[$biggest])) { continue; }
         if (count($cell) > count($box[$biggest])) { $biggest = $k; }
      }
      $used[] = $biggest;
      $i = 0;
      if (!isset($box[$biggest])) { continue; }
      foreach ($box[$biggest] as $reservation) {
         if (!($reservation->get('overlap-count'))) {
            $reservation->set('overlap-count', count($box[$biggest]));
            $reservation->set('overlap-level', $i++);
         }
      }
   }
}

$dateFormater = new IntlDateFormatter(
   'fr_CH',  IntlDateFormatter::FULL,
   IntlDateFormatter::FULL,
   'UTC',
   IntlDateFormatter::GREGORIAN,
   'EEEE, dd MMMM y'
);

$dateFormaterSmall = new IntlDateFormatter(
   'fr_CH',  IntlDateFormatter::FULL,
   IntlDateFormatter::FULL,
   'UTC',
   IntlDateFormatter::GREGORIAN,
   'd.M'
);

define('HEADER_SPACE', 20);

$pdf->AddPage();
$pdf->setFontSize(5);
$pdf->setColor('black');
$end = new DateTime();
$end->setTimestamp($END->getTimestamp());
$end->setTime(-1, 0);
$pdf->printTaggedLn(['%cb', 'Planning du ' . $dateFormater->format($BEGIN) . ' au ' . $dateFormater->format($end)]);
$pdf->setAutoPageBreak(false, 20);
$margin = $pdf->getMargin();

define('VIEWPORT_HEIGHT', $pdf->GetPageHeight() - ($margin[0] + $margin[1]));
$height = VIEWPORT_HEIGHT - HEADER_SPACE;
define('WIDTH', $pdf->GetPageWidth() - ($margin[1] + $margin[3]));
define('LINE_HEIGHT', floor($height / count($users)));

for ($i = 0; $i < count($users); $i++) {
   $pdf->addVTab($i * LINE_HEIGHT + HEADER_SPACE);
}

$pdf->setFontSize(3);
$index = 0;
$maxX = 0;
foreach($users as $user) {
   $user->set('pdf-index', $index + 1);
   $pdf->vtab($user->get('pdf-index'));
   $pdf->printTaggedLn(['%cb', $user->get('name')], ['break' => false]);
   if ($pdf->GetX() > $maxX) { $maxX = $pdf->GetX(); }
   $pdf->br();
   $index++;
}
define('LINE_COLOR', '#dddddd');
define('DAY_VIEW_ORIGIN', $maxX + 5);
define('DAY_VIEW_WIDTH', WIDTH - DAY_VIEW_ORIGIN);
define('DAY_WIDTH', floor(DAY_VIEW_WIDTH / $daysNumber));
define('VIEWPORT_MAX_WIDTH', (DAY_WIDTH * $daysNumber) + DAY_VIEW_ORIGIN - $margin[3]);


/* ** END DRAW RESERVATION ** */

/* ** BEGIN LINES ** */
/* add 5 mm space before start of days */

$maxX = 0;
$date = new DateTime('now', new DateTimeZone('UTC'));
$date->setTimestamp($BEGIN->getTimestamp());
$date->setTime(-1, 0, 0);
$pdf->setColor('white');
for ($i = 0; $i < $daysNumber; $i++) {
   $pdf->SetFont('dejavu-bold');
   if (DAY_WIDTH < 16) {
      $pdf->setFontSize(2);
      $str = $dateFormaterSmall->format($date);
   } else {
      $str = $dateFormater->format($date);
      if (DAY_WIDTH < 46) {
         $pdf->setFontSize(2.6);
      }
   }
   $width = $pdf->GetStringWidth($str);

   $pdf->setColor('black', 'fill');
   $pdf->Rect((($i * DAY_WIDTH) + DAY_VIEW_ORIGIN), $margin[0] + 9, DAY_WIDTH, 6, 'F');
   
   $pdf->setXY((($i * DAY_WIDTH) + DAY_VIEW_ORIGIN) - ((DAY_WIDTH / 2) + ($width / 2)), 12 + $margin[0]);
   $pdf->Cell($width, 0, $str);
   
   $pdf->drawLine(($i * DAY_WIDTH) + DAY_VIEW_ORIGIN, $margin[0] + 7, VIEWPORT_HEIGHT, -90, 'line', ['color' => LINE_COLOR]);
   $date->setTimestamp($date->getTimestamp() + 86400);

}
if (DAY_WIDTH < 16) {
   $pdf->setFontSize(2);
   $str = $dateFormaterSmall->format($date);
} else {
   $str = $dateFormater->format($date);
}
$width = $pdf->GetStringWidth($str);
$pdf->setXY((($i * DAY_WIDTH) + DAY_VIEW_ORIGIN) - ((DAY_WIDTH / 2) + ($width / 2)), 12 + $margin[0]);
$pdf->Cell($width, 0, $str);

$pdf->drawLine(($i * DAY_WIDTH) + DAY_VIEW_ORIGIN, $margin[0] + 7, VIEWPORT_HEIGHT, -90, 'line', ['color' => LINE_COLOR]);

for ($i = 0; $i < count($users); $i++) {
   $pdf->vtab($i + 1);
   $pdf->drawLine($margin[3], $pdf->GetY() - 1, VIEWPORT_MAX_WIDTH, 0, 'line', ['color' => LINE_COLOR]);
}
/* draw last line below last entry */
$pdf->vtab($i);
$pdf->drawLine($margin[3], $pdf->GetY() + LINE_HEIGHT - 1, VIEWPORT_MAX_WIDTH, 0, 'line', ['color' => LINE_COLOR]);

/* ** END DRAW LINES ** */


/* ** BEGIN DRAW RESERVATION ** */
$pdf->setFontSize(2.2);

foreach ($reservations as $reservation) {
	if ($reservation->get('-no-display')) { continue; }	
   $begin = new DateTime($reservation->get('begin'));
   $end = new DateTime($reservation->get('end'));

   $origin = (round((($begin->getTimestamp() - $BEGIN->getTimestamp()) / 86400)) * DAY_WIDTH) + DAY_VIEW_ORIGIN; 
   if ($origin < DAY_VIEW_ORIGIN) { $origin = DAY_VIEW_ORIGIN; }

   $width = ceil((($end->getTimestamp() - $begin->getTimestamp()) / 86400)) * DAY_WIDTH - 1;
   if ($width + $origin >= VIEWPORT_MAX_WIDTH) {
      $width = VIEWPORT_MAX_WIDTH - $origin + $margin[1];
   }
   

   $currentUser = null;
   foreach ($users as $user) {
      if ($reservation->get('target') === $user->get('id')) { $currentUser = $user; break; }
   }
   if(!$currentUser) {  continue; }

   $pdf->vtab($currentUser->get('pdf-index'));
   $pdf->SetX($origin);

   $pdf->SetX(0);

   $affaire = $kaffaire->get($reservation->get('affaire'));
   if (!$affaire) { continue; }
   $project = $kproject->get($affaire->get('project'));
   if (!$project) { continue; }
   $status = $kstatus->get($reservation->get('status'));
   $color = null;
   if ($status) {
      $color = $status->get('color');
   }
   if (!$color) {
      $status = $kstatus->get($affaire->get('status'));
      if ($status) {
         $color = $status->get('color');
      }
   }
   if (!$color) { $color = 'gray'; }
   /*
   $pdf->drawLine($origin, $pdf->GetY(), $width, 0, 'line', ['color' => $color, 'width' => 0.5]);
   $pdf->drawLine($origin, $pdf->GetY() + 10, $width, 0, 'line', ['color' => $color, 'width' => 0.5]);
   */

   //$pdf->frame(LINE_HEIGHT - 2, ['length' => $width, 'color' => $color, 'x-origin' => $origin, 'y-origin' => $pdf->GetY(), 'width' => 1]);
   
   if (!$reservation->get('overlap-count')) {
      $reservation->set('overlap-count', 1);
      $reservation->set('overlap-level', 0);
   }

   $effectiveHeight = (LINE_HEIGHT - 2) / $reservation->get('overlap-count');
   $effectiveTop = $pdf->GetY() + ($effectiveHeight * $reservation->get('overlap-level'));

   $pdf->setColor('white', 'fill');
   $pdf->Rect($origin, $effectiveTop, $width, $effectiveHeight, 'FD');
   $pdf->setColor($color, 'fill');
   $pdf->Rect($origin, $effectiveTop + $effectiveHeight - 3.1, $width, 3, 'F');

   $pdf->setColor('black');

   $pdf->SetXY($origin, $effectiveTop + 2);
   $pdf->SetFont('dejavu-bold');
   $strWidth = $pdf->GetStringWidth($project->get('reference'));
   $pdf->Cell($width, 0, $project->get('reference'));
   $x = $pdf->GetX();
   $pdf->SetFont('dejavu');

   $pdf->SetXY($origin + $strWidth + 1, $effectiveTop + 1);
   $pdf->printTaggedLn(['%c', $project->get('name')], ['max-width' => $width - ($strWidth + 1) ]);
//   $pdf->Cell($width - $strWidth - 1, 0, ' ' . $project->get('name'));
   //$pdf->printTaggedLn(['%cb', $project->get('reference'), '%c', ' ' . $project->get('name')], ['max-width' => $width]);
   $pdf->SetXY($origin, $effectiveTop + 5);

   //$pdf->Cell($width, 0, $affaire->get('reference') . ' ' . $affaire->get('description'));
   $pdf->printTaggedLn(['%c', $affaire->get('reference') . ' ' . $affaire->get('description')], ['max-height' => 15,'max-width' => $width - 1, 'multiline' => true]);

   $pdf->vtab($currentUser->get('pdf-index'));
   if ($origin + $width > VIEWPORT_MAX_WIDTH) {
      $pdf->SetX(VIEWPORT_MAX_WIDTH);
   } else {
      $pdf->SetX($origin + $width);
   }
}







$pdf->Output('I', 'Plan.pdf', true); 
