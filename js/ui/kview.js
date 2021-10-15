/* global view object */
function KView () {
    if (KView._instance) { return KView._instance }
    this.data = new Map()
    this.currentBox = [-1, -1]
    this.eventTarget = new EventTarget()
    window.addEventListener('mousemove', this.handleMouseMove.bind(this), {capture: true, passive: true})
    KView._instance = this
}

KView.prototype.addEventListener = function (event, listener, options) {
    this.eventTarget.addEventListener(event, listener, options)
}

/* compute values when some value changes */
KView.prototype.compute = function () {
    const daysec = 86400

    if (this.data.has('viewport-width') && this.data.has('day-count')) {
        const viewportWidth = this.data.get('viewport-width')
        const dayCount = this.data.get('day-count')
        const dayWidth = viewportWidth / dayCount
        const secondWidth = dayWidth / daysec

        this.data.set('day-width', dayWidth)
        this.data.set('second-width', secondWidth)
    }

    if (this.data.has('entry-height') && this.data.has('entry-count')) {
        const entries = this.data.get('entry-height')
        const count = this.data.get('entry-count')
        this.data.set('viewport-height', entries * count)
    }
}

KView.prototype.setMargins = function (top, right, bottom, left) {
    this.data.set('margin-left', left)
    this.data.set('margin-right', right)
    this.data.set('margin-top', top)
    this.data.set('margin-bottom', bottom)
}

KView.prototype.get = function (name) {
    return this.data.get(name)
}

KView.prototype.setDayCount = function (days) {
    this.data.set('day-count', days)
    this.compute()
}

KView.prototype.setViewportWidth = function (width) {
    this.data.set('viewport-width', width)
    this.compute()
}

KView.prototype.setViewportHeight = function (height) {
    this.data.set('viewport-height', height)
    this.compute()
}

KView.prototype.setViewport = function (width, height) {
    this.data.set('viewport-width', width)
    this.data.set('viewport-height', height)
    this.compute()
}

KView.prototype.setEntryHeight = function (height) {
    this.data.set('entry-height', height)
    this.compute()
}

KView.prototype.setEntryCount = function (entries) {
    this.data.set('entry-count', entries)
    this.compute()
}

KView.prototype.handleMouseMove = function (event) {
    const marginLeft = this.data.get('margin-left') || 0
    const marginRight = this.data.get('margin-right') || 0
    const marginTop = this.data.get('margin-top') || 0
    const marginBottom = this.data.get('margin-bottom') || 0

    const previousBox = [this.currentBox[0], this.currentBox[1]]
    const currentBox = [-1, -1]

    if (event.clientX > marginLeft && event.clientX < window.innerWidth - marginRight) {
        const xpos = event.pageX - (marginLeft + marginRight)
        currentBox[0] = Math.floor(xpos / this.data.get('day-width'))
    }

    if (event.clientY < window.innerHeight - marginBottom && event.clientY > marginTop) {
        const ypos = event.pageY - (marginTop + marginBottom)
        currentBox[1] = Math.floor(ypos / this.data.get('entry-height'))
    }

    if (currentBox[0] !== this.currentBox[0]) {
        this.currentBox[0] = currentBox[0]
    }
    if (currentBox[1] !== this.currentBox[1]) {
        this.currentBox[1] = currentBox[1]
    }

    if (currentBox[0] > -1 && currentBox[1] > -1) {
        if (currentBox[1] != previousBox[1]) { this.eventTarget.dispatchEvent(new CustomEvent('EnterRow', {detail: {currentRow: this.currentBox[1], previousRow: previousBox[1]}})) }
        if (currentBox[0] != previousBox[0]) { this.eventTarget.dispatchEvent(new CustomEvent('EnterColumn', {detail: {currentColumn: this.currentBox[0], previousColumn: previousBox[0]}})) }
    }
}