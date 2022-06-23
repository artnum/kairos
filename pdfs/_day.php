<?php

include('base.php');
global $KAppConf;

function drawHeaders ($pdf) {
    $i = 1;
    $pdf->block('header');
    $tableStart = $pdf->get_block_origin();
    $pdf->drawLine($pdf->getMargin('L'), $tableStart, $pdf->getDimension('W') - $pdf->getMargin('L') - $pdf->getMargin('R'), 0, 'line', ['color' => '#c4007a']);

    $pdf->background_block('#c4007a');
    $pdf->setColor('white');
    foreach (['Chantier', 'Processus', 'Ouvrier', 'Remarque', 'Véhicule', 'Caisse'] as $header) {
        $pdf->printTaggedLn(['%cb', $header]);
        $pdf->to_block_begin();
        $pdf->tab($i++);
    }
    $pdf->close_block();
    return $tableStart;
}

function drawTable ($pdf, $tableStart) {
    $tableStop = $pdf->getY();

    $pdf->drawLine($pdf->getMargin('L'), $tableStart, $tableStop - $tableStart, -90, 'line', ['color' => '#c4007a']);
    /*
    $pdf->drawLine(62.5, $tableStart, $tableStop - $tableStart, -90, 'dotted', ['color' => '#c4007a']);
    $pdf->drawLine(82.5, $tableStart, $tableStop - $tableStart, -90, 'dotted', ['color' => '#c4007a']);
    $pdf->drawLine(112.5, $tableStart, $tableStop - $tableStart, -90, 'dotted', ['color' => '#c4007a']);
    $pdf->drawLine(152.5, $tableStart, $tableStop - $tableStart, -90, 'dotted', ['color' => '#c4007a']);
    $pdf->drawLine(171.5, $tableStart, $tableStop - $tableStart, -90, 'dotted', ['color' => '#c4007a']);
    */
    $pdf->drawLine($pdf->getMargin('L'), $tableStop, $pdf->getDimension('W') - $pdf->getMargin('L') - $pdf->getMargin('R'), 0, 'line', ['color' => '#c4007a']);
    $pdf->drawLine($pdf->getDimension('W') - $pdf->getMargin('L'), $tableStart, $tableStop - $tableStart, -90, 'line', ['color' => '#c4007a']);
}

$kreservation = new KStore($KAppConf, 'kreservation', ['deleted' => '--']);
$kentry = new KStore($KAppConf, 'kentry');
$kaffaire = new KStore($KAppConf, 'kaffaire');
$kproject = new KStore($KAppConf, 'kproject');
$kstatus = new KStore($KAppConf, 'kstatus');

$day = $_GET['id'];
$dayBegin = new DateTime($_GET['id']);
$dayEnd = new DateTime($_GET['id']);

$weekDay = $dayBegin->format('w');

$dayBegin->setTime(0, 0, 0, 0);
$dayEnd->setTime(24, 0, 0, 0);


$dayBegin = explode('+', $dayBegin->format('c'))[0];
$dayEnd = explode('+', $dayEnd->format('c'))[0];

$kobjects = $kreservation->query([
    '#and' => [
        'begin' => ['<', $dayEnd],
        'end' => ['>', $dayBegin]        
    ]
]);


$atEnd = [];
$byProjects = [];

foreach($kobjects as $kobject) {
    $affaire = $kaffaire->get($kobject->get('affaire'));
    $status = $kobject->get('status');
    if (!$affaire)  { continue; }
    if (!$status) { $status = $affaire->get('status'); }
    if (!$kobject->get('status') && $status) { $kobject->set('status', $status); }
    $project = $kproject->get($affaire->get('project'));
    if (!$project) { continue; }

    if (intval($status) === 5) {
        if (!isset($atEnd[$project->get('id') . $status])) {
            $atEnd[$project->get('id') . $status] = [];
        }
    
        $atEnd[$project->get('id') . $status][] = $kobject;
        continue;
    }

    if (!isset($byProjects[$project->get('id') . $status])) {
        $byProjects[$project->get('id') . $status] = [];
    }

    $byProjects[$project->get('id') . $status][] = $kobject;
}

foreach ($byProjects as &$byProject) {
    uasort($byProject, function ($a, $b) {
        return intval((new DateTime($a->get('begin')))->getTimestamp()) - intval((new DateTime($b->get('begin')))->getTimestamp());
    });
}

$byProjects = array_merge($byProjects, $atEnd);

$PDF = new LocationPDF();
$PDF->AddPage();
//$PDF->DisableHeader();
$PDF->setAutoPageBreak(false, 20);
$PDF->unsetHeaderFooterEvenOnly();
/*$PDF->addTab(3);
$PDF->addTab(-0.5);*/

