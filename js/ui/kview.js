/* global view object */
function KView () {
    if (KView._instance) { return KView._instance }
    this.data = new Map()
    this.currentBox = [-1, -1]
    this.eventTarget = new EventTarget()
    this.mouseHandlerRun = false
    window.addEventListener('keydown', this.handleKeyMove.bind(this), {capture: true})
    window.addEventListener('mousemove', this.startMouseHandler.bind(this), {capture: true, passive: true})
    KView._instance = this
}

KView.prototype.addEventListener = function (event, listener, options) {
    this.eventTarget.addEventListener(event, listener, options)
}

KView.prototype.startMouseHandler = function () {
    if (this.mouseHandlerRun) { return }
    this.mouseHandlerRun = true
    this.handleMouseMove()
}

KView.prototype.stopMouseHandler = function () {
    this.mouseHandlerRun = false
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

KView.prototype.move = function (days) {
    this.eventTarget.dispatchEvent(new CustomEvent('move', {detail: {left: days * this.data.get('day-width')}}))
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

KView.prototype.setEntryInnerHeight = function (height) {
    this.data.set('entry-inner-height', height)
    this.compute()
}

KView.prototype.setEntryCount = function (entries) {
    this.data.set('entry-count', entries)
    this.compute()
}

KView.prototype.computeXBox = function (xpos) {
    return Math.floor((xpos - this.get('margin-left')) / this.data.get('day-width'))
}

KView.prototype.handleMouseMove = function () {
    if (!this.mouseHandlerRun) { return }
    const marginLeft = this.data.get('margin-left') || 0
    const marginRight = this.data.get('margin-right') || 0
    const marginTop = this.data.get('margin-top') || 0
    const marginBottom = this.data.get('margin-bottom') || 0

    const previousBox = [this.currentBox[0], this.currentBox[1]]
    const currentBox = [-1, -1]
    const start = performance.now()
    new Promise(resolve => {
        if (KAIROS.mouse.clientX > marginLeft && KAIROS.mouse.clientX < window.innerWidth - marginRight) {
            const xpos = (KAIROS.mouse.clientX + window.scrollX) - (marginLeft + marginRight)
            currentBox[0] = Math.floor(xpos / this.data.get('day-width'))
        }
        
        const ypos = KAIROS.mouse.clientY - marginTop
        currentBox[1] = Math.floor(ypos / this.data.get('entry-height'))

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
        resolve()
    })
    .then(_ => {
        const duration = performance.now() - start
        setTimeout(this.handleMouseMove.bind(this), 100 - duration)
        return
    })
}

KView.prototype.handleKeyMove = function (event) {
    const nextBox = [0, 0]
    switch (event.key) {
        default: return
        case 'Down':
        case 'ArrowDown':
            if (event.shiftKey) {
                nextBox[1] = Math.round(this.get('entry-count') / 3)
            } else {
                nextBox[1] = 1
            }
            event.preventDefault()
            break
        case 'Up':
        case 'ArrowUp':
            if (event.shiftKey) {
                nextBox[1] = -Math.round(this.get('entry-count') / 3)
            } else {
                nextBox[1] = -1
            }
            event.preventDefault()
            break
        case 'Left':
        case 'ArrowLeft':
            if (event.shiftKey) {
                nextBox[0] = -Math.round(this.get('day-count') / 3)
            } else {
                nextBox[0] = -1
            }
            event.preventDefault()
            break
        case 'Right':
        case 'ArrowRight':
            if (event.shiftKey) {
                nextBox[0] = Math.round(this.get('day-count') / 3)
            } else {
                nextBox[0] = 1
            }
            event.preventDefault()
            break
        case 'PageUp':
            event.preventDefault()
            if (event.shiftKey) {
                this.eventTarget.dispatchEvent(new CustomEvent('requestDayMove', {detail: {days: 7}}))
            } else {
                this.eventTarget.dispatchEvent(new CustomEvent('requestDayMove', {detail: {days: 3}}))
            }
            return
        case 'PageDown':
            event.preventDefault()
            if (event.shiftKey) {
                this.eventTarget.dispatchEvent(new CustomEvent('requestDayMove', {detail: {days: -7}}))
            } else {
                this.eventTarget.dispatchEvent(new CustomEvent('requestDayMove', {detail: {days: -3}}))
            }
            return
        case 'End':
            event.preventDefault()
            nextBox[1] = this.get('entry-count') - 1 - this.currentBox[1]
            break
        case 'Home':
            event.preventDefault()
            nextBox[1] = -this.currentBox[1]
            break
    }
    this.stopMouseHandler()
    if (!this.currentBox[0]) { this.currentBox[0] = 0 }
    if (!this.currentBox[1]) { this.currentBox[1] = 0 }
    this.currentBox[0] += nextBox[0]
    this.currentBox[1] += nextBox[1]
    if (this.currentBox[0] < 0) { this.currentBox[0] = this.get('day-count') - 1 }
    if (this.currentBox[1] < 0) { this.currentBox[1] }

    if (this.currentBox[0] > this.get('day-count') - 1) {
        this.currentBox[0] = 0
    }

    
    if (this.currentBox[1] > this.get('entry-count') - 1) {
        this.currentBox[1] = 0
    }

    if (this.currentBox[1] < 0) {
        this.currentBox[1] = this.get('entry-count') -1 
    }

    const pxYPos = this.currentBox[1] * this.get('entry-height') + this.get('margin-top')
    if ( pxYPos > document.documentElement.clientHeight + window.scrollY - this.get('entry-height') || pxYPos < window.scrollY + this.get('entry-height')) {
        let scrollY = this.currentBox[1] / 2 * this.get('entry-height') + this.get('margin-top')
        if (scrollY < document.documentElement.clientHeight / 2) {
            scrollY = 0
        }
        window.scroll(0, scrollY)
    }

    this.eventTarget.dispatchEvent(new CustomEvent('EnterRow', {detail: {currentRow: this.currentBox[1], previousRow: this.currentBox[1] - nextBox[1]}}))
    this.eventTarget.dispatchEvent(new CustomEvent('EnterColumn', {detail: {currentColumn: this.currentBox[0], previousColumn: this.currentBox[0] - nextBox[0]}}))
}

KView.prototype.getCurrentBox = function () {
    return {x: this.currentBox[0], y: this.currentBox[1]}
}