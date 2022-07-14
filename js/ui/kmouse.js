/* popup at mouse pointer */
function KMouse (node) {
    if (KMouse._popped !== undefined) {
        const domNode = KMouse._popped
        KMouse._popped = undefined
        try { window.requestAnimationFrame(() => { document.body.removeChild(domNode) }) } catch (_) { /* nothing */ }
    }

    const domNode = document.createElement('DIV')
    domNode.classList.add('kmouse')
    domNode.style.position = 'fixed'
    /*domNode.style.left = `${KAIROS.mouse.clientX + 10}px`
    domNode.style.top = `${KAIROS.mouse.clientY - 10}px`*/
    domNode.style.left = '-1000px';
    domNode.style.top = '-1000px';
    domNode.style.zIndex = KAIROS.zMax()
    domNode.appendChild(node)
    KMouse._popped = domNode
    new Promise((resolve) => {
        window.requestAnimationFrame(() => {
            document.body.appendChild(domNode)
            resolve(domNode.getBoundingClientRect())
        })
    })
    .then(box => {
        let x = KAIROS.mouse.clientX + 20
        if (x + 260 > window.innerWidth) {
            x -= 300;
        }
        window.requestAnimationFrame(() => {
            domNode.style.left =  `${x}px`
            domNode.style.top =  `${KAIROS.mouse.clientY - box.height}px`
        })
    })
}

KMouse.end = function () {
    if (KMouse._popped !== undefined) {
        const node = KMouse._popped
        KMouse._popped = undefined
        try { window.requestAnimationFrame(() => { document.body.removeChild(node) }) } catch (_) { /* nothing */ }
    }
}