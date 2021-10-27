function KUIReservation (object) {
    this.data = new KField({}, object)
    this.props = new Map()
    this.Viewport = new KView()
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('kreservation')
}

KUIReservation.prototype.reload = function (object) {

}

KUIReservation.prototype.render = function () {
    return new Promise((resolve, reject) => {
        this.data.gets(['uuid', 'begin', 'end', 'deliveryBegin', 'deliveryEnd'])
        .then(values => {
            let deliveryBegin = values.get('deliveryBegin')
            if (!deliveryBegin) { deliveryBegin = values.get('begin').getTime() }
            let deliveryEnd = values.get('deliveryEnd')
            if (!deliveryEnd) { deliveryEnd = values.get('end').getTime() }
            const begin = values.get('begin').getTime()
            const end = values.get('end').getTime()

            this.props.set('min', begin < deliveryBegin ? begin : deliveryBegin)
            this.props.set('max', end > deliveryEnd ? end : deliveryEnd)
            this.props.set('length', this.props.get('max') - this.props.get('min'))
            this.props.set('width', this.Viewport.get('second-width') * this.props.get('length'))
            this.domNode.style.width = `${this.props.get('width').toPrecision(2)}px`
            this.domNode.style.height = `${this.Viewport.get('entry-height').toPrecision(2)}px`
            this.domNode.setAttribute('draggable', true)
            this.domNode.id = values.get('uuid')
            this.domNode.addEventListener('mousedown', (event) => {
                event.stopPropagation()
            }, {passive: true})
            resolve(this.domNode)
        })
    })
}