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

        const nearestDate = new Date()
        if (nearestEnd !== Infinity && nearestEnd !== 0) {
            nearestDate.setTime(nearestEnd)
        }
        
        div.innerHTML = `
        <h1>${project.getCn()} - ${project.get('name')} - ${isNaN(nearestDate.getTime()) ? 'Pas de date'  : nearestDate.toLocaleDateString()}</h1>
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
            if (!this.disableLowLight) { this.lowlight() }
        })
        div.addEventListener('click', event => {
            this.disableLowLight = true
            const kstore = new KStore('kaffaire')
            kstore.query({'#and': {
                    project: this.project.get('uid'),
                    closed: '0'
            }})
            .then(affaires => {
                const klateral = new KLateral().open()
                this.form()
                .then(node => {
                    const tab = klateral.add(node, { title: `${project.getCn()}` })
                    this.kLateralDomNode = node
                    tab.addEventListener('focus', (event) => {
                        this.highlight()
                        if (!tab.runOnMove) {
                            const kview = new KView()
                            tab.runOnMove = kview.addRunOnMove(this.highlight.bind(this))
                        }
                    })
                    tab.addEventListener('blur', (event) => {
                        this.lowlight()
                        const kview = new KView()
                        kview.delRunOnMove(tab.runOnMove)
                        tab.runOnMove = undefined
                    })
                    tab.addEventListener('destroy', (event) => {
                        this.lowlight()
                        const kview = new KView()
                        kview.delRunOnMove(tab.runOnMove)
                        tab.runOnMove = undefined
                    })
                    tab.focus()
                    setTimeout(() => { this.disableLowLight = false }, 20)
                })
            })
        })
        this.domNode = div
        resolve(div)
    })
}

KProject.prototype.highlight = function () {
    const color = `hsla(0, 100%, 50%, 1)`
    const nodes = document.querySelectorAll(`[data-kproject="${this.project.get('uid')}"]`)
    for (const node of nodes ){
        window.requestAnimationFrame(() => { 
            if (!node) { return }
            node.style.setProperty('--selected-color', color)
            node.classList.add('selected')
        })
    }
}

KProject.prototype.lowlight = function () {
    const nodes = document.querySelectorAll(`[data-kproject="${this.project.get('uid')}"]`)
    for (const node of nodes ) {
        window.requestAnimationFrame(() => {
            if (!node) { return }
            node.style.removeProperty('--selected-color')
            node.classList.remove('selected')
        })
    }
}

KProject.prototype.toggleAffaire = function (event) {
    const node = event.target.parentNode

    window.requestAnimationFrame(() => {
        node.classList.toggle('open')
    })
}

KProject.prototype.kaffaireNode = function (affaire) {
    return new Promise((resolve, reject) => {
        const kaffaireui = new KAffaireFormUI(affaire)
        kaffaireui.render()
        .then(kaffaireNode => {
            const kformui = kaffaireNode.getParentObject()
            const fs = document.createElement('fieldset')
            fs.classList.add('k-project-fieldset')
            fs.innerHTML = `<legend>${affaire ? `${affaire.getCn()}${affaire.getFirstTextValue('', 'group') === '' ? ' ' : ` - ${affaire.getFirstTextValue('', 'group')} `}- ${affaire.getFirstTextValue('', 'reference', 'decription')}` : 'Nouveau travail'}</legend>`
            fs.querySelector('legend').addEventListener('click', this.toggleAffaire)
            fs.appendChild(kaffaireNode)
            if (affaire) {
                const status = affaire.getRelation('kstatus')
                if (status &&  status.color) {
                    const kolor = new Kolor(status.color)
                    const legend = fs.querySelector('legend')
                    legend.style.setProperty('background-color', status.color)
                    legend.style.setProperty('color', kolor.foreground())
                }
                const plan = document.createElement('button')
                plan.innerHTML = 'Planifier'
                plan.dataset.action = 'plan-affaire'
                plan.dataset.affaire = affaire.uid
                fs.appendChild(plan)
     
                const print = document.createElement('button')
                print.innerHTML = 'Imprimer'
                print.addEventListener('click', () => { this.printAffaire(affaire) })
                fs.appendChild(print)

                const del = document.createElement('button')
                del.innerHTML = 'Supprimer'
                del.classList.add('hidden-in-close', 'danger')
                del.addEventListener('click', () => { 
                    KConfirm('Voulez-vous vraiment supprimer le travail', del)
                    .then(confirm => {
                        if (confirm) { this.deleteAffaire(affaire) }
                    })
                })
                fs.appendChild(del)
                const close = document.createElement('button')
                close.innerHTML = 'Clore'
                close.classList.add('hidden-in-close', 'danger')
                close.addEventListener('click', () => {
                    KConfirm('Voulez-vous vraiment clore le travail', close)
                    .then(confirm => {
                        if (confirm) { this.closeAffaire(affaire) } 
                    })
                })
                fs.appendChild(close)
            } else {
                const add = document.createElement('button')
                add.innerHTML = 'Ajouter'
                add.classList.add('hidden-in-close')
                add.addEventListener('click', () => { this.submitNewAffaire(kformui) })
                fs.appendChild(add)
            }
            kformui.attachToParent(fs)
            resolve(fs)
        })
    })
}

KProject.prototype.printAffaire = function (affaire) {
    if (affaire) {
        const project = affaire.getRelation('kproject')
        const klogin = new KLogin(KAIROS.URL(KAIROS.kaalURL))
        klogin.genUrl(`${KAIROS.URL(KAIROS.kaalURL)}/admin/exec/export/bon.php`, {pid: project.id, travail: affaire.id}, klogin.getShareType('share-limited'))
        .then(url => {
            window.open(url, '_blank')
        })
    }
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
        let affaires = this.project.getRelation('kaffaire')
        node.classList.add('kproject')

        this.kaffaireNode(undefined)
        .then(emptyAffaire => {
            node.appendChild(emptyAffaire)
        })

        if (affaires && !Array.isArray(affaires)) { affaires = [affaires] }
        if (affaires && Array.isArray(affaires)) {
            affaires.sort((a, b) => {
                return a.getFirstTextValue('', 'group').localeCompare(b.getFirstTextValue('', 'group'))
            })
            for (const affaire of Array.isArray(affaires) ? affaires : [affaires]) {
                if (affaire.get('closed') !== 0) { continue }
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
                if (affaire.get('uid') === parseInt(target.dataset.affaire)) {
                    currentAffaire = affaire
                }
            }
            const ktask = new KTaskBar()
            ktask.setCurrentTask(
                'Planifier',
                `${this.project.get('reference')} ${this.project.get('name')} - ${currentAffaire.get('reference')}`,
                currentAffaire
            )
            return
        case 'edit-affaire':
            return
        case 'new-travail':
            return
    }
}