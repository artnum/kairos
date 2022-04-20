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
$withPeople = [];

foreach($kobjects as $kobject) {
    $affaire = $kaffaire->get($kobject->get('affaire'));
    if (!isset($withPeople[$affaire->get('id')])) {
        $withPeople[$affaire->get('id')] = [];
    }
    if (!in_array( $kobject->get('target'), $withPeople[$affaire->get('id')])) {
        $withPeople[$affaire->get('id')][] = $kobject->get('target');
    }
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
$PDF->DisableHeader();
$PDF->unsetHeaderFooterEvenOnly();
$PDF->addTab(3);
$PDF->SetY(40);
$currentName = '';

$PDF->setFontSize(5);
$PDF->printTaggedLn(['%c', 'Planning journalier du ', '%cb', $day]);

$PDF->setFontSize(3);

$entries = $kentry->query(['#and' => 
    [
        'disabled' => 0,
        'deleted' => '--'
    ]
]);

uasort($entries, function ($a, $b) {
    return intval($a->get('order')) - intval($b->get('order'));
});
foreach ($entries as $entry) {
    if (!isset($byTargets[$entry->get('id')])) { continue; }

    $kobjects = $byTargets[$entry->get('id')];
    $i = 1;

    uasort($kobjects, function ($a, $b) {
        return dbHourToDec($a->get('begin')) - dbHourToDec($b->get('begin'));
    });

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
        if ($begin === null) { continue; }
        $end = dbHourToHour($kobject->get('end'));
        if ($end === null) { continue; }
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

        $PDF->printTaggedLn(['%cb', 'En ', strval($i), '%c', ' | ', $project->get('reference'), ' | ', $project->get('name')]);
        $i++;
        $comments = trim($kobject->get('comment'));
        if ($comments !== '') {
            $comment = explode("\n", $comments);
            foreach ($comment as $line) {
                $PDF->tab(1);
                $PDF->printTaggedLn(['%c', $line], ['multiline' => true]);
            }
        }
        $descriptions = trim($affaire->get('description'));
        if ($descriptions !== '') {
            $description = explode("\n", $descriptions);
            foreach ($description as $line) {
                $PDF->tab(1);
                $PDF->printTaggedLn(['%c', $line], ['multiline' => true]);
            }
        }

        if (count($withPeople[$affaire->get('id')]) > 1) {
            $PDF->printTaggedLn(['%cb', 'Avec '], ['break' => false]);
            $first = true;
            foreach ($withPeople[$affaire->get('id')] as $personid) {
                if ($personid !== $entry->get('id')) {
                    $p = $kentry->get($personid);
                    if (!$first) { $PDF->printTaggedLn(['%c', ', '], ['break' => false]); }
                    $PDF->printTaggedLn(['%c', $p->get('name')], ['break' => false]);
                    $first = false;
                }
            }
            $PDF->br();
        }
    }
}

$PDF->Output('I', 'Planning du ' . $_GET['id'] .  '.pdf', true); 
