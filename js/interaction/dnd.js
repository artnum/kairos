function DnD(element0) {
    this.elements = new Map()
    this.element0 = element0
    this.box0 = element0.getBoundingClientRect()
    const klosable = new KClosable()
    klosable.add(null, {function: this.cancel.bind(this)})
    this.eventInstalled = false
    if (!DnD._prefix) {
        DnD._prefix = String(Math.round(Math.random() * 999999))
        DnD._id = 0
    }
}

DnD.prototype.genId = function () {
    return `DnD-${String(this.prefix).padStart(6, '0')}${String(++DnD._id).padStart(9, '0')}`
}

DnD.prototype.followMouse = function (event) {
    if (this.elements.size > 0) {
        if (document.selection && document.selection.empty) {
            document.selection.empty()
        }
        if (window.getSelection) {
            window.getSelection().removeAllRanges()
        }
        this.moveElements(event.clientX, event.clientY)
    }
}

DnD.prototype.addMultiSelect = function (multi, mouseX, mouseY) {
    for (const node of multi.getAll()) {
        this.add(node, mouseX, mouseY)
    }
}

DnD.prototype.add = function (element, mouseX, mouseY) {
    const getZIndex = function (element) {
        if (!element || !(element instanceof HTMLElement)) { return 0 }
        const z = document.defaultView.getComputedStyle(element).getPropertyValue('z-index')
        if (isNaN(z)) { return getZIndex(element.parentNode) }
        return parseInt(z)
    }
    this.element0.dataset.originX = mouseX
    this.element0.dataset.originY = mouseY
    if (!this.eventInstalled) {
        this.eventInstalled = true
        window.addEventListener('mousemove', this.followMouse.bind(this), {passive: true})
        window.addEventListener('mouseup', this.drop.bind(this), {passive: true})
    }
    const copy = element.cloneNode(true)
    const box = element.getBoundingClientRect()
    copy.id = this.genId()
    copy.style.setProperty('opacity', 0.5)
    copy.style.setProperty('position', 'fixed')
    copy.style.setProperty('top', `${box.top}px`)
    copy.style.setProperty('left', `${box.left}px`)
    copy.style.setProperty('user-select', 'none')
    copy.style.setProperty('pointer-events', 'none')
    copy.style.setProperty('z-index', getZIndex(element) + 1)
    copy.style.setProperty('transform', 'translate(-5px, -5px)') // starts with a slight offset for visual clue
    copy.dataset.originX = mouseX
    copy.dataset.originY = mouseY
    this.elements.set(copy.id, [copy, element])
    element.dispatchEvent(new CustomEvent('dragstart', {detail: this}))
    window.requestAnimationFrame(() => { document.body.appendChild(copy) })
}

DnD.prototype.endVisual = function (animate = true) {
    return new Promise(resolve => {
        const promises = []
        for (const [_, nodes] of this.elements) {
            const node = nodes[0]
            promises.push(new Promise((resolve) => {
                if (animate) {
                    window.requestAnimationFrame(() => {
                        node.style.setProperty('transition', 'transform 1s');
                        node.style.setProperty('transform', 'translate(-5px, -5px)');
                        resolve() 
                    })
                    setTimeout(() => {
                        window.requestAnimationFrame(() => {
                            node.parentNode.removeChild(node)
                        })
                    }, 1050)
                } else {
                    window.requestAnimationFrame(() => {
                        node.parentNode.removeChild(node)
                    })
                }
            }))
        }
        this.elements.clear()
        window.removeEventListener('mousemove', this.followMouse.bind(this), {passive: true})
        window.removeEventListener('mouseup', this.drop.bind(this), {passive: true})
        Promise.all(promises)
        .then(_ => {
            resolve()
        })
    })
}

DnD.prototype.drop = function (event) {
    const points = []
    const offsetX = parseInt(this.element0.dataset.originX) - this.box0.left
    const offsetY = parseInt(this.element0.dataset.originY) - this.box0.top

    for (const [_, nodes] of this.elements) {
        const translateX = event.clientX - parseInt(nodes[0].dataset.originX)
        const translateY = event.clientY - parseInt(nodes[0].dataset.originY) + offsetY
        const boxStart = nodes[1].getBoundingClientRect()

        points.push([boxStart.left + translateX, boxStart.top + translateY, nodes[1]])
    }

    let failed = false
    const notFailed = []
    for (const point of points) {
        const element = document.elementFromPoint(point[0], point[1])
        if (!element) {
            break
        }
        notFailed.push([element, point[2], point[0], point[1]])
    }
    if (failed) { this.cancel() }
    else {
        for (const x of notFailed) {
            const evt = {bubbles: true, detail: {element: x[1], x: x[2], y: x[3]}}
            for (const k of ['ctrlKey', 'shiftKey', 'metaKey', 'altKey']) {
                console.log(k, event[k])
                evt.detail[k] = event[k]
            }
            console.log(evt)
            x[0].dispatchEvent(new CustomEvent('dnd-drop', evt))
            x[1].dispatchEvent(new CustomEvent('dragend'), {detail: this})
        }
        this.endVisual(false)
    }
}

DnD.prototype.cancel = function () {
    this.endVisual()
    .then(_ => {
        for (const [_, nodes] of this.elements) {
            nodes[1].dispatchEvent(new CustomEvent('dragend'), {detail: this})
        }
        this.clearDnD()
    })
}

DnD.prototype.clearDnD = function () {
}

DnD.prototype.moveElements = function (mouseX, mouseY) {
    for (const [_, nodes] of this.elements) {
        const node = nodes[0]
        const translateX = mouseX - parseInt(node.dataset.originX)
        const translateY = mouseY - parseInt(node.dataset.originY)

        window.requestAnimationFrame(() => {
            node.style.setProperty('transform', `translate(${translateX}px, ${translateY}px)`)
        })
    }
}