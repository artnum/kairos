function KAffaireFormUI (affaire) {
    this.formUI = new KFormUI(affaire)
}

KAffaireFormUI.prototype.getValue = function (element) {
    if (!element) { return null }
    switch(element.nodeName) {
        case 'INPUT':
        case 'TEXTAREA':
            if (element.dataset) {
                if (element.dataset.value) { return element.dataset.value }
            }
            if (element.value) {
                return element.value
            }
            return null
        case 'CHECKBOX':
        case 'SELECT':
            return null
    }
}

KAffaireFormUI.prototype.submit = function (event) {
}

KAffaireFormUI.prototype.reset = function (event) {
    
}

KAffaireFormUI.prototype.change = function (event) {
    
}

KAffaireFormUI.prototype.render = function () {
    return this.formUI.render({
        reference: {label: 'Référence'},
        meeting: {label: 'Rendez-vous'},
        contact: {label: 'Personne de contact'},
        phone: {label: 'Téléphone', type: 'phone'},
        description: {label: 'Description', type: 'multitext'},
        time: {label: 'Durées', type: 'hour'},
        end: {label: 'Fin souhaitées', type: 'date'}
    })
}