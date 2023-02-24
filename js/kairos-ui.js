
KAIROS.debounce = function (callback, timeout = 250) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => { callback.apply(this, args) }, timeout)
    }
}

KAIROS.mouse = {follow: new Map(), index: 0}
const kMouseFollow = event => {
    if (kMouseFollow._last_start) {
        if (performance.now() - kMouseFollow._last_start < 50) { return }
    }
    kMouseFollow._last_start = performance.now()
    KAIROS.mouse.lastX = KAIROS.mouse.clientX ?? (event.pageY || event.clientX)
    KAIROS.mouse.lastY = KAIROS.mouse.clientY ?? (event.pageY || event.clientY)
    KAIROS.mouse.clientX = event.pageX || event.clientX 
    KAIROS.mouse.clientY = event.pageY || event.clientY
    for (const [_, cb] of KAIROS.mouse.follow) {
        cb(KAIROS.mouse)
    }
}

const K_INFO = 1
const K_WARN = 2
const K_ERROR = 3

KAIROS.lastInputBlured = []

/* a transparent image to use when needed */
KAIROS.transImg = new Image();
KAIROS.transImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAADklEQVQIHQEDAPz/AAAAAAMAAW7VSZoAAAAASUVORK5CYII=';

window.addEventListener('k-message', event => {
    switch (event.detail.type) {
        default:
        case 'error':
            return KAIROS.error(event.detail.content)
        case 'warning':
            return KAIROS.warn(event.detail.content)
        case 'info':
            return KAIROS.info(event.detail.content)
    }
})
window.addEventListener('mousemove', kMouseFollow)
window.addEventListener('touchmove', kMouseFollow)
window.addEventListener('dragover', kMouseFollow)
window.addEventListener('wheel', kMouseFollow)
window.addEventListener('keydown', (event) => {
    if (
        event.target instanceof HTMLInputElement
        || event.target instanceof HTMLTextAreaElement
        || event.target instanceof HTMLButtonElement
        || event.target instanceof HTMLFormElement
        || event.target instanceof HTMLSelectElement
       ) 
    {       
        switch(event.key) {
            case 'Escape':
                KAIROS.lastInputBlured.push(event.target)
                event.target.blur()
                return
            case 'Tab':
                if (KAIROS.lastInputBlured.length > 0) {
                    let node
                    do { 
                        node = KAIROS.lastInputBlured.pop()
                    } while(node && !document.body.contains(node))
                    if (node) {
                        node.focus()
                        event.preventDefault()
                    }
                }
                return
            default:
                if (!event.target.dispatchEvent(
                    new KeyboardEvent('global-keypress', event))
                ) {
                    event.preventDefault()
                }
                return
        }
    }
    switch(event.key) {
        case 'Tab':
            if (KAIROS.lastInputBlured.length > 0) {
                let node
                do { 
                    node = KAIROS.lastInputBlured.pop()
                } while(!document.body.contains(node))
                if (node) {
                    node.focus()
                    event.preventDefault()
                }
            }
            return
        case 'F2':
            return new KCommandOverlay()
        case 'F5':
            if (event.ctrlKey) {
                KAIROS.abortAllRequest()
            } else {
                event.preventDefault()
            }
            return
        default:
            if (!event.target.dispatchEvent(
                new KeyboardEvent('global-keypress', event))
            ) {
                event.preventDefault()
            }
            return
    }
})


KAIROS.clearSelection = function () {
    if (document.selection && document.selection.empty) {
        document.selection.empty()
        return;
    }
    if (window.getSelection) {
        window.getSelection().removeAllRanges()
        return
    }
}

KAIROS.addFollowMouse = function (callback) {
    const idx = KAIROS.mouse.index++
    KAIROS.mouse.follow.set(idx, callback)
    return idx
}

KAIROS.removeFollowMouse = function (index) {
    KAIROS.mouse.follow.delete(index)

}

KAIROS.info = function (txt, code = 0) {
    this.log('info', txt, code)
}

KAIROS.warn = function (txt, code = 0) {
    this.log('warning', txt, code)
}

