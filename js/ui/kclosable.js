function KClosable () {
    if (KClosable.__instance) { return KClosable.__instance }
    this.index = 0
    this.stack = []
    this.mouseDown = false
    this.cancelMouseEvent = false
    window.addEventListener('mousedown', (event) => {
        if (event.button !== 0) { return }
        this.mouseDown = performance.now()
    })
    window.addEventListener('keyup', (event) => {
        if (event.key !== 'Escape') { return }
        if (this.mouseDown) { 
            this.cancelMouseEvent = true
            return
        }
        this.closeNext()
        return
    }, {capture: true})
    window.addEventListener('click', (event) => {
        if (this.cancelMouseEvent) { this.cancelMouseEvent = false; return }
        this.closeNextMouse(event.clientX + window.scrollX, event.clientY + window.scrollY)
        this.mouseDown = false
    }, {capture: true})
    KClosable.__instance = this
}

KClosable.new = function (domNode, options) {
    const kclosable = new KClosable()
    return kclosable.add(domNode, options)
}

KClosable.prototype.remove = function (index) {
    let i = 0;
    for (; i < this.stack.length; i++) {
        if (this.stack.index === parseInt(index)) {
            break
        }
    }
    if (i >= this.stack.length) { return }
    this.stack.splice(i, 1)
}

KClosable.prototype.removeByFunction = function (fn) {
    let i = 0;
    for (; i < this.stack.length; i++) {
        if (this.stack.function === fn) {
            break
        }
    }
    if (i >= this.stack.length) { return }
    this.stack.splice(i, 1)
}

KClosable.prototype.add = function (domNode, options = {}) {
    const index = ++this.index
    const closable = {
        index: index,
        time: performance.now(),
        domNode: domNode
    }
    if (options.mouse) {
        closable.mouse = true
    }
    if (options.function) {
        closable.function = options.function
    }
    if (options.object) {
        closable.object = options.object
    }
    if (options.parent) {
        closable.parent = options.parent
    }
    this.stack.unshift(closable)
    return index
}

KClosable.prototype.closeNextMouse = function (x, y, origin = 0) {
    let i = origin
    for (; i < this.stack.length; i++) {
        if (this.stack[i].mouse && this.stack[i].domNode && this.stack[i].time < (this.mouseDown === false ? performance.now() : this.mouseDown)) {
            break
        }
    }

    if (i >= this.stack.length) { return }
    const closable = this.stack[i]
    
    let close = false

    if (!this.isClickInNode(x, y, closable.domNode)) {
        close = true
        if (closable.parent) {
            if (close && !this.isClickInNode(x, y, closable.parent)) { close = true}
            else { close = false }
        }
    }
    
    if (close) {
        this.stack.splice(i, 1)
        if (!this.closeClosable(closable)) {
            if (this.stack.length > 0) { this.closeNextMouse(x, y, ++i) }
        }
    } else {
        if (this.stack.length > 0) { this.closeNextMouse(x, y, ++i) }
    }
}

KClosable.prototype.isClickInNode = function (x, y, node) {
    const rect = node.getBoundingClientRect()
    const left = rect.left + window.scrollX
    const right = rect.right + window.scrollX
    const top = rect.top + window.scrollY
    const bottom = rect.bottom + window.scrollY
    return (left <= x && right >= x && top <= y && bottom >= y)
}

KClosable.prototype.closeClosable = function (closable) {
    if (!closable) { return false }
    if (closable.function) {
        if (!closable.function()) {
            return false
        }
        return true
    }
    if (closable.object) {
        if (!closable.dispatchEvent(new CustomEvent('close'))) {
            return false
        }
        return true
    }
    if (closable.domNode) {
        if (!closable.domNode.parentNode) {
            return false
        }
        window.requestAnimationFrame(() => {
            closable.domNode.parentNode.removeChild(closable.domNode)
        })
        return true
    }
    return false
}

KClosable.prototype.closeNext = function () {
    const closable = this.stack.shift()

    if (!this.closeClosable(closable)) {
        if (this.stack.length > 0) { this.closeNext() }
    }
}