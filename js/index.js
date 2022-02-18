function KLoadResources (resources) {
    resources.push(['', 'end'])
    return new Promise((resolve, reject) => {
        window.addEventListener('kairos-ready', () => {
            let chain = Promise.resolve()
            for (const r of resources) {
                let node
                switch (r[1]) {
                    case 'script':
                        node = document.createElement('SCRIPT')
                        node.setAttribute('src', r[0])
                        break
                    case 'css':
                        node = document.createElement('LINK')
                        node.setAttribute('rel', 'stylesheet')
                        node.setAttribute('href', r[0])
                        break
                    default: break
                }
                if (r[1] === 'end') {
                    chain = chain.then(() => { resolve() })
                    return;
                }
                if (r[2] !== undefined) { node.id = r[2] }
                chain = chain.then(() => { 
                    document.head.appendChild(node)
                    return new Promise((resolve, reject) => {
                        node.addEventListener('error', event => {
                            resolve()
                        })
                        node.addEventListener('load', event => {
                            resolve()
                        })
                    })
                })
                
            }
        })
    })
}

window.addEventListener('load', event => {
    const resources = [

        ['../conf/app.js', 'script'],
        ['../conf/error.js', 'script'],
        ['../js/kairos.js', 'script'],
        ['../js/kairos-ui.js', 'script'],
        ['../js/days.js', 'script'],
        ['../node_modules/popper.js/dist/umd/popper.min.js', 'script'],
        ['../node_modules/tooltip.js/dist/umd/tooltip.min.js', 'script'],
        ['../node_modules/transliteration/dist/browser/bundle.umd.min.js', 'script'],
        ['../node_modules/imurmurhash/imurmurhash.min.js', 'script'],
        ['../node_modules/sjcl/sjcl.js', 'script'],
        ['../node_modules/object-hash/dist/object_hash.js', 'script'],
        ['../node_modules/@popperjs/core/dist/umd/popper.min.js', 'script'],
        ['https://ajax.googleapis.com/ajax/libs/dojo/1.13.0/dojo/dojo.js', 'script'],

        ['', 'end']
    ]

    let chain = Promise.resolve()
    for (const r of resources) {
        let node
        switch (r[1]) {
            case 'script':
                node = document.createElement('SCRIPT')
                node.setAttribute('src', r[0])
                break
            case 'css':
                node = document.createElement('LINK')
                node.setAttribute('rel', 'stylesheet')
                node.setAttribute('href', r[0])
                break
            default: break
        }
        if (r[1] === 'end') {
            chain = chain.then(() => {
                return new Promise ((resolve, reject) => {
                    window.dispatchEvent(new CustomEvent('kairos-preload'))
                    resolve()
                })
            })
            return;
        }
        if (r[2] !== undefined) { node.id = r[2] }
        chain = chain.then(() => { 
            document.head.appendChild(node)
            return new Promise((resolve, reject) => {
                node.addEventListener('error', event => {
                    resolve()
                })
                node.addEventListener('load', event => {
                    resolve()
                })
            })
        })      
    }
})

window.addEventListener('kairos-preload', event => {
    const resources = [
        ['../css/timeline.css', 'css'],
        ['../css/dtable.css', 'css'],
        ['../css/klives.css', 'css'],
        ['../css/fontawesome-all.min.css', 'css'],
        ['../css/balloon.css/balloon.min.css', 'css'],
        ['../css/klateral.css', 'css'],
        ['../css/kform.css', 'css'],
        ['../resources/symbols.js', 'script'],  
        ['../js/animation.js', 'script'],
        ['../js/css.js', 'script'],
        ['../js/color.js', 'script'],
        ['../js/gevent.js', 'script'],
        ['../js/crc32.js','script'],
        ['../js/Histoire.js', 'script'],
        ['../js/kfield.js', 'script'],
        ['../js/ui/ktemplate.js', 'script'],
        ['../js/wait.js', 'script'],
        ['../js/date.js', 'script'],
        ['../js/tel.js', 'script'],
        ['../js/tooltip.js', 'script'],
        ['../js/dLoop.js', 'script'],
        ['../js/MButton.js', 'script'],
        ['../js/evenement.js', 'script'],
        ['../js/popup.js', 'script'],
        ['../js/clientSearch.js', 'script'],
        ['../js/kreservation.js', 'script'],
        ['../js/kcache.js', 'script'],
        ['../js/PJs/pSBC.js', 'script'],
        ['../js/localdb.js', 'script'],
        ['../js/select.js', 'script'],
        ['../js/view.js', 'script'],
        ['../js/ldap.js', 'script'],
        ['../js/string.js','script'],
        ['../js/address.js', 'script'],
        ['../js/kformdata.js', 'script'],
        ['../js/kvdays.js', 'script'],
        ['../js/ui/hour.js', 'script'],
        ['../js/sanitize.js', 'script'],
        ['../js/ui/radiolike.js', 'script'],
        ['../js/ui/khtml.js', 'script'],
        ['../js/ui/klateral.js', 'script'],
        ['../js/ui/kreservation.js', 'script'],
        ['../js/kevent.js', 'script'],
        ['../js/kentry.js', 'script'],
        ['../js/ui/kentry.js', 'script'],
        ['../js/kaffaire.js', 'script'],
        ['../js/kstore.js', 'script'],
        ['../js/kobject.js', 'script'],
        ['../js/interaction/ontimeline.js', 'script'],
        ['../js/ui/kform.js', 'script'],

        ['../js/ui/klist.js', 'script'],
        ['../js/ui/kview.js', 'script'],
        ['../js/ui/klives.js', 'script'],
        ['../js/ui/kfieldset.js', 'script'],
        ['../js/ui/kproject.js', 'script'],
        ['../js/ui/kcolor.js', 'script'],
        ['../js/ui/kaffaire.js', 'script'],
        ['../js/stores/user.js', 'script'],
        ['../js/stores/locality.js', 'script'],
        ['../js/stores/kcontact.js', 'script'],
        ['../js/utils/time.js', 'script'],

        ['../node_modules/artnum/DTable.js', 'script'],
        ['../node_modules/artnum/Date.js', 'script'],
        ['../node_modules/artnum/String.js', 'script'],
    ]

    const loaded = []
    for (const r of resources) {
        let node
        switch (r[1]) {
            case 'script':
                node = document.createElement('SCRIPT')
                node.setAttribute('src', r[0])
                break
            case 'css':
                node = document.createElement('LINK')
                node.setAttribute('rel', 'stylesheet')
                node.setAttribute('href', r[0])
                break
            default: break
        }
        if (r[2] !== undefined) { node.id = r[2] }        
        document.head.appendChild(node)
        loaded.push(new Promise((resolve, reject) => {
            node.addEventListener('error', event => {
                resolve()
            })
            node.addEventListener('load', event => {
                resolve()
            })
        }))
    
        
    }
    Promise.allSettled(loaded)
    .then(() => {
        window.dispatchEvent(new CustomEvent('kairos-ready'))

    })
})