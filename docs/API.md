# Évènements Planning

## Généralités

Les évènements du planning sont accessibles via la collection `Evenement`. Ils sont liés, à minima, aux collections `Reservation`, `User`, `Machine` et `Status`. Chaque membre est caractérisé par les attributs suivant :

  - id (`int`) : numéro de membre dans la collection
  - reservation (`int`) : le numéro de la réservation
  - type (`char[32]`) : le type de l'évènement sous forme d'un chemin (path) relatif pour une ressource. Actuellement la seule collection fournissant des ressources pour cet attribut est la collection `Status`
  - comment (`text`) : un texte libre
  - date (`char[32]`) : la date et l'heure UTC de l'évènement au format [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601 "ISO 8601 sur Wikipedia"). Le fuseau horaire doit être représenté avec la forme `Z`
  - duration (`int`) : une durée, en seconde, de l'évènement. La durée ne sert pas à indiquer la fin, concrète de l'évènement, mais la durée totale d'un travail fait durant l'évènement.
  - technician (`char[32]`) : le technicien en charge de l'évènement sous form d'un chemin relatif pour une ressource. Actuellement la seule collection fournissant des ressources pour cet attribut est la collection `User`.
  - target (`char[32]`) : l'identifiant de la machine tel que trouvé dans l'attribut `uid` des ressources de la collection `Machine`
  - previous (`int`) : le numéro d'évènement ayant déclenché cet évènement.

Les attributs `reservation`, `target` et `previous` peuvent être NULL. Il est nécessaire de renseigner ou l'attribut `reservation` ou l'attribut `target` mais pas les deux à la fois (`XOR`).

### Du cas de `target` et `reservation`

Les attributs `target` et `reservation` servent à identifier la machine sur laquelle il se produit ; la priorité étant sur la réservation : si un évènement se produit sur une machine durant une réservation, le numéro de réservation doit être indiqué, sinon l'évènement le numéro de la machine est renseignée.

Pour déterminer la machine  ciblée par l'évènement, pour le cas où la réservation est renseignée, il faut interroger la collection `Reservation` et en récupérer l'attribut `target`. Le numéro de machine est donc accessible de deux manières :

  - `[EV]->reservation->target`
  - `[EV]->target`

### Du cas de `previous`

L'attribut `previous` sert à *chaîner* les évènements. Certains évènements vont déclencher un évènement subséquent (le signalement d'un problème déclenche un contrôle qui peut déclencher un dépannage). Dans ce genre de cas, le nouvel évènement reprend les valeurs `reservation` et `target` de l'évènement précédent et renseigne `previous` avec `id` du précédent.

 id | reservation | type       |  target | previous
----|-------------|------------|---------|----------
 1  | 1           | Panne      | `NULL`  | `NULL`
 2  | 1           | Contrôle   | `NULL`  | 1
 3  | 1           | Réparation | `NULL`  | 2
 
Il interdit de changer `reservation->target` par `target` dans les évènements successifs afin de garantir la cohérence des données.

### De l'état d'une machine

L'état d'une machine n'est pas explicite, il est déduit de l'ensemble des évènements. L'évènement est enregistrés lors de sa résolution ; une machine nécessitant une réparation reçoit l'évènement *réparation* lorsque la réparation a été effectuée.

Le nombre de type d'évènements est indéfini et la gestion des enchaînements est laissée à la libre interprétation des utilisateurs. Afin de rendre l'état lisible par un système informatique, chaque type se voit associé une valeur de sévérité (`severity`). Une machine est considérée sans problème avec une sévérité de 0.

Les sévérités actuelles sont les suivantes :

 Sévérité | Signification
----------|---------------
 0        | La machine est en bon état
 1        | La machine a été utiliée et son état est inconnu
 2        | Un problème ou une panne a été signalée
 3        | La machine est inutilisable

Les successions d'évènements suivent les degrés de sévérité par incrément ou décrement.

#### Exemple

L'état d'une machine est donc le degré de sévérité le plus élevé non-résolu :

Machine | Évènement | Précédent | Sévérité
--------|-----------|-----------|----------
  PT1   |     1     |   `NULL`  |    1
  PT1   |     2     |      1    |    2
  PT1   |     3     |   `NULL`  |    2
  PT1   |     4     |      2    |    3
  PT1   |     5     |      4    |    0
  
Ici le degré de sévérité est **2** puisque la succession d'évènements `1->2->4->5` amène à une sévérité de **0** mais que l'évènement 3 amène la sévérité à **2**.

#### Optimisation

Obtenir l'état final de la machine peut nécessiter une quantité de requêtes élevées. La sous-collection permet donc d'accéder à la chaîne résolue des évènements de manière optimisée. Cette sous-collection propose deux attributs supplémentaire :

  - `severity` (`int`) : degré de sévérité
  - `resolvedTarget` (`char[32]`) : machine cible résolue

