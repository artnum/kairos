function KCornerBox () {
    if (KCornerBox._instance) { return KCornerBox._instance }
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('k-corner-box')
    this.domNode.innerHTML = '<input name="groups" />'
    this.domNode.style.setProperty('z-index', KAIROS.zMax())
    window.requestAnimationFrame(() => document.body.appendChild(this.domNode))
    this.render()
    KCornerBox._instance = this
}


KCornerBox.prototype.render = function () {
    const groupInput = this.domNode.querySelector('input[name="groups"]')
    groupInput.addEventListener('change', event => {
        const value = event.target.dataset.value
        const kv = new KView()

        if (value === '###') {
            kv.rowDescription.forEach((row, idx) => {
                kv.showRow(idx)
            })
            kv.rowDescription.map(row => row[1].KUI.applyState() )
            return kv._directRender()
        }
        
        KAIROS.fetch2(KAIROS.URL(`${KAIROS.kaalURL}/GroupUser/_query`), {method: 'POST', body: {group: value}})
        .then(users => {
            users = users.map(u => u.user)
            kv.rowDescription.forEach((row, idx) => {
                if (users.indexOf(row[1].id) === -1) { kv.hideRow(idx) }
                else { kv.showRow(idx) }
            })
            return Promise.allSettled(kv.rowDescription.map(row => row[1].KUI.applyState()))
        })
        .then(_ => {
            kv._directRender()
        })
    })
    const groups = new KSelectUI(
        groupInput, 
        new GroupStore(KAIROS.URL(`${KAIROS.kaalURL}/Group`)),
        {attribute: 'name', noneElement: true}
    )

}

