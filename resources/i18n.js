const I18N = {
    fr: {
        // canton suisse
        Valais: 'Valais',
        Geneve: 'Genève',
        Vaud: 'Vaud',
        Jura: 'Jura',
        Neuchatel: 'Neuchâtel',
        Fribourg_cat: 'Fribourg catholique',
        Fribourg_pro: 'Fribourg réformé',
        Berne: 'Berne',
        Soleure: 'Soleure',
        Bale: 'Bâle',
        Schaffhouse: 'Schaffhouse',
        Appenzell: 'Appenzell',
        St_Gall: 'St-Gall',
        Glaris: 'Glaris',
        Zurich: 'Zürich',
        Thurgovie: 'Thurgovie',
        Argovie: 'Argovie',
        Bale_campagne: 'Bâle-Campagne',
        Appenzell_Rhodes: 'Appenzell Rhodes',
        Schwytz: 'Schwytz',

        // pays
        Suisse: 'Suisse',
        France: 'France',

        // short days
        Dim: 'Dim',
        Lun: 'Lun',
        Mar: 'Mar',
        Mer: 'Mer',
        Jeu: 'Jeu',
        Ven: 'Ven',
        Sam: 'Sam',

        // Mois
        Janvier: 'Janvier',
        Fevrier: 'Février',
        Mars: 'Mars',
        Avril: 'Avril',
        Mai: 'Mai',
        Juin: 'Juin',
        Juillet: 'Juillet',
        Aout: 'Août',
        Septembre: 'Septembre',
        Octobre: 'Octobre',
        Novembre: 'Novembre',
        Decembre: 'Décembre',

        Semaine: 'Semaine',
        
        Zoom_maximum_atteint: 'Zoom maximum atteint',
        Zoom_minimum_atteint: 'Zoom minimum atteint',

        Reference_projet: 'Référence',
        Nom_projet: 'Nom projet',
        Reference_travail: 'Référence travail',
        Description_travail: 'Description travail',
        Remarque_journaliere: 'Remarque journalière',
        Dernier_modification: 'Dernière modification',
        Detail_reservation: 'Détail réservation',

        Reservation: 'Réservation',
        Travail: 'Travail',
        Numero: 'Numéro',
        Verrouillee: 'Verrouillée',
        Terminee: 'Terminée',
        Projet: 'Projet',
        Chef_projet: 'Chef projet',
        Type: 'Type',
        Supprimer_la_reservation: 'Supprimer la réservation {0} ?',

        Action_x_elements: 'Action sur {0} éléments',
        Action_1_element: 'Action sur 1 élément',
        Action: 'Action',

        Surligner: 'Surligner',
        Annuler_surlignage: 'Annuler le surlignage',
        Details: 'Détails',
        Imprimer: 'Imprimer',
        Supprimer: 'Supprimer',
        Relation: 'Relation',
        Ajouter_relation: 'Ajouter une relation',

        Replanifier_la_fin: 'Replanifier la fin',
        Creer_la_fin: 'Créer la fin',

        Enregistrer: 'Enregistrer',

        Reservation_x: 'Réservation {0}',

        ERR_Server: 'Erreur côté serveur',
        ERR_Reload: 'Une erreur est survenue, recharger la page (Ctrl + F5)',
        X_par_Y: '{0} par {1}',

        Planifier: 'Planifier',
        Clore: 'Clore',
        Ajouter: 'Ajouter',
        Voulez_vous_vraiment_clore_le_travail: 'Voulez-vous vraiment clore le travail',
        Voulez_vous_vraiment_supprimer_le_travail: 'Voulez-vous vraiment supprimer le travail',
        Pas_de_ressource_selectionnee: 'Pas de ressource sélectionnée',
        Pas_de_travail_selectionne: 'Pas de travail sélectionné',
        Date_invalide: 'Date invalide',

        Vehicule_du_x: 'Véhicule du {0}',
        Aucune_cellule_plus_1_reservation:'Aucune cellule ne contient plus d\'une réservation dans la vue'
    },

    $: function (key) {
        key = key.replace(':', '_')
        if (arguments.length > 1) {
            return this.format(key, Array.prototype.slice.call(arguments, 1))
        }
        return I18NCurrent[key] || key
    },

    format: function (key, args) {
        let str = I18NCurrent[key] || key
        for (let i = 0; i < args.length; i++) {
            str = str.replace(new RegExp('\\{' + i + '\\}', 'g'), args[i])
        }
        return str
    }
}



const I18NCurrent = I18N.fr