En filtrant sur la valeur de sévérité, il devient aisé d'obtenir la liste des machines nécessitant une intervention.

## Des requêtes

L'accès aux collections s'inspire de l'architecture REST.

Les méthodes `HTTP` supportées sont les suivantes :

  - `GET` : Accéder à une ressource ou rechercher une collection
  - `POST` : Ajouter une ressource à une collection ou modifier une ressource
  - `PUT` : Remplacer une ressource
  - `PATCH` : Modifier une ressource
  - `HEAD` : Vérifier l'existence d'une ressource ou obtenir le nombre d'éléments d'une recherche
  - `DELETE` : Supprimer une ressource

### En-têtes

Les en-têtes HTTP des requêtes ne nécessitent rien de particulier. Il est recommandé, par contre, de prévoir de mettre l'en-tête `X-Request-Id` avec un numéro unique dans la même session (bien que l'API soit sans état (`stateless`), une session représente un ensemble de communications se passant durant une quinzaine de minutes).

### Des sous-collections

Les sous-collections sont une spécialisation des collections, accessible en lecture-seule. Les sous-collections sont accessibles par une requête sur une ressource dont le nom commence par un **.**. Pour la sous-collection `unified` de la collection `Evenement`, l'adresse est `Evenement/.unified`.

### Des adresses

Les adresses des collections sont relatives à l'installation sur le serveur. Pour le serveur de développement, les collections sont accessibles avec une adresse de base `https://dev0.local.airnace.ch/location/store/`.

#### Recherches

Rechercher sur une collection se fait par la partie recherche (query) de l'adresse. Les attributs recherchés sont spécifiés avec le préfixe `search.`. Les recherches sont disponibles, parfois partiellement, sur les sous-collections. Dans le cas de la sous-collection `Evenement/.unified`, il n'y a aucune restriction de la recherche. Ainsi pour isoler les événement de sévérité **1** sur la machine **PT1**, l'adresse est : 

```
GET Evenement/.unified?search.severity=1&search.target=PT1
```

##### Opérateurs

Les opérateurs sont spécifiés avant la valeur de recherche. Si aucun n'est spécifié, c'est l'opérateur d'égalité qui est utilisé lors de la comparaison. Les opérateurs suivant sont disponibles :

  - `>` / `<` : Plus grand/petit, exemple `?search.id=>1`
  - `>=`/ `<=`: Plus grand/petit ou égal, exemple `?search.id=<=10`
  - `~`: Recherche texte à l'aide du symbole `%`, exemple`?search.date=~2019-12-10%`
  - `!`: Différent, exemple `?search.duration=!0`

Afin de tester les attributs `NULL` ou non-`NULL`, les opérateurs `-` et `*` existent. Récupérer les resources dont `previous` est à `NULL` se fait `Evenement?search.previous=-` et le contraire `Evenement?search.previous=*`
  
## Du corps des réponses

Le corps d'une réponses utilise la notation [JSON](https://www.json.org/json-en.html "Introducing JSON"). 
Hormis le cas des requêtes `HEAD` dont le corps de réponse est prohibé par la norme `HTTP`, les réponses sont, à minima, toujours de la forme suivante :

```javascript
{
	"success": ...,
	"type": ...,
	"message": ...,
	"data": ...,
	"length": ...
}
```

L'attribut `success` est une valeur booléenne indiquant le résultat de le requête. Si une erreur survient, un message d'erreur est renseigné par l'attribut message, sinon cette attribut est une chaîne vide. L'attribut `type` peut avoir la valeur `results` si l'attribut `success` est vrai ou `error` si l'attribut `success` est faux, cet attribut peut être ignoré. Les attributs `data` et `length` dépendent de la requête.

### Données de réponse

Les données disponibles à l'attribut `data` sont dépendantes de la collection. Généralement elles se présentent sous la forme d'un objet JSON d'un seul niveau. Certaines collections ou sous-collections peuvent retourner des objets plus complexes, dans ces cas il faut se référer à l'implémentation pour en comprendred la signification.

### Requête `GET`

#### `GET` sur une collection, sous-collection

La requête `GET` a deux formes différentes suivant qu'elle porte sur une collection, une sous-collection ou une ressource. La forme première est celle pour les collections et sous-collections, `data` est une tableau dont `length` est sa longeur.

Dans le cas d'une réponse sans ressource, `data` est un tableau vide et `length` est à 0.

#### Exemples

```
GET Evenement/?search.duration=1000
```

```javascript
{
	"success": true,
	"type": "results",
	"message": "",
	"data": [],
	"length": 0
}
```

```
GET Evenement/?search.reservation=15585
```