KAIROS.error = function (msg, code = 0) {
    const txt = msg instanceof Error ? msg.message : msg
    if (KError[txt]) {
        this.log('error', KError[txt].fr, code)
    } else {
        this.log('error', txt, code)
    }
    console.group('Erreur')
    console.log(txt, code)
    console.trace()
    console.groupEnd()
}

KAIROS.catch = function (reason, message = '', level = K_ERROR, code = 0) {
    console.log(reason)
    this.log(level, message, code)
}

KAIROS.log = function (level, txt, code) {
    let timeout = 10000
    let div 
    if (!KAIROS.log._history) {
        KAIROS.log._history = new Map()
    }

    let count = 0
    if (KAIROS.log._history.has(txt)) {
        const history = KAIROS.log._history.get(txt)
        div = history.domNode
        div.innerHTML = ''
        count = ++history.count
        clearTimeout(history.timeout)
        timeout = window.setTimeout(() => {
            if (div.parentNode) { div.parentNode.removeChild(div) }
            document.body.classList.remove('info', 'error', 'warning')
            KAIROS.log._history.delete  (txt)
        }, timeout)
        KAIROS.log._history.set(txt, {
            domNode: div,
            count,
            timeout
        })
    } else {
        div = document.createElement('DIV')
        div.dataset.txt = txt
        timeout = window.setTimeout(() => {
            if (div.parentNode) { div.parentNode.removeChild(div) }
            document.body.classList.remove('info', 'error', 'warning')
            KAIROS.log._history.delete(txt)
        }, timeout)
        div.addEventListener('click', event => {
            const history = KAIROS.log._history.get(event.target.dataset.txt)
            window.clearTimeout(history.timeout)
            history.domNode.parentNode.removeChild(history.domNode)
            document.body.classList.remove('info', 'error', 'warning')
            KAIROS.log._history.delete(event.target.dataset.txt)
        })
    
        KAIROS.log._history.set(txt, {
            domNode: div,
            count: 1,
            timeout
        })
    }

    switch (level) {
        case K_INFO:
        case 'info':
            div.appendChild(document.createElement('I'))
            div.lastChild.setAttribute('class', 'fas fa-info-circle')
            break
        case K_ERROR:
        case 'error':
            div.appendChild(document.createElement('I'))
            div.lastChild.setAttribute('class', 'fas fa-times-circle')
            break
        case K_WARN:
        case 'warning':
            div.appendChild(document.createElement('I'))
            div.lastChild.setAttribute('class', 'fas fa-exclamation-circle')
            break
    }

    div.classList.add('message', level)
    if (!code) { code = '' }
    else { code = `(${code})` }

    div.innerHTML += count > 1 ? ` ${txt} ${code} (${count})` : ` ${txt} ${code}`
    document.body.classList.add(`${level}`)

    const logLine = document.getElementById('LogLine')
    const zmax = KAIROS.zMax() * 2
    window.requestAnimationFrame(() => { 
        logLine.style.setProperty('z-index', zmax)
        logLine.appendChild(div)
    })
}

KAIROS.stackClosable = function (closeFunction) {
    const closables = new KClosable()
    return closables.add(null, {function: closeFunction})
}

KAIROS.removeClosableFromStack = function (closeFunction) {
    const closables = new KClosable()
    return closables.removeByFunction(closeFunction)
}

KAIROS.removeClosableByIdx = function (idx) {
    const closables = new KClosable()
    return closables.remove(idx)
}

KAIROS.closeNext = function (count = 0) {
    const closables = new KClosable()
    return closables.closeNext()
}

window.addEventListener('global-keypress', event => {
    switch (event.key) {
        case 'F6':
            event.preventDefault()
            const cutTool = KAIROS.getState('cutToolActive')
            if (cutTool) { KAIROS.unsetState('cutToolActive') }
            else { KAIROS.setState('cutToolActive', true)}
            break
    }
})

