function KEntrySortUI () {
    this.order = localStorage.getItem('kairos/kentry-sort')
    if (this.order) {
        this.order = JSON.parse(this.order)
    } else {
        this.order = {

        }
    }
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('k-entry-sort')
    this.domNode.innerHTML = `<div class="k-list"></div>`
}


KEntrySortUI.prototype.render = function () {
    return new Promise ((resolve, reject) => {
        const store = new KStore('kentry')
        store.query({
            '#and': {
              disabled: '0',
              deleted: '--'
            }
        })
        .then(kentries => {
            let i = -1
            for (const kentry of kentries) {
                if (!this.order[kentry.uid]) {
                    this.order[kentry.uid] = {
                        visible: true
                    }    
                } else {
                    if (this.order[kentry.uid].order > i) {
                        i = this.order[kentry.uid].order
                    }
                }                
            }
            for (const kentry of kentries) {
                if (!this.order[kentry.uid].order) {
                    this.order[kentry.uid].order = ++i
                }                
                this.domNode.firstElementChild.innerHTML += `<div ${!this.order[kentry.uid].visible ? 'class="k-invisible"' : ''} 
                    style="order: ${this.order[kentry.uid].visible ? this.order[kentry.uid].order : '99999'}">
                    <span class="name">${kentry.getCn()}</span><span class="tools">
                        <input tabindex="${this.order[kentry.uid].visible ? parseInt(this.order[kentry.uid].order) + 1 : '99999'}" data-entry-id="${kentry.uid}" type="number" min="-1" step="1" value="${this.order[kentry.uid].visible ? this.order[kentry.uid].order : '-1'}"></input>
                    </span>
                </div>`
            }

            this.domNode.firstElementChild.addEventListener('change', (event) => {
                if (event.target.nodeName !== 'INPUT') { return }
                const input = event.target
                let div = input
                while (div && div.nodeName !== 'DIV') { div = div.parentNode }
                if (input.value < 0) {
                    this.order[input.dataset.entryId].visible = false
                    div.style.setProperty('order', 99999)
                    input.setAttribute('tabindex', 99999)
                    div.classList.add('k-invisible')
                } else {
                    this.order[input.dataset.entryId].order = input.value
                    this.order[input.dataset.entryId].visible = true
                    div.style.setProperty('order', input.value)
                    input.setAttribute('tabindex', parseInt(input.value) + 1)
                    div.classList.remove('k-invisible')
                }

                const currentOrder = JSON.stringify(this.order)
                localStorage.setItem('kairos/kentry-sort', currentOrder)
            })
            const currentOrder = JSON.stringify(this.order)
            localStorage.setItem('kairos/kentry-sort', currentOrder)
            resolve(this.domNode)
        })
    })
}