```javascript
{
	"success": true,
	"type": "results",
	"message": "",
	"data": [ 
		{
			"id": "10",
			"reservation": "15585",
			"type": "Status\/22",
			"comment": "",
			"date":"2019-10-12T10:00:00+00:00",
			"duration": "0",
			"technician": "User\/19",
			"target": null,
			"previous": null
			}
	],
	"length": 1
}
```

### `GET` sur une ressource

Dans le cas d'une requête `GET` sur une ressource, `data` contient directement l'objet ou `NULL` si la ressource n'existe pas. `length` est soit 1, soit 0.

#### Exemples

```
GET Evenement/10000
```

```javascript
{
	"success": true,
	"type": "results",
	"message": "",
	"data": null,
	"length": 0
}
```

```
GET Evenement/10
```

```javascript
{
	"success": true,
	"type": "results",
	"message": "",
	"data": {
		"id": "10",
		"reservation": "15585",
		"type": "Status\/22",
		"comment": "",
		"date": "2019-10-12T10:00:00+00:00",
		"duration": "0",
		"technician": "User\/19",
		"target": null,
		"previous": null
		},
	"length": 1
}
```
### `POST`, `PUT`, `PATCH`

Ces trois requêtes utilisent la même structure. Si `POST` s'exécute sur une collection pour créer une nouvelle ressource, `PATCH` et `PUT` s'opère sur une ressource pour la modifier où la remplacer.

Chaque requête est accompagné d'un corps qui est l'objet, en notation JSON, qui doit être créé ou modifié. La forme est identique à celle que l'on retrouve dans `data` des réponses. Dans certains cas, un traitement est appliqué pour s'assurer que les données soient conformes à ce qu'attendu.

Les réponses contiennent toujours, pour `data`, un tableau de 1 élément contenant un objet avec 1 seul attribut : le numéro de membre de la collection.

#### Exemple de corps de requête

```javascript
{
	"begin":"2019-12-14T08:00:00+01:00",
	"end":"2019-12-14T17:00:00+01:00",
	"deliveryBegin":null,
	"deliveryEnd":null,
	"uuid":null,
	"status":"1",
	"address":null,
	"locality":null,
	"comment":null,
	"equipment":null,
	"reference":null,
	"gps":null,
	"folder":null,
	"title":null,
	"previous":null,
	"creator":"User/10",
	"technician":null,
	"warehouse":null,
	"note":null,
	"padlock":null,
	"target":"131"
}
```

#### Exemple de réponse

```javascript
{
	"success":true,
	"type":"results",
	"message":"",
	"data":[
		{
			"id":"17835"
		}
	],
	"length":1
}
```



### `DELETE`

La requête ne se fait que sur une ressource et la supprime. Certaines resources ne sont pas supprimées mais voient leur attribut `deleted` changé de `NULL` à un entier représentant l'horodatage `Unix` de la suppression. C'est le cas pour les ressources de la collection `Reservation`.

Cette requête retourne toujours :

```javascript
{
	"success": true,
	"type": "results",
	"message": "Element deleted",
	"data": null,
	"length": null
}
```

## Les collections

Les attributs disponibles mais non-décrits ici sont soit des reliques du passé soit des évolutions futures encore pas menées à terme. Il faut donc les ignorer.

### Reservation

Contient les réservation. Une ressource est composées des attributs suivants :

  - `id` (`int`) : numéro de membre
  - `begin` (`char[32]`) : date de début de la réservation au format ISO 8601
  - `end` (`char[32]`) : date de fin de la résevation au format ISO 8601
  - `deliveryBegin` (`char[32]`) : date de la livraison au format ISO 8601 ou `NULL` si inapplicable
  - `deliveryEnd` (`char[32]`) : date de la livraison au format ISO 8601 ou `NULL` si inapplicable
  - `target` (`char[32]`) : identifiant de la machine réservée
  - `status` (`int`) : entier représentant le status de la réservation comme définit dans la collection `Status`
  - `creator` (`char[32]`) : Chemin relatif vers la collection `User` du responsable de la réservation
  - `locality` (`text`) : Soit un chemin relative vers la collection `Locality` ou la collection `Warehouse` ou un texte libre pour la localité de la réservation
  - `address` (`text`) : Adresse de la réservation
  - `reference` (`text`) : Référence client de la réservation
  - `equipment` (`text`) : L'équipement nécessaire pour la réservation
  - `title` (`text`) : Machine demandée par le client
  - `gps` (`text`) : Coordonnée GPS du lieu de la réservation
  - `folder` (`text`) : Dossier de la réservation
  - `other` (`text`) : Objet JSON contenant des indications supplémentaires éventuelles
  - `modification` (`int`) : Horodatage de la dernière modification (attribut modifé automatiquement)
  - `created` (`int`) : Horodatage de la création (attribut modifié automatiquement)
  - `deleted` (`int`) : Horodatage de la suppression (attribut modifié automatiquement)

