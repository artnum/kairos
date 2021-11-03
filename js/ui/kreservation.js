function KUIReservation (object) {
    //this.data = new KField({}, object)
    this.object = object
    this.props = new Map()
    this.Viewport = new KView()
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('kreservation')
    this.object.addEventListener('update', event => {
        this.render()
    })
}

KUIReservation.prototype.reload = function (object) {

}

KUIReservation.prototype.render = function () {
    return new Promise((resolve, reject) => {
        window.requestAnimationFrame(() => {
            const affaire = this.object.getRelation('kaffaire')
            this.domNode.innerHTML = `${affaire.getCn()}`
            let deliveryBegin = null //new Date(this.object.get('deliveryBegin'))

            if (!deliveryBegin) { deliveryBegin = new Date(this.object.get('begin')).getTime() }
            let deliveryEnd = null //new Date(this.object.get('deliveryEnd'))
            if (!deliveryEnd) { deliveryEnd = new Date(this.object.get('end')).getTime() }
            const begin = new Date(this.object.get('begin')).getTime()
            const end = new Date(this.object.get('end')).getTime()

            this.props.set('min', begin < deliveryBegin ? begin : deliveryBegin)
            this.props.set('max', end > deliveryEnd ? end : deliveryEnd)
            this.props.set('length', this.props.get('max') - this.props.get('min'))
            this.props.set('width', this.Viewport.get('second-width') * this.props.get('length'))
            this.domNode.style.width = `${this.props.get('width').toPrecision(2)}px`
            this.domNode.style.height = `${this.Viewport.get('entry-height').toPrecision(2)}px`
            this.domNode.setAttribute('draggable', true)
            this.domNode.id = this.object.get('uuid')
            this.domNode.addEventListener('mousedown', (event) => {
                event.stopPropagation()
            }, {passive: true})
            resolve(this.domNode)
        })
    })
}   