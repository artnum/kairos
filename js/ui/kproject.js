function KProject (project) {
    if (project.getUINode()) { return project.getUINode() }
    this.project = project
    this.project.bindUINode(this)
    this.domNode = null
}

KProject.prototype.render = function () {
    return new Promise((resolve) => {
        const project = this.project
        const div = document.createElement('DIV')
        const affaire = project.getRelation('kaffaire')
        div.id = project.get('uid')
        const kcolor = new KColor()
        let color = kcolor.get(`kproject:${this.project.get('uid')}`)
        if (!color) {
            div.style.setProperty('--kproject-color', `inherit`)
        } else {
            div.style.setProperty('--kproject-color', `var(${color})`)
        }
        
        div.classList.add('kproject-list')
        div.innerHTML = `
        <h1>${project.getCn()}</h1>
        <div><span class="klabel">Client</span> ${project.getRelation('kcontact')?.getCn() || ''}</div>
        <ul>
        `
        if (affaire) {
            for (const aff of Array.isArray(affaire) ? affaire : [affaire]) {
                let time = 0
                const reservations = aff.getRelation('kreservation')
                if (reservations) {
                    for (const reservation of Array.isArray(reservations) ? reservations : [reservations]) {
                        time += new Date(reservation.get('end')).getTime() - new Date(reservation.get('begin')).getTime()
                    }
                }
                div.innerHTML += `<li>${aff.getCn()}, ${(time / 60 / 60).toFixed(2)} heures planifiées</li>`
            }
        }
        div.innerHTML += '</ul>'
        div.addEventListener('mouseenter', event => {
            this.highlight()
        })
        div.addEventListener('mouseleave', event => {
            this.lowlight()
        })
        div.addEventListener('click', event => {
            const klateral = new KLateral().open()
            this.highlight()
            this.form()
            .then(node => {
                const tab = klateral.add(node, { title: `${project.getCn()}` })
                tab.addEventListener('show', (event) => {
                    this.highlight()
                })
                tab.addEventListener('hide', (event) => {
                    this.lowlight()
                })
                tab.addEventListener('destroy', (event) => {
                    this.lowlight()
                })
            })
        })
        this.domNode = div
        resolve(div)
    })
}

KProject.prototype.highlight = function () {
    const affaires = this. project.getRelation('kaffaire')
    if (!affaires || (Array.isArray(affaires) && affaires.length === 0)) { return }
    for (const affaire of Array.isArray(affaires) ? affaires : [affaires]) {
        const reservations = affaire.getRelation('kreservation')
        if (!reservations) { continue }
        const color = `hsla(0, 100%, 50%, 1)`
        for (const reservation of Array.isArray(reservations) ? reservations : [reservations]) {
            const dom = document.getElementById(reservation.get('uuid'))
            if (!dom) { continue }
            dom.style.setProperty('--selected-color', color)
            dom.dataset.affaire = affaire.get('id')
            window.requestAnimationFrame(() => { if (!dom) { return }; dom.classList.add(`selected`) })
        }
    }
}

KProject.prototype.lowlight = function () {
    const affaires = this.project.getRelation('kaffaire')
    if (!affaires || (Array.isArray(affaires) && affaires.length === 0)) { return }
    for (const affaire of Array.isArray(affaires) ? affaires : [affaires]) {
        const reservations = affaire.getRelation('kreservation')
        if (!reservations) { continue }
        for (const reservation of Array.isArray(reservations) ? reservations : [reservations]) {
            const dom = document.getElementById(reservation.get('uuid'))
            if (!dom) { continue }
            window.requestAnimationFrame(() => { dom.classList.remove('selected') })
        }
    }
}

KProject.prototype.form = function () {
    return new Promise((resolve) => {
        const node = document.createElement('DIV')
        const affaires = this.project.getRelation('kaffaire')
        node.classList.add('kproject')
        let affaireHTML = ''
        if (affaires) {
            for (const affaire of Array.isArray(affaires) ? affaires : [affaires]) {
                affaireHTML += `<div><h2>${affaire.getCn()}</h2>
                    <div class="kpair"><span class="klabel">Référence</span><span class="kvalue">${$S(affaire.get('reference'))}</span></div>
                    <div class="kpair"><span class="klabel">Description</span><span class="kvalue">${$S(affaire.get('description'))}</span></div>
                    <div class="kpair"><span class="klabel">Référence</span><span class="kvalue">${$S(affaire.get('reference'))}</span></div>
                    <div class="kpair"><span class="klabel">Rendez-vous</span><span class="kvalue">${$S(affaire.get('meeting'))}</span></div>
                    <div class="kapir"><span class="klabel">Fin souhaitée</span><span class="kvalue">${$S(affaire.get('end'))}</span></div>
                    <button data-affaire="${affaire.get('uid')}" data-action="plan-affaire">Planifier</button>
                </div>`
            }
        }
        node.innerHTML = `
            ${affaireHTML}
            <form></form>
            <button data-project="${this.project.get('uid')}" data-action="new-travail">Nouveau travail</button>
        `
        node.addEventListener('click', this.handleFormClick.bind(this))
        resolve(node)
    })
}

KProject.prototype.handleFormClick = function (event) {
    const target = event.target

    if (!target.dataset || !target.dataset.action) { return }
    switch (target.dataset.action) {
        case 'plan-affaire':
            if (!target.dataset.affaire) { return }
            const affaires = this.project.getRelation('kaffaire')
            let currentAffaire = null
            for (const affaire of Array.isArray(affaires) ? affaires : [affaires]) {
                if (affaire.get('uid') === target.dataset.affaire) {
                    currentAffaire = affaire
                }
            }
            const ktask = new KTaskBar()
            const listItem = ktask.list(currentAffaire.getCn(), {}, function () { }, {}, currentAffaire)
            listItem.addEventListener('pop', event => {
                const item = event.detail.data
                const kproject = item.getRelation('kproject')
                const ui = kproject.getUINode()
                if (ui) { ui.highlight() }
            })
            listItem.addEventListener('unpop', event => {
                const item = event.detail.data
                const kproject = item.getRelation('kproject')
                const ui = kproject.getUINode()
                if (ui) { ui.lowlight() }
            })
            listItem.select()
            return
        case 'new-travail':
            const node = event.target.previousElementSibling
            node.innerHTML = `
                Référence: <input name="reference"><br>
                Rendez-vous: <input name="meeting"><br>
                Personne de contact: <input name="contact"><br>
                Téléphone: <input name="phone"><br>
                Fin souhaitée: <input name="end" type="date"><br>
                Description:<br>
                <textarea name="description"></textarea>
            `
            return
    }
}