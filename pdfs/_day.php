<?php

include('base.php');
global $KAppConf;

$kreservation = new KStore($KAppConf, 'kreservation', ['deleted' => '--']);
$kentry = new KStore($KAppConf, 'kentry');
$kaffaire = new KStore($KAppConf, 'kaffaire');
$kproject = new KStore($KAppConf, 'kproject');
$kstatus = new KStore($KAppConf, 'kstatus');

$dayBegin = new DateTime($_GET['id']);
$dayEnd = new DateTime($_GET['id']);

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

uasort($kobjects, function ($a, $b) {
    return intval($a->get('target')) - intval($b->get('target'));
});

$PDF = new LocationPDF();
$PDF->AddPage();
$PDF->addTab(3);
$PDF->setFontSize(3);
$PDF->SetY(40);
$currentName = '';
foreach($kobjects as $kobject) {

    $entry = $kentry->get($kobject->get('target'));
    if ($currentName !== $entry->get('name')) {
        $PDF->printTaggedLn(['%cb', $entry->get('name')]);
        $currentName = $entry->get('name');
    }

    $affaire = $kaffaire->get($kobject->get('affaire'));
    $status = $kstatus->get($kobject->get('status'));
    if ($affaire === null)  { continue; }
  
    if ($status) { $PDF->setColor($status->get('color')); }
    else { $PDF->setColor('gray'); }
    $PDF->printTaggedLn(['%a', ' ', '%c', $status ? $status->get('name') : ' ', ' ']);
    $PDF->setColor('black');
    $description = explode("\n", $affaire->get('description'));    
    foreach ($description as $line) {
        $PDF->tab(1);
        $PDF->printTaggedLn(['%c', $line], ['multiline' => true]);
    }
}

$PDF->Output('I', 'Planning du ' . $_GET['id'] .  '.pdf', true); 