KAIROS.searchResults = function () {
    let closeSearchResult = function () {
        if (!KAIROS.searchResults.box) { return }
        if (!KAIROS.searchResults.box.parentNode) { return }
        if (KAIROS.searchResults.boxDelete) { return }
        KAIROS.searchResults.boxDelete = 1
        KAIROSAnim.push(() => { 
            KAIROS.searchResults.box.parentNode.removeChild(KAIROS.searchResults.box) 
            delete KAIROS.searchResults.boxDelete
        })
    }
    if (KAIROS.searchResults.box) {
        closeSearchResult()
        KAIROS.removeClosableFromStack(closeSearchResult)
    }
    
    KAIROS.searchResults.box = document.createElement('DIV')
    KAIROS.searchResults.box.classList.add('searchResult')
    KAIROS.searchResults.box.style.setProperty('z-index', KAIROS.zMax())
    KAIROS.stackClosable(closeSearchResult)
    KAIROSAnim.push(() => { document.body.appendChild(KAIROS.searchResults.box) })


    return KAIROS.searchResults.box
}

KAIROS.zMax = function (node = null) {
    if (KAIROS.zMax.current === undefined) {
        KAIROS.zMax.current = 1000
    }
    if (KAIROS.zMax.current > 9999) {
        KAIROS.zMax.current = 1000
    }

    const max = ++KAIROS.zMax.current
    if (KAIROS.keepAtTop.list) {
        const currentList = KAIROS.keepAtTop.list
        KAIROS.keepAtTop.list = []
        for (const n of currentList) {
            if (!n.parentNode) { continue }
            KAIROS.keepAtTop.list.push(n)
            window.requestAnimationFrame(() => { n.style.setProperty('z-index', ++KAIROS.zMax.current) })
        }
    }

    return max
}

KAIROS.keepAtTop = function (node) {
    if (!KAIROS.keepAtTop.list) {
        KAIROS.keepAtTop.list = []
    }
    /* kattop is set on node to avoid having a node several time in the list */
    if (node.dataset.kattop) { return }
    node.dataset.kattop = '1'
    KAIROS.keepAtTop.list.push(node)
}

KAIROS.setAtTop = function (node) {
    if (node instanceof HTMLElement) {
        window.requestAnimationFrame(() => { node.style.setProperty('z-index', KAIROS.zMax()) })
    }
}

KAIROS._domStack = []
KAIROS.replace = function (parent, newNode, oldNode) {
    KAIROS._domStack.push(['replace', parent, newNode, oldNode])
    KAIROS._pstack()
}

KAIROS.remove = function (parent, node) {
    KAIROS._domStack.push(['remove', parent, node, null])
    KAIROS._pstack()
}

KAIROS.insert = function (parent, node, before = null) {
    KAIROS._domStack.push(['insert', parent, node, before])
    KAIROS._pstack()
}

KAIROS._pstack = function (force = false) {
    if (!force && KAIROS._pstack.run) {
        return
    }
    KAIROS._pstack.run = true
    KAIROSAnim.push((ts) => {
        let start = performance.now()
        let p 
        while ((p = KAIROS._domStack.shift()) !== undefined && performance.now() - start < 10) {
            switch(p[0]) {
                case 'insert': 
                    p[1].insertBefore(p[2], p[3])
                    break
                case 'remove':
                    p[1].removeChild(p[2])
                    break
                case 'replace':
                    p[1].replaceChild(p[2], p[3]);
            }
        }
    })
    .then(() => {
        if (KAIROS._domStack.length > 0) {
            KAIROS._pstack(true)
        } else {
            KAIROS._pstack.run = false
        }

    })
}

KAIROS.openWindow = function (title) {
    return new Promise((resolve, reject) => {
        const win = new KPopup(title, {closable: true, isWindow: true})
        win.open().then(domNode => {
            resolve([domNode, document])
        })
    })
}

KAIROS.confirm = function(title, message, opts) {
    return new Promise((resolve, reject) => {
        const win = new KPopup(title, opts)
        const content = document.createElement('P')
        content.innerHTML = message
        const yes = document.createElement('BUTTON')
        yes.innerHTML = 'Oui'
        const no = document.createElement('BUTTON')
        no.innerHTML = 'Non'

        win.addEventListener('close', event => { resolve(false) })
        yes.addEventListener('click', event => { win.close(); resolve(true) })
        no.addEventListener('click', event => { win.close();resolve(false) })

        content.appendChild(yes)
        content.appendChild(no)
        win.setContentDiv(content)
        win.open()
    })
}

KAIROS.images = {}
KAIROS.images.move = new Image()
KAIROS.images.move.src = '../resources/images/move-reservation.png'