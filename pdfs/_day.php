<?php

include('base.php');
global $KAppConf;

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


$byTargets = [];

foreach($kobjects as $kobject) {
    if (!isset($byTargets[$kobject->get('target')])) {
        $byTargets[$kobject->get('target')] = [];
    }
    $byTargets[$kobject->get('target')][] = $kobject;
}

foreach ($byTargets as &$byTarget) {
    uasort($byTarget, function ($a, $b) {
        return intval($a->get('target')) - intval($b->get('target'));
    });
}

$PDF = new LocationPDF();
$PDF->AddPage();
$PDF->addTab(3);
$PDF->SetY(40);
$currentName = '';

$PDF->setFontSize(5);
$PDF->printTaggedLn(['%c', 'Planning journalier du ', '%cb', $day]);

$PDF->setFontSize(3);

foreach ($byTargets as $kobjects) {
    foreach($kobjects as $kobject) {
        $entry = $kentry->get($kobject->get('target'));
        if ($currentName !== $entry->get('name')) {
            $PDF->hr();
            $PDF->printTaggedLn(['%cb', $entry->get('name')]);
            $currentName = $entry->get('name');
        }
        $affaire = $kaffaire->get($kobject->get('affaire'));

    // $PDF->printTaggedLn(var_export($kaffaire, true), ['multiline' => true]);
        $status = $kstatus->get($kobject->get('status'));
        if ($affaire === null)  { continue; }
        $project = $kproject->get($affaire->get('project'));
    
        if ($status) { $PDF->setColor($status->get('color')); }
        else { $PDF->setColor('gray'); }
        $PDF->printTaggedLn(['%a', ' ', '%c', $status ? $status->get('name') : ' ', ' ']);
        $PDF->setColor('black');

        $begin = dbHourToHour($kobject->get('begin'));
        $end = dbHourToHour($kobject->get('end'));
        if (explode('T', $kobject->get('begin'))[0] !== $day) {
            if ($KAppConf->get('days.' . $weekDay . '.chunks') === NULL) {
                $begin = 'Début';
            } else {
                $begin = decToHM($KAppConf->get('days.' . $weekDay . '.chunks.0.0'));
            }
        }
        if (explode('T', $kobject->get('end'))[0] !== $day) {
            if ($KAppConf->get('days.' . $weekDay . '.chunks') === NULL) {
                $end = 'Fin';
            } else {
                $chunk = $KAppConf->get('days.' . $weekDay . '.chunks');
                $chunk = $chunk[count($chunk) - 1];
                $end = decToHM($chunk[1]);
            }        
        }

        $PDF->printTaggedLn(['%cb', $begin, ' -> ', $end, '%c', ' | ', $project->get('reference'), ' | ', $project->get('name')]);
        $description = explode("\n", $affaire->get('description'));
        foreach ($description as $line) {
            $PDF->tab(1);
            $PDF->printTaggedLn(['%c', $line], ['multiline' => true]);
        }
    }
}

$PDF->Output('I', 'Planning du ' . $_GET['id'] .  '.pdf', true); 
