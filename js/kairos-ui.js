
KAIROS.mouse = {}
const kMouseFollow = event => {
    KAIROS.mouse.lastX = KAIROS.mouse.clientX ?? event.clientX
    KAIROS.mouse.lastY = KAIROS.mouse.clientY ?? event.clientY
    KAIROS.mouse.clientX = event.clientX
    KAIROS.mouse.clientY = event.clientY
}

const K_INFO = 1
const K_WARN = 2
const K_ERROR = 3

window.addEventListener('mousemove', kMouseFollow)
window.addEventListener('touchmove', kMouseFollow)

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

KAIROS.info = function (txt, code = 0) {
    this.log('info', txt, code)
}

KAIROS.warn = function (txt, code = 0) {
    this.log('warning', txt, code)
}

KAIROS.error = function (txt, code = 0) {
    this.log('error', txt, code)
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
    var timeout = 10000
    let div = document.createElement('DIV')

    switch (level) {
        case K_INFO:
        case 'info': timeout = 3000
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
    KAIROSAnim.push(() => {
        div.appendChild(document.createTextNode(` ${txt} ${code}`))
        document.body.classList.add(`${level}`)
    })

    window.setTimeout(() => {
        KAIROSAnim.push(() => {
            if (div.parentNode) { div.parentNode.removeChild(div) }
            document.body.classList.remove('info', 'error', 'warning')
        })
    }, timeout)

    div.addEventListener('click', () => {
        window.clearTimeout(timeout)
        div.parentNode.removeChild(div)
        document.body.classList.remove('info', 'error', 'warning')
    })

    KAIROSAnim.push(() => document.getElementById('LogLine')?.appendChild(div))
}

KAIROS.stackClosable = function (closeFunction) {
    if (!KAIROS._closables) {
        KAIROS._closables = []
    }
    let idx = KAIROS._closables.length
    KAIROS._closables.push(closeFunction)
    return idx
}

KAIROS.removeClosableFromStack = function (closeFunction) {
    if (!KAIROS._closables) { return }
    if (KAIROS._currentClosable && KAIROS._currentClosable === closeFunction) { return }
    for (let i = 0; i < KAIROS._closables.length; i++) {
        if (KAIROS._closables[i] === closeFunction) {
            KAIROS._closables.splice(i, 1)
            break
        }
    }
}

KAIROS.removeClosableByIdx = function (idx) {
    if (!KAIROS._closables) { return }
    KAIROS._closables.splice(idx, 1)
    if (idx === KAIROS._closables.length) {
        KAIROS._currentClosable = KAIROS._closables[idx - 1]
    }
}

KAIROS.closeNext = function (count = 0) {
    if (KAIROS._closables) {
        let closeFunction = KAIROS._closables.pop()
        if (closeFunction && closeFunction instanceof Function) {
            KAIROS._currentClosable = closeFunction
            try {
                closeFunction()
            } catch (e) {
                if (count < 10) {
                    KAIROS.closeNext(count++)
                } else {
                    console.log('too many closable')
                }
            }
            KAIROS._currentClosable = null
            return true
        }
    }
    return false
}

document.addEventListener('keyup', event => {
    if (event.key === 'Escape') {
        if (event.shiftKey) {
            while (KAIROS.closeNext());
        } else {
            KAIROS.closeNext()
        }
    }
}, {capture: true})

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
    return ++KAIROS.zMax.current
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