Liste des erreurs
=================

De manière générale, les erreurs sont organisées selon divers types suivi d'un numéro d'erreur dans le type en question. De fait cela représente un nombre de 0 à X où < 100 est un succès, >= 100 et < 200 est une erreur réseau, ..., autant de valeurs que nécessaires. La première valeur du type (par exemple 0, 100, 200, 300, ...) représente une erreur « générale ».

0[XX] Succès
------------

Les « succès » représentent une forme d'erreur où il n'y a pas d'erreur à proprement parler. En général la « valeur d'erreur » est 0. Les cas particuliers sont listés ici.

1XX Réseau
----------

Les erreurs en 1 sont liées au communication réseau.

- 101 : Serveur inaccessible

2XX Verrou
----------

Le système de verrou est utilisé pour éviter divers modifications simultanées. Les erreurs y relatient sont listées ici.

- 201 : Impossible d'obtenir l'état

3XX Données
-----------

Enregistrement ou lecture des données

- 301 : Modification
