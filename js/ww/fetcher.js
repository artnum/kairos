importScripts('../../conf/app.js')

const Pending = new Map()
const authToken = location.search.substring(1) || ''
let fetcherConcurrency = 0
function onMessageFetch (msg) {
    fetcherConcurrency++
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
        fetcherConcurrency--
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
            break
        case 'clearcache':
            return
        case 'query':
        case 'fetch': {
            msgStack.push(msg)
        }
        break
    }
}

/* fetcher concurrency control to avoid ERR_INSUFFICIENT_RESOURCES from Chrome,
   Firefox has not problem with stuffing a lot of fetches at once.
   Values are empirical, they may need to be adjusted, but they give acceptable
   performance penalty while avoiding the error.
*/
const FETCHER_CONCURRENCY_REQUEST = 100
const FETCHER_CONCURRENCY_WAIT_DELAY = 5

function consumeMsgStack () {
    while (msgStack.length > 0 && fetcherConcurrency < FETCHER_CONCURRENCY_REQUEST) {
        const msg = msgStack.shift()
        onMessageFetch(msg)
    }
    setTimeout(consumeMsgStack, FETCHER_CONCURRENCY_WAIT_DELAY)
}
consumeMsgStack()

function contentTypeParse (contentType) {
    if (!contentType) { return '' }
    return String(contentType).trim().split(';')[0].trim()
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