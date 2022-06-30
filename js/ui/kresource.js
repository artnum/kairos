/* UI to allocate resources to stuffs.
 * A resources is allocated once only (but can be several because ... stuffs are stuffs).
 * A resource has a symbole and a name at least.
 * A stuffs can have limited or unlimited number of resources allocated.
 * Resources can be grouped.
 */
function KResource (resources, stuffs, day, type) {
    this.resources = resources
    this.stuffs = stuffs
    this.day = day.toISOString().split('T')[0]
    this.type = type
    this.store = new KStore('krallocation', {date: this.day, type: type})
}

KResource.prototype.showResourceToStuff = function (resource, resourceDom, stuffDom, uid) {
    window.requestAnimationFrame(() => {
        if (!resourceDom.dataset.used) { resourceDom.dataset.used = 0}
        resourceDom.dataset.used++
    })
    const div = document.createElement('DIV')
    div.classList.add('kresource', 'kresource-content', 'kresource-resource')
    div.dataset.id = resource.uid
    div.dataset.dbid = uid
    div.style.setProperty('border-color', resource.color)
    div.innerHTML = `<span class="k-icon">${resource.symbol}</span> <span class="k-name">${resource.name}</span>`
    window.requestAnimationFrame(() => stuffDom.lastElementChild.appendChild(div))
    div.addEventListener('click', event =>{
        const target = event.currentTarget
        this.store.delete(target.dataset.dbid)
        .then(() => {
            window.requestAnimationFrame(() => { resourceDom.dataset.used-- })
            window.requestAnimationFrame(() => { target.parentNode.removeChild(target) })
        })
    })
}

KResource.prototype.doDrop = function (event) {
    event.preventDefault()

    const data = event.dataTransfer.getData('application/x.k-exchange')
    if (!data) { return }
    const kex = KExchange.parse(data)
    const target = event.currentTarget
    KStore.byKid(kex.get('kid'))
    .then(kobject => {
        const src = kex.get('src')
        // already in
        if (target.querySelector(`div[data-id="${kobject.uid}"]`)) { return }

        this.store.set({target: target.dataset.id, source: kobject.uid, date:this.day, type:this.type})
        .then(uid => {
            this.showResourceToStuff(kobject, src, target, uid)
        })
    })
}

KResource.prototype.render = function () {
    return new Promise(resolve => {
        this.store.query({})
        .then(allocations => {
            const kstatus = new KStore('kstatus')
            const p = []
            for (const allocation of allocations) {
                p.push(new Promise(resolve => {
                    kstatus.get(allocation.get('source'))
                    .then(allocStatus => {
                        resolve([allocation, allocStatus])
                    })
                    .catch(err => {
                        resolve([allocation, {}])
                    })
                }))
            }
            return Promise.all(p)
        })
        .then((allocations) => {
            /* resource rendering */
            const groups = [document.createElement('DIV')]
            groups[0].style.setProperty('order', -1)

            for (const resource of this.resources) {
                let group = groups[0]
                if (resource.group) {
                    group = null
                    for (const g of groups) {
                        if (g.dataset.name === resource.group) { group = g; break }
                    }
                    if (!group) {
                        group = document.createElement('DIV')
                        let order = parseInt(resource.order)
                        if (isNaN(order)) { order = 1}
                        group.style.setProperty('order', order)
                        group.dataset.name = resource.group
                        const title = document.createElement('DIV')
                        title.innerHTML = resource.group
                        title.classList.add('kresource', 'kresource-title')
                        group.appendChild(title)
                        groups.push(group)
                    }
                }

                const r = document.createElement('DIV')
                /* must be set */
                r.setAttribute('draggable', true)
                r.addEventListener('dragstart', event => {
                    const kex = new KExchange(resource)
                    kex.set('src', r)
                    event.dataTransfer.setData('application/x.k-exchange', kex.toString())
                    event.dataTransfer.dropEffect = 'move'
                })
                r.addEventListener('drop', event => event.preventDefault())
                r.addEventListener('dragover', event => event.preventDefault())
                r.dataset.id = resource.id
                r.classList.add('kresource', 'kresource-content', 'kresource-resource')
                r.style.setProperty('border-color', resource.color)
                r.innerHTML = `<span class="k-icon">${resource.symbol}</span> <span class="k-name">${resource.name}</span>`

                group.appendChild(r)
            }


            const resources = document.createElement('DIV')
            resources.classList.add('kresource', 'kresource-container', 'kresource-container-resources')
            for (const group of groups) {
                if (!group.firstChild) { continue }
                resources.appendChild(group)
            }

            /* stuff rendering */
            const stuffs = document.createElement('DIV')
            stuffs.innerHTML = `<div class="kresource-title">Travaux</div>`
            stuffs.classList.add('kresource', 'kresource-container', 'kresource-container-stuffs')
            for (const stuff of this.stuffs) {
                const div = document.createElement('DIV')
                div.dataset.id = stuff.id
                const project = stuff.getRelation('kproject')
                div.innerHTML = `<div>${project.get('reference')} ${project.get('name')}</div><div>${stuff.reference} ${stuff.description}</div><div></div>`
                div.classList.add('kresource', 'kresource-content', 'kresource-stuff')
                if (stuff.color) {
                    div.style.setProperty('border-color', stuff.color)
                }
                div.addEventListener('dragover', event => {
                    event.preventDefault()
                    window.requestAnimationFrame(() => { div.classList.add('k-drag-over') })
                })
                div.addEventListener('dragleave', event => {
                    event.stopPropagation()
                    window.requestAnimationFrame(() => { div.classList.remove('k-drag-over') })
                }, {passive: true, capture: true})
                div.addEventListener('drop', event => {
                    window.requestAnimationFrame(() => { div.classList.remove('k-drag-over') })
                    this.doDrop(event)
                })
                stuffs.appendChild(div)
            }

            for (const alloc of allocations) {
                const snode = stuffs.querySelector(`div[data-id="${alloc[0].get('target')}"]`)
                const rnode = resources.querySelector(`div[data-id="${alloc[0].get('source')}"]`)
                this.showResourceToStuff(alloc[1], rnode, snode, alloc[0].id)
            }

            return resolve([resources, stuffs])
        })
    })
}