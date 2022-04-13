function KProject (project) {
    if (project.getUINode()) { return project.getUINode() }
    this.project = project
    this.project.bindUINode(this)
    this.domNode = null
    this.kLateralDomNode = null
}

KProject.prototype.render = function () {
    const today = new Date()
    return new Promise((resolve) => {
        const project = this.project
        const div = document.createElement('DIV')
        div.classList.add('k-project')
        const affaire = project.getRelation('kaffaire')
        div.id = project.get('uid')
        const kcolor = new KColor()
        let color = kcolor.get(`kproject:${this.project.get('uid')}`)
        if (!color) {
            div.style.setProperty('--kproject-color', `inherit`)
        } else {
            div.style.setProperty('--kproject-color', `var(${color})`)
        }
        
        const txt = `${project.getFirstTextValue('', 'name') || ''} ${project.getRelation('kcontact')?.getFirstTextValue('', 'cn') || ''} ${project.getCn()}`
        const words =  txt.split(' ')
        div.classList.add('k-project-in-list')
        div.dataset.words = words.filter((w,i) => { return words.indexOf(w) === i}).map(v => { return v.toLowerCase()}).join(' ')
    
        let nearestEnd = Infinity
        let affaireHtml = ''
        let timeToPlan = 0
        let timePlanned = 0
        if (affaire) {
            for (const aff of Array.isArray(affaire) ? affaire : [affaire]) {
                if (aff.get('closed') !== '0') { continue }
                
                const end = new Date(aff.get('end'))
                if (!isNaN(end.getTime())) {
                    if (end.getTime() < nearestEnd) {
                        nearestEnd = end.getTime()
                    }
                }
                let time = 0
                const reservations = aff.getRelation('kreservation')
                if (reservations) {
                    for (const reservation of Array.isArray(reservations) ? reservations : [reservations]) {
                        if (reservation === undefined) { continue }
                        const rtime = parseInt(reservation.get('time'))
                        if (!isNaN(rtime)) { time += rtime }
                    }
                }
                timePlanned += time
                let affaireTime = parseInt(aff.get('time'))
                if (!affaireTime) { affaireTime = 8 * 3600 }
                timeToPlan = affaireTime
            }
        }

        const nearestDate = new Date()
        if (nearestEnd !== Infinity && nearestEnd !== 0) {
            nearestDate.setTime(nearestEnd)
        }

        let percentPlanned = Math.round(timePlanned * 100 / timeToPlan)
        
        div.innerHTML = `
        <h1>${project.getCn()} - ${project.get('name')} - ${isNaN(nearestDate.getTime()) ? 'Pas de date'  : nearestDate.toLocaleDateString()}</h1>
        <div style="width: 100%; height: 26px; overflow: hidden;">
            <div class="k-progress k-progress-${percentPlanned <= 100 ? String(Math.ceil(percentPlanned / 5) * 5) : 'over'}"></div>
            <div style="float: left">${percentPlanned}% du temps plannifié</div>
        </div>
        `
        if (nearestEnd === Infinity) {
            div.style.setProperty('order', Math.floor(today.getTime() / 1000 + 86400 * 3650))
        } else {
            div.style.setProperty('order', Math.floor(nearestEnd / 1000))
        }
        if (today.getTime() > nearestEnd) {
            div.classList.add('k-overtime')
        }
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
                this.kLateralDomNode = node
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
            if (reservation === undefined) { continue }
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
            if (reservation === undefined) { continue }
            const dom = document.getElementById(reservation.get('uuid'))
            if (!dom) { continue }
            window.requestAnimationFrame(() => { dom.classList.remove('selected') })
        }
    }
}

KProject.prototype.kaffaireNode = function (affaire) {
    return new Promise((resolve, reject) => {
        const kaffaireui = new KAffaireFormUI(affaire)
        kaffaireui.render()
        .then(kaffaireNode => {
            const kformui = kaffaireNode.getParentObject()
            const fs = document.createElement('fieldset')
            fs.innerHTML = `<legend>${affaire ? affaire.getCn() : 'Nouveau travail'}</legend>`
            fs.appendChild(kaffaireNode)
            const plan = document.createElement('button')
            if (affaire) {
                const plan = document.createElement('button')
                plan.innerHTML = 'Planifier'
                plan.dataset.action = 'plan-affaire'
                plan.dataset.affaire = affaire.uid
                fs.appendChild(plan)
                const del = document.createElement('button')
                del.innerHTML = 'Supprimer'
                del.addEventListener('click', () => { this.deleteAffaire(affaire) })
                fs.appendChild(del)
                const close = document.createElement('button')
                close.innerHTML = 'Clore'
                close.addEventListener('click', () => { this.closeAffaire(affaire) })
                fs.appendChild(close)
            } else {
                const add = document.createElement('button')
                add.innerHTML = 'Ajouter'
                add.addEventListener('click', () => { this.submitNewAffaire(kformui) })
                fs.appendChild(add)
            }
            kformui.attachToParent(fs)
            resolve(fs)
        })
    })
}

KProject.prototype.deleteAffaire = function (affaire) {
    const store = new KStore('kaffaire')
    const reservationStore = new KStore('kreservation')
    if (affaire) {
        const reservations = affaire.getRelation('kreservation')
        if (reservations) {
            for (const reservation of Array.isArray(reservations) ? reservations : [reservations]) {
                reservationStore.delete(reservation.uid)
            }
        }
    }
    store.delete(affaire.uid)
}

KProject.prototype.closeAffaire = function (affaire) {
    affaire.set('closed', (new Date()).getTime() / 1000)
    KStore.save(affaire)
}

KProject.prototype.submitNewAffaire = function (formui) {
    const store = new KStore('kaffaire')
    const affaire = formui.getAllValues()
    formui.clear()
    affaire.project = this.project.get('uid')
    store.set(affaire)
    .then(id => {
        return store.get(id)
    })
    .then(affaire => {
        return this.kaffaireNode(affaire)
    })
    .then(fsNode => {
        if (this.kLateralDomNode) {
            window.requestAnimationFrame(() => { this.kLateralDomNode.appendChild(fsNode) })
        }
    })
}

KProject.prototype.form = function () {
    return new Promise((resolve) => {
        
        const node = document.createElement('DIV')
        const affaires = this.project.getRelation('kaffaire')
        node.classList.add('kproject')

        this.kaffaireNode(undefined)
        .then(emptyAffaire => {
            node.appendChild(emptyAffaire)
        })

        if (affaires) {
            for (const affaire of Array.isArray(affaires) ? affaires : [affaires]) {
                if (affaire.get('closed') !== '0') { continue }
                this.kaffaireNode(affaire)
                .then(affaireNode => {
                    node.appendChild(affaireNode)
                })
            }
        }
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
            const listItem = ktask.list(`${this.project.get('reference')} <span data-uplink="kaffaire:${currentAffaire.get('uid')}" data-uplink-attr="reference">${currentAffaire.get('reference')}</span>`, {}, function () { }, {}, currentAffaire)
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
        case 'edit-affaire':
            return
        case 'new-travail':
            return
    }
}