function kcstore (url, stObject) {
    if (!stObject.headers['cache-control']) return;
    const cacheDirective = stObject.headers['cache-control']
        .split(',')
        .map(str => {
            return str
                .trim()
                .toLowerCase()
                .split('=')
                .map(str => str.trim())
        })
    let age = -1
    let public = false
    for (const [dir, val] of cacheDirective) {
        switch(dir) {
            case 'public': public = true; break
            case 'max-age': age = parseInt(val, 10); break
        }
        if (public && age !== -1) { break }
    }

    if (public && age > 0) {
        try {
            localStorage.setItem(url, JSON.stringify({
                cache: { time: Date.now(), age: age },
                value: {
                    body: stObject.body,
                    options: {
                        status: stObject.status,
                        statusText: stObject.statusText,
                        headers: stObject.headers
                    }
                }
            }))
        } catch (exception) {
            KCacheReduce()
        }
    }
}

function kcget (url) {
    const cachedItem = localStorage.getItem(url)
    if (!cachedItem) { return null }
    const objectItem = JSON.parse(cachedItem)
    if (objectItem.cache.time + objectItem.cache.age > Date.now()) { 
        localStorage.removeItem(url)
        return null
    }
    return new Response(objectItem.value.body, objectItem.value.options)
}

function kcremove (url) {
    localStorage.removeItem(url)
}

function kfetch (url, options = { method: 'GET' }) {
    return new Promise ((resolve, reject) => {
        switch (options.method.toLowerCase()) {
            case 'get': 
            case 'head':
                const cResponse = kcget(String(url))
                if (cResponse) {
                    resolve(cResponse)
                    return
                }
                break
        }
        fetch(url, options)
        .then (response => {
            resolve(response)
            if (!response.ok) { return }
            switch (options.method.toLowerCase()) {
                default: return
                case 'get': 
                case 'head':
                    break
            }
            /* status that don't trigger cache */
            switch (clonedResponse.status) {
                case 404: return
                case 500: return
            }
            const clonedResponse = response.clone()
            clonedResponse.text()
            .then(body => {
                const storableResponse = {
                    body,
                    status: clonedResponse.status,
                    statusText: clonedResponse.statusText,
                    headers: {}
                }
                for (const k of clonedResponse.headers.keys()) {
                    storableResponse.headers[k.toLowerCase()] = clonedResponse.headers.get(k)
                }
                kcstore(String(url), storableResponse)
            })
        })
        .catch(reason => reject(reason))
    })
}

function KCacheReduce () {
    for (let i = 0; i < localStorage.length; i++) {
        const url = localStorage.key(i)
        if (!(url.startsWith('http://') || url.startsWith('https://'))) { continue }
        try {
            const objectItem = JSON.parse(localStorage.getItem(url))
            if (!objectItem) { continue; }
            if (!objectItem.cache) { continue; }
            if (!objectItem.cache.age) { localStorage.removeItem(url) }
            if (objectItem.cache.time + Math.round(objectItem.cache.age / 2) > Date.now()) { 
                localStorage.removeItem(url)
            }
        } catch (exception) {
            console.log(exception)
        }
    }
}

function KCacheClean (origin) {
    window.requestIdleCallback(deadline => {
        const start = performance.now()
        let i = origin === undefined ? 0 : origin
        while (performance.now() - start < 10) {
            if (localStorage.length <= i) { i = 0 }
            const url = localStorage.key(i)
            if (!(url.startsWith('http://') || url.startsWith('https://'))) { i++; continue }
            const cachedItem = localStorage.getItem(url)
            i++
            let objectItem = null
            try {
                objectItem = JSON.parse(cachedItem)
            } catch (r) {
                continue
            }

            if (!objectItem) { continue }
            if (!objectItem.cache) { continue }
            if (!objectItem.cache.age) { localStorage.removeItem(url) }
            if (objectItem.cache.time + objectItem.cache.age > Date.now()) { 
                localStorage.removeItem(url)
            }
        }
        setTimeout(() => KCacheClean(i), 1500)
    })
}
KCacheClean()