#### Exemple

```javascript
{
	"id":"8586",
	"uuid":"95188dee-5554-11e9-8b4d-c86000771629",
	"begin":"2019-01-23T07:00:00+00:00",
	"end":"2019-01-23T16:00:00+00:00",
	"target":"154",
	"status":"1",
	"address":null,
	"locality":null,
	"contact":null,
	"comment":null,
	"deliveryBegin":null,
	"deliveryEnd":null,
	"special":null,
	"closed":null,
	"reference":null,
	"equipment":null,
	"title":null,
	"folder":null,
	"gps":null,
	"creator":"store\/User\/4",
	"previous":null,
	"warehouse":null,
	"note":null,
	"other":"{\"critic\":\"\"}",
	"created":"1548232123",
	"deleted":"1548232131",
	"modification":"1548232131",
	"technician":null,
	"padlock":null
}
```

### User

Contient les employés. Une ressource est composée des attributs suivant :

  - `id` (`int`) : numéro de membre dans la collection
  - `name` (`text`) : Nom de l'utilisateur
  - `phone` (`char[15]`) : Numéro de téléphone
  - `function` (`char[16]`) : Rôle principal dans l'entrprise ("admin", "machiniste", "mécanicien", "commercial")
  - `temporary` (`int`) : 1 pour les ouvriers temporaires
  

#### Exemple

```javascript
{
	"id":"7",
	"name":"Stagiaire",
	"phone":"+41277664097",
	"disabled":"1",
	"color":"black",
	"function":"admin",
	"temporary":"0"
}
```

### Status

Contient les différents états possibles. Pour ces états, un type est associé correspondant à l'usage possible. Pour les évènements, le type à utiliser est **3**. Une ressource est composée des attributs suivant :

  - `id` (`int`) : numéro de membre dans la collection
  - `name` (`text`) : nom du status
  - `description` (`text`) : une description si applicable
  - `type` (`int`) : usage pour ce status
  
#### Exemple

```javascript
{
	"id":"23",
	"name":"Autre",
	"color":null,
	"default":null,
	"type":"3",
	"description":null,
	"bgcolor":null,
	"symbol":"bolt"
}
```

### Machine

Collection particulière, accessible uniquement en lecture-seul. Dans tous les cas un tableau de valeur est retourné. Les attributs sont les suivants :

  - `uniqueidentifier` (`text`) : Un identifiant unique dans la collection
  - `description`, `uid`, `reference` (`text`) : L'identifiant de la machine
  - `cn` (`text`) : le nom de la machine. Le support multi-lingue est fait par les déclinaisons `;lang-XX`, ..., de l'attribut `cn`
  - `brand` (`text`) : Marque
  - `height` (`int`) : Hauteur [cm]
  - `height` (`int`) : Hauteur [cm]
  - `length` (`int`) : Longueur [cm]
  - `width` (`int`) : Largeur [cm]
  - `floorheight` (`int`) : Hauteur plancher [cm]
  - `workheight` (`int`) : Hauteur de travail [cm]
  - `sideoffset` (`int`) : Déport [cm]
  - `maxcapacity` (`int`) : Capacité maximale [kg]
  - `weight` (`int`) : Poids de la machine [kg]
  
#### Exemple

```javascript
[
	{
		"uniqueidentifier":"100-49",
		"description":"100",
		"IDent":"uniqueIdentifier%3D100-49",
		"uid":"100",
		"reference":"100",
		"cn":"Camion-nacelle 40m",
		"cn;lang-de":"LKW-B\u00fchne 40m",
		"cn;lang-en":"Truck mounted lift 40m",
		"brand":"Multitel",
		"family":"Nacelle-52",
		"height":"396",
		"length":"1098",
		"width":"251",
		"floorheight":"3800",
		"workheight":"4000",
		"sideoffset":"2700",
		"maxcapacity":"365",
		"weight":"26000",
		"motorization":"Diesel-79",
		"special":"Travail en pente-74",
		"subtype":"Articul\u00e9-61",
		"type":[
			"Camion nacelle-21",
			"Nacelle n\u00e9gative-74"
		],
	   	"o":"airnace",
	   	"objectclass":"machine",
		"currentLocation":{"value":"","id":"645"},
		"placeAfter":{"value":"140","id":"37"},
		"order":{"value":"30","id":"269"}
	}
]
```
## Des erreurs

L'usage des valeurs des codes d'état HTTP est, généralement, cohérent. Dans tous les cas, toutes requêtes retournant un code d'état différent de `200` représentent une erreur.
