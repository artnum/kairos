importScripts('../../conf/app.js')

const Kache = new Map()
const Pending = new Map()
let Nocache = false
const authToken = location.search.substring(1) || ''
let concurrency = 0


function onMessageFetch (msg) {
    if (!msg.options) {
        msg.options = {}
    }
    if (msg.options.body) {
        if (msg.options.body instanceof Object) {
            msg.options.body = JSON.stringify(msg.options.body)
            if (!msg.options.headers) {
                msg.options.headers = new Headers()
            }
            msg.options.headers.set('Content-Type', 'application/json')
        }
    }
    msg.options.keepalive = true
    genCacheId(msg.url, msg.options.body ?? '')
    .then(reqCacheId => {
        const request = new Request(msg.url, msg.options)
        return doFetch(reqCacheId, request)
    })
    .then(([content, contentType, requestId, status]) => {
        self.postMessage({
            op: 'fetch',
            id: msg.id,
            error: false, 
            content: content,
            status: status,
            headers: {
                'Content-Type': contentType,
                'X-Request-Id': requestId
            }
        })
    })
    .catch(reason => {
        let msg = reason
        if (reason instanceof Error) {  msg = reason.message }
        self.postMessage({
            op: 'fetch',
            id: msg.id,
            error: true,
            content: msg,
            headers: {
                'Content-Type': 'text/plain'
            }
        })
    })
}

const msgStack = []
self.onmessage = function (msgEvent) {
    const msg = msgEvent.data
    if (!msg) { return }
    switch(msg.op) {
        case 'nocache':
            Nocache = true
            break
        case 'clearcache':
            return markCacheDirty()
        case 'query':
        case 'fetch': {
            msgStack.push(msg)
        }
        break
    }
}

function consumeMsgStack () {
    while (concurrency < 100 && msgStack.length > 0) {
        const msg = msgStack.shift()
        onMessageFetch(msg)
        concurrency++
    }
    concurrency = 0
    setTimeout(consumeMsgStack, 100)
}
consumeMsgStack()

function contentTypeParse (contentType) {
    if (!contentType) { return '' }
    return String(contentType).trim().split(';')[0].trim()
}

function cacheControlParse (cacheControl) {
    if (!cacheControl) { return 0 }
    const ccParts = String(cacheControl).trim().split(',').map(v => { return v.trim() })
    if (ccParts.indexOf('no-store')) { return 0 }
    let maxAge = 0
    for (const directive of ccParts) {
        if (directive.search('max-age')) {
            const dParts = directive.split('=')
            if (dParts.length === 2) {
                maxAge = parseInt(dParts[1].trim())
                if (isNaN(maxAge)) { maxAge = 0 }
            }
        }
    }
    return maxAge * 1000 // getTime is in ms
}

function getCacheObject (url) {
    const root = Kache.get(`${url.protocol}${url.hostname}`)
    if (root === undefined) {
        const root = new Map()
        Kache.set(`${url.protocol}${url.hostname}`, root)
        return root
    }
    return root
}

function buf2hex (buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

function genRequestId (cacheReqId, dateRequestBegin) {    
    return buf2hex(new TextEncoder().encode(`${cacheReqId}${dateRequestBegin.toISOString()}`))
}

function genCacheId (url, body) {
    return new Promise((resolve, reject) => {
        const arrayUrl = new TextEncoder().encode(url)
        const arrayBody = new TextEncoder().encode(body)
        const arrayCID = new Uint8Array(arrayUrl.length + arrayBody.length)
        arrayCID.set(arrayUrl, 0)
        arrayCID.set(arrayBody, arrayUrl.length)
        crypto.subtle.digest('SHA-1', arrayCID)
        .then(hash => {
            resolve(buf2hex(hash))
        })
    })
}

function doFetch (cacheReqId, request) {
    return new Promise((resolve, reject) => {
        const dateRequestBegin = new Date()
        const requestBegin = dateRequestBegin.getTime()
        const url = new URL(request.url)
    
        if (!Nocache) {
            const kcache = getCacheObject(url)
            if (kcache.has(cacheReqId)) {
                const cachedContent = kcache.get(cacheReqId)
                if (new Date().getTime() - cachedContent.begin >= cachedContent.maxage || cachedContent.dirty) {
                    kcache.delete(cacheReqId)
                } else {
                    resolve([cachedContent.content, cachedContent.contenttype, cachedContent.requestId])
                    return;
                }
            }
        }

        if (Pending.has(cacheReqId)) {
            Pending.get(cacheReqId).push(resolve)
            return;
        } else {
            Pending.set(cacheReqId, [])
        }

        const requestId = genRequestId(cacheReqId, dateRequestBegin)        
        request.headers.set('X-Request-Id', requestId)
        request.headers.set('Authorization', `Bearer ${authToken}`)
        fetch(request)
        .then(response => {
            const contentType = contentTypeParse(response.headers.get('Content-Type'))
            switch(contentType) {
                default:
                    return [response.text(), response, contentType, requestId]
                case 'application/json':
                    return [response.json(), response, contentType, requestId]
            }
        })
        .then(([content, response, contentType, requestId]) => {
            content.then(content => {
                const pending = Pending.get(cacheReqId)
                Pending.delete(cacheReqId)

                if(!Nocache) {
                    const maxAge = cacheControlParse(response.headers.get('Cache-Control'))
                    if (maxAge > 0) {
                        /* content, time request begin in ms, max age in ms, marked for delete */
                        /* "marked for delete" is used by cache cleaner, first pass it mark for delete,
                        second it delete. This allow to avoid having an object gotten out by a request
                        that is deleted later
                        */
                        kcache.set(cacheReqId, {content: content, begin: requestBegin, maxage: maxAge, contenttype: contentType, requestId: requestId, dirty: false})
                    }
                }
                if (pending) {
                    for(const otherResolve of pending) {
                        otherResolve([content, contentType, requestId, response.status])
                    }
                }
                resolve([content, contentType, requestId, response.status])
            })
            .catch(reason => {
                reject(reason)
            })
        })
    })
}

function markCacheDirty () {
    for(const kcache of Kache) {
        for (const [key, content] of kcache[1]) {
            if (content.dirty) {
                kcache[1].delete(key)
                continue
            }
            content.dirty = true
            kcache.set(key, content)
            continue
        }
    }
}

function cacheCleaner() {
    const now = new Date().getTime()
    for(const kcache of Kache) {
        for (const [key, content] of kcache[1]) {
            if (content.dirty) {
                kcache[1].delete(key)
                continue
            }
            if (now - content.begin >= content.maxage) {
                content.dirty = true
                kcache.set(key, content)
                continue
            }
        }
    }
    return setTimeout(cacheCleaner, 1000)
}

/* start cleaner, it calls itself */
setTimeout(cacheCleaner, 10000)