$PDF->addTab(42);
$PDF->addTab(62);
$PDF->addTab(92);
$PDF->addTab(132);
$PDF->addTab(151);
$PDF->addTab(122);

$PDF->SetY(38);
$currentName = '';

$PDF->setFontSize(5);
$dateFormater = new IntlDateFormatter(
    'fr_CH',  IntlDateFormatter::FULL,
    IntlDateFormatter::FULL,
    'Europe/Zurich',
    IntlDateFormatter::GREGORIAN,
    'EEEE, dd MMMM y'
);
$PDF->br();
$PDF->printTaggedLn(['%c', 'Planning journalier du ', '%cb', $dateFormater->format((new DateTime($day)))]);
$PDF->setFontSize(3);
$PDF->br();


$kpdf = $PDF;

$tableStart = drawHeaders($PDF);

$i = 0;
foreach ($byProjects as $kobjects) {
    $kobject = $kobjects[0];
    $affaire = $kaffaire->get($kobject->get('affaire'));

    if ($affaire === null)  { continue; }
    $project = $kproject->get($affaire->get('project'));

    $descriptions = trim($affaire->get('description'));
    $description = [];
    if ($descriptions !== '') {
        $description = explode("\n", $descriptions);
    }

    $comments = trim($kobject->get('comment'));
    $comment = [];
    if ($comments !== '') {
        $comment = explode("\n", $comments);
    }
    $height = $PDF->getTextHeight($kobject->get('comment'), 40) +  $PDF->getTextHeight($affaire->get('description'), 40);

    $targets = [];
    foreach ($kobjects as $kobject) {
        if (in_array($kobject->get('target'), $targets)) { continue; }
        $targets[] = $kobject->get('target');
    }
    
    if (count($targets) * $PDF->getFontSize() > $height) {
        $height = count($targets) * $PDF->getFontSize();
    }

    if ($PDF->GetY() + $height > $PDF->getDimension('H') - 20) {
        drawTable($PDF, $tableStart);
        $PDF->AddPage();
        $tableStart = drawHeaders($PDF);
        $PDF->reset_blocks();
        $i = 0;
    }
    $PDF->SetY($PDF->GetY() + 0.8);
    $kpdf->block('project' . $i++);
    if ($i % 2 === 0) {
        $PDF->background_block('#EEEEEE');
    }
    $kpdf->printTaggedLn(['%cb', $project->get('reference')], ['max-width' => 40]);
    $kpdf->printTaggedLn(['%c', $project->get('name')], ['max-width' => 40, 'multiline' => true ]);

    $kpdf->to_block_begin();
    $status = null;

    uasort($kobjects, function ($a, $b) {
        global $kentry;
        $entryA = $kentry->get($a->get('target'));
        $entryB = $kentry->get($b->get('target'));
        return intval($entryA->get('order')) - intval($entryB->get('order'));
    });

    $targets = [];
    foreach ($kobjects as $kobject) {
        if (!$status) { $status = $kstatus->get($kobject->get('status')); }
        if (in_array($kobject->get('target'), $targets)) { continue; }
        $targets[] = $kobject->get('target');
        $kpdf->tab(2);
        $entry = $kentry->get($kobject->get('target'));

        $kpdf->printTaggedLn(['%c', $entry->get('name')], ['max-width' => 30, 'multiline' => true]);
    }

    if (!$status) {
        $status = $kstatus->get($affaire->get('status'));
    }
    if ($status) {
        $kpdf->to_block_begin();
        $kpdf->setColor($status->get('color')); 
        $kpdf->tab(1);
        $kpdf->printTaggedLn(['%c', $status->get('name')], ['max-width' => 20]);
        $kpdf->setColor('black');
    } 

    $kpdf->to_block_begin();

    $kpdf->tab(3);
    $kpdf->printTaggedLn(['%c', str_replace("\n", ' ', $kobject->get('comment') . ' '. $affaire->get('description'))], ['multiline' => true, 'max-width' => 40]);
    $PDF->to_block_end();
    $PDF->drawLine($PDF->getMargin('L'), $PDF->GetY() - 0.25, $PDF->getDimension('W') - $PDF->getMargin('L') - $PDF->getMargin('R'), 0, 'line', ['color' => '#c4007a']);
    $PDF->close_block();
}
drawTable($PDF, $tableStart);

$PDF->Output('I', 'Planning du ' . $dateFormater->format((new DateTime($day))) .  '.pdf', true); 
