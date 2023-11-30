<?php

include('base.php');
include('../lib/dbs.php');
global $KAppConf;
global $KConf;
global $ini_conf;

$authpdo = init_pdo($ini_conf, 'authdb');
$KAuth = new KAALAuth($authpdo);
$BaseURL = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['SERVER_NAME'];

if (!$KAuth->check_auth($KAuth->get_auth_token(), $BaseURL . '/' . $_SERVER['REQUEST_URI'])) {
  http_response_code(401);
  exit(0);
}

$H = 0;

function drawHeaders ($pdf) {
    global $H;
    $i = 1;
    $H++;
    $pdf->block('header' . $H);
    $tableStart = $pdf->get_block_origin();
    $pdf->drawLine($pdf->getMargin('L'), $tableStart, $pdf->getDimension('W') - $pdf->getMargin('L') - $pdf->getMargin('R'), 0, 'line', ['color' => '#c4007a']);

    $pdf->background_block('#c4007a');
    $pdf->setColor('white');
    foreach (['Chantier', 'Ouvrier', 'Remarque', 'Description', 'Véhicule'] as $header) {
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

$kreservation = new KStore($KAppConf, 'kreservation', ['deleted' => '--'], $KConf->get('security.authproxy'));
$kentry = new KStore($KAppConf, 'kentry', [], $KConf->get('security.authproxy'));
$kaffaire = new KStore($KAppConf, 'kaffaire', [], $KConf->get('security.authproxy'));
$kproject = new KStore($KAppConf, 'kproject', [], $KConf->get('security.authproxy'));
$kstatus = new KStore($KAppConf, 'kstatus', [], $KConf->get('security.authproxy'));
$kalloc = new KStore($KAppConf, 'krallocation', [], $KConf->get('security.authproxy'));

$day = $_GET['id'];
$dayBegin = new DateTime($_GET['id'], new DateTimeZone('UTC'));
$dayEnd = new DateTime($_GET['id'], new DateTimeZone('UTC'));

$weekDay = $dayBegin->format('w');

$dayBegin->setTime(0, 0, 0, 0);
$dayEnd->setTime(24, 0, 0, 0);


$allocations = $kalloc->query(['type' => 'afftbcar', 'date' =>$dayBegin->format('Y-m-d') ]);

$dayBegin = explode('+', $dayBegin->format('c'))[0];
$dayEnd = explode('+', $dayEnd->format('c'))[0];

$kobjects = $kreservation->query([
    '#and' => [
        'begin' => ['<', $dayEnd],
        'end' => ['>', $dayBegin],
        'deleted' => '--'   
    ]
]);

/* direction on logistic must be ordered according to direction, so build that
 * layer of table, then merge so they are processed in correct order
 */
$atEnd = [];
$atEnd0_5 = [];
$atEnd1 = [];
$atEnd2 = [];
$byProjects = [];

foreach($kobjects as $kobject) {
    $affaire = $kaffaire->get($kobject->get('affaire'));
    $status = $kobject->get('status');
    if (!$affaire)  { continue; }
    if (!$status) { $status = $affaire->get('status'); }
    if (!$kobject->get('status') && $status) { $kobject->set('status', $status); }
    if ($kobject->get('status') === 9) { continue; }
    $project = $kproject->get($affaire->get('project'));
    if (!$project) { continue; }

    $affaireid = $affaire->get('id');
    if (intval($status) === 5) {
        if ($kobject->get('other') === null) {
            if (!isset($atEnd[$project->get('id') . $status . $affaireid])) {
                $atEnd[$project->get('id') . $status . $affaireid] = [];
            }
            $atEnd[$project->get('id') . $status . $affaireid][] = $kobject;
            continue;
        }

        try {
            $other = json_decode($kobject->get('other'));
            if (!isset($other->link) || !isset($other->link->direction)) {
                throw new Exception();
            }

            if ($other->link->direction === 'left') {
                if (!isset($atEnd0_5[$project->get('id') . $status . $affaireid])) {
                    $atEnd0_5[$project->get('id') . $status . $affaireid] = [];
                }
                $atEnd0_5[$project->get('id') . $status . $affaireid][] = $kobject;
                continue;
            }
            if (!isset($atEnd1[$project->get('id') . $status . $affaireid])) {
                $atEnd1[$project->get('id') . $status . $affaireid] = [];
            }
            $atEnd1[$project->get('id') . $status . $affaireid][] = $kobject;
            continue;
        } catch (Exception $e) {
            if ($kobject->get('other') === null) {
                if (!isset($atEnd[$project->get('id') . $status . $affaireid])) {
                    $atEnd[$project->get('id') . $status . $affaireid] = [];
                }
                $atEnd[$project->get('id') . $status . $affaireid][] = $kobject;
                continue;
            }
        }
    }

    if (intval($status) === 4) {
        if (!isset($atEnd2[$project->get('id') . $status . $affaireid])) {
            $atEnd2[$project->get('id') . $status . $affaireid] = [];
        }
    
        $atEnd2[$project->get('id') . $status . $affaireid][] = $kobject;
        continue;
    }

    if (!isset($byProjects[$project->get('id') . $status . $affaireid])) {
        $byProjects[$project->get('id') . $status . $affaireid] = [];
    }

    $byProjects[$project->get('id') . $status . $affaireid][] = $kobject;
}

foreach ($byProjects as &$byProject) {
    uasort($byProject, function ($a, $b) {
        return intval((new DateTime($a->get('begin')))->getTimestamp()) - intval((new DateTime($b->get('begin')))->getTimestamp());
    });
}

$byProjects = array_merge($byProjects, $atEnd, $atEnd0_5, $atEnd1, $atEnd2);

$order = [];
foreach ($byProjects as $k => $kobjects) {
    $min = 999999;
    foreach ($kobjects as $kobject) {
        $affaire = $kaffaire->get($kobject->get('affaire'));
        $status = $kobject->get('status');
        if ($affaire)  { 
            if (!$status) { $status = $affaire->get('status'); }
            $kobject->set('__status', intval($status));
            if (intval($status) === 5) { $min = 999998; break; }
            if (intval($status) === 4) { $min = 999999; break; }
        }
        $person = $kentry->get($kobject->get('target'));
        if (intval($person->get('order')) < 0) { continue; }
        if ($min > intval($person->get('order'))) { $min = intval($person->get('order')); }
    }
    $order[$k] = $min;
}
asort($order);

$PDF = new LocationPDF();
$PDF->AddPage();
//$PDF->DisableHeader();
$PDF->setAutoPageBreak(false, 20);
$PDF->unsetHeaderFooterEvenOnly();
/*$PDF->addTab(3);
$PDF->addTab(-0.5);*/

$PDF->addTab(42);
$PDF->addTab(72);
$PDF->addTab(121);
$PDF->addTab(161);
$PDF->addTab(180);

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
$strDate = $dateFormater->format((new DateTime($day)));
$PDF->br();
$PDF->printTaggedLn(['%c', 'Planning journalier du ', '%cb', $strDate]);
$PDF->setFontSize(3);
$PDF->br();


$kpdf = $PDF;

$tableStart = drawHeaders($PDF);

$i = 0;
$lastOrder = 0;
foreach ($order as $k => $v) {
    $kobjects = $byProjects[$k];
    $kobject = $kobjects[0];

    if ($lastOrder !== $kobject->get('__status') && ($kobject->get('__status') === 5 || $kobject->get('__status') === 4)) {

        drawTable($PDF, $tableStart);
        if ($PDF->GetY() > $PDF->getDimension('H') - 60) {
            $PDF->br();
            $PDF->drawLine($PDF->getMargin('L'), $PDF->GetY() - 0.25, $PDF->getDimension('W') - $PDF->getMargin('L') - $PDF->getMargin('R'), 0, 'line', ['color' => '#000000', 'width' => 1.5]);
            $PDF->AddPage();
        } else {
            $PDF->br();
            $PDF->drawLine($PDF->getMargin('L'), $PDF->GetY() - 0.25, $PDF->getDimension('W') - $PDF->getMargin('L') - $PDF->getMargin('R'), 0, 'line', ['color' => '#000000', 'width' => 1.5]);
	        $PDF->br();
        }

        $tableStart = drawHeaders($PDF);
        $PDF->reset_blocks();
        $i = 0;
    }
    $lastOrder = $kobject->get('__status');

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

    if ($PDF->GetY() + $height > $PDF->getDimension('H') - 40) {
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
    $kpdf->printTaggedLn(['%cb', $project->get('reference')], ['max-width' => 40, 'break' => false]);
    $REFX = $kpdf->GetX();
    $kpdf->br();
    $kpdf->printTaggedLn(['%c', trim($project->get('name'))], ['max-width' => 40, 'multiline' => true ]);
    if ($affaire->get('group')) { $kpdf->printTaggedLn(['%c', $affaire->get('group')], ['max-width' => 40, 'multiline' => true ]); }
    $kpdf->to_block_begin();
    $status = null;

    uasort($kobjects, function ($a, $b) {
        global $kentry;
        $entryA = $kentry->get($a->get('target'));
        $entryB = $kentry->get($b->get('target'));
        return intval($entryA->get('order')) - intval($entryB->get('order'));
    });

    $other = null;
    $detail = '';
    $targets = [];
    foreach ($kobjects as $kobject) {
        if (!$other && $kobject->get('other') !== null) { $other = $kobject->get('other'); }
        if (!$status) { $status = $kstatus->get($kobject->get('status')); }
        if (in_array($kobject->get('target'), $targets)) { continue; }
        $targets[] = $kobject->get('target');
        $kpdf->tab(1);
        $entry = $kentry->get($kobject->get('target'));
        if (intval($entry->get('disabled')) === 1) { continue; }

        $kpdf->printTaggedLn(['%c', $entry->get('name')], ['max-width' => 40, 'multiline' => true, 'break' => false]);
        $kpdf->tab(2);
        if ($kobject->get('comment')) {
            $comments = preg_split("/\r\n|\n/", $kobject->get('comment'));
            foreach($comments as $comment) {
                $kpdf->printTaggedLn(['%c', $comment], ['max-width' => 32, 'break' => true]); 
                $kpdf->tab(2);
            }
        }
        $kpdf->br();
    }
    if (!$status) {
        $status = $kstatus->get($affaire->get('status'));
    }
    if ($status) {
        $kpdf->to_block_begin();
        
        $kpdf->SetX($REFX + 2);
        $kpdf->setColor($status->get('color')); 
        $kpdf->printTaggedLn(['%c', $status->get('name')], ['max-width' => 20]);
        $kpdf->setColor('black');
    } 

    $kpdf->to_block_begin();
    $groups = [];
    foreach ($allocations as $alloc) {
        if ($alloc->get('target') == $affaire->get('uid')) {
            
            $what = $kstatus->get($alloc->get('source'));
            if (!isset($groups[$what->get('group')])) {
                $groups[$what->get('group')] = 0;
                $kpdf->to_block_begin();
            } else {
                $kpdf->SetY($groups[$what->get('group')]);
            }
        }
    }

    $kpdf->to_block_begin();

    $header = '';
    $details = '';
    if ($other) {
        $other = json_decode($kobject->get('other'), true);
        if ($other['link']) {
           $header = $other['link']['direction'] === 'right' ? '← ' : '→ ';
           $otherReservation = $kreservation->get($other['link']['to']);
           if (!$otherReservation->get('deleted')) {
            $begin = new DateTime($otherReservation->get('begin'));
            $dateFormater = new IntlDateFormatter(
                    'fr_CH',  IntlDateFormatter::FULL,
                    IntlDateFormatter::FULL,
                    'Europe/Zurich',
                    IntlDateFormatter::GREGORIAN,
                    'dd MMMM y'
                );
                $detail = $dateFormater->format($begin);
            }
        }
    }
    $kpdf->tab(3);
    $kpdf->printTaggedLn(['%cb', $header . str_replace("\n", ' ', $affaire->get('reference'))], ['multiline' => true, 'max-width' => 40]);
    $kpdf->tab(3);
    $kpdf->printTaggedLn(['%c', str_replace("\n", ' ', $affaire->get('description'))], ['multiline' => true, 'max-width' => 40]);
    
    if (!empty($detail)) {
        $kpdf->tab(3);
        $kpdf->setFontSize(2);
        $kpdf->printTaggedLn(['%c', '(' . ($header === '← ' ? '→ ' : '← ') . $detail . ')'], ['multiline' => true, 'max-width' => 40]);
        $kpdf->setFontSize(3);
    }
    $PDF->to_block_end();
    $PDF->drawLine($PDF->getMargin('L'), $PDF->GetY() - 0.25, $PDF->getDimension('W') - $PDF->getMargin('L') - $PDF->getMargin('R'), 0, 'line', ['color' => '#c4007a']);
    $PDF->close_block();
}
drawTable($PDF, $tableStart);

$PDF->Output('I', 'Planning du ' . $strDate.  '.pdf', true); 
