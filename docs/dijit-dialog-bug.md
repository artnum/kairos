Bug dijit/Dialog sur Firefox
============================

Lorsque le CSS prévoit que `body` et `html` aient `overflow-y: hidden`, une boîte de dialogue créée avec `dijit/Dialog` ne s'affiche plus correctement sous Firefox Quantum (57.0.2 64 bits) et Firefox ESR (52.5.2 64 bits). En revanche, le problème ne se pose pas avec Chrome 62.0.3202.9 64 bits.

Le fichier [dialog-bug.html](../tests/dialog-bug.html) démontre ce fonctionnement.

Une piste à vérifier est sur le code de [positionnement de la boîte de dialogue](https://github.com/dojo/dijit/blob/0e35b944315b9e719f21e6c28c9993cf8cd99636/Dialog.js#L208).
