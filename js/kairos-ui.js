
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

KAIROS.log = function (level, txt, code) {
    var timeout = 10000
    let div = document.createElement('DIV')

    switch (level) {
        case 'info': timeout = 3000
            div.appendChild(document.createElement('I'))
            div.lastChild.setAttribute('class', 'fas fa-info-circle')
            break
        case 'error':
            div.appendChild(document.createElement('I'))
            div.lastChild.setAttribute('class', 'fas fa-times-circle')
            break
        case 'warning':
            div.appendChild(document.createElement('I'))
            div.lastChild.setAttribute('class', 'fas fa-exclamation-circle')
            break
    }

    div.classList.add('message', level)
    if (!code) { code = '' }
    else { code = `(${code})` }
    window.requestAnimationFrame(() => {
        div.appendChild(document.createTextNode(` ${txt} ${code}`))
        document.body.classList.add(`${level}`)
    })

    window.setTimeout(() => {
        window.requestAnimationFrame(() => {
            if (div.parentNode) { div.parentNode.removeChild(div) }
            document.body.classList.remove('info', 'error', 'warning')
        })
    }, timeout)

    div.addEventListener('click', () => {
        window.clearTimeout(timeout)
        div.parentNode.removeChild(div)
        document.body.classList.remove('info', 'error', 'warning')
    })

    window.requestAnimationFrame(() => document.getElementById('LogLine').appendChild(div))
}

KAIROS.stackClosable = function (closeFunction) {
    if (!KAIROS._closables) {
        KAIROS._closables = []
    }

    KAIROS._closables.push(closeFunction)
}

KAIROS.closeNext = function () {
    if (KAIROS._closables) {
        let closeFunction = KAIROS._closables.pop()
        if (closeFunction && closeFunction instanceof Function) {
            closeFunction()
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