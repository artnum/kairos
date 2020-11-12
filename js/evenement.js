function KairosEvent(type, detail, place = null) {
    if (KAIROS.events[type] === undefined) {
        throw new Error('Type d\'évènement inconnu')
    }
    const getBody = function (type, detail) {
        return new Promise((resolve, reject) => {
            const evBody = {
                comment: typeof detail.comment === 'string' ? detail.comment : '',
                date: new Date().toISOString(),
                technician: detail.technician !== undefined ? detail.technician : null, // this must be set by caller
                type: KAIROS.events[type],
                process: `kairos:${type}`
            }
            if (detail.reservation) {
                if (detail.new) {
                    resolve([Object.assign(evBody, {reservation: detail.reservation, previous: null})])
                } else {
                    let url = new URL('store/Evenement/.chain', KAIROS.getBase())
                    url.searchParams.append('reservation', detail.reservation)
                    let bodies = []
                    fetch(url, { headers: new Headers({ 'X-Request-Id': `${new Date().getTime()}-${performance.now()}` }) }).then(response => {
                        if (!response.ok) { KAIROS.error('Impossible d\'obtenir la chaîne d\'évènements'); return }
                        response.json().then(result => {
                            for (let i = 0; i < result.length; i++) {
                                let previousEvent = result.data[i]
                                bodies.push(Object.assign(evBody, {reservation: detail.reservation, previous: previousEvent.id}))
                            }
                            if (bodies.length === 0) {
                                if (detail.append) {
                                    resolve([Object.assign(evBody, {reservation: detail.reservation, previous: null})])
                                }
                            } else {
                                resolve(bodies)
                            }
                        })
                    })
                }
            } else if (detail.machine) {
                resolve([Object.assign(evBody, {reservation: null, previous: null, target: detail.machine})])
            } else {
                reject(new Error('Détails de l\'évènement invalides'))
            }
        })
    }

    return new Promise((resolve, reject) => {
        let promises = []
        const url = new URL('store/Evenement', KAIROS.getBase())

        /* check for existence of event before adding */
        const checkPromise = new Promise ((resolve, reject) => {
            if (detail.reservation) {
                const checkUrl = new URL('store/Evenement', KAIROS.getBase())
                checkUrl.searchParams.append('search.reservation', detail.reservation)
                checkUrl.searchParams.append('search.process', `kairos:${type}`)
                checkUrl.searchParams.append('search.type', KAIROS.events[type])
                fetch(checkUrl).then (response => {
                    if (response.ok) {
                        response.json().then(result => {
                            if (result.length > 0) {
                                resolve(false)
                                return
                            }
                            resolve(true)
                        })
                    } else {
                        resolve(true)
                    }
                })
            } else { 
                resolve(true)
            }
        })

        checkPromise.then(addEvent => {
            if (!addEvent) { resolve(this); return }
            if (detail.technician) {
                getBody(type, detail).then(bodies => {
                    bodies.forEach(body => {
                        promises.push(fetch(url, { method: 'POST', headers: new Headers({ 'X-Request-Id': `${new Date().getTime()}-${performance.now()}` }), body: JSON.stringify(body) }))
                    })
                    Promise.all(promises).then(() => {
                        resolve(this)
                    })
                })
            } else {
                const whoDid = document.createElement('FORM')
                whoDid.classList.add('who')
                whoDid.innerHTML = `<input type="text" class="kairos" value="" placeholder="Par" /> <br /><div class="mbuttonMain mbutton mbuttonSingle"><button class="mbuttonLeft" type="submit">Ok</button></div>`
                const s = new Select(whoDid.firstElementChild, new UserStore(), { allowFreeText: true, realSelect: true })
                if (place === null) {
                    throw new Error('No place have been set')
                } else {
                    document.body.appendChild(whoDid)
                    let pop = Popper.createPopper(place, whoDid, {
                        onFirstUpdate: state => {
                            whoDid.firstElementChild.focus()
                        }
                    })

                    let closePopper = (unset = true) => {
                        pop.destroy()
                        if (whoDid.parentNode) {
                            whoDid.parentNode.removeChild(whoDid)
                        }
                        if (unset) { event.target.value = false }
                    }

                    window.addEventListener('keydown', event => {
                        if (event.key === 'Escape') {
                            closePopper()
                        }
                    }, { capture: true })

                    whoDid.addEventListener('submit', event => {
                        event.preventDefault()
                        getBody(type, Object.assign(detail, {technician: s.value})).then(bodies => {
                            bodies.forEach(body => {
                                promises.push(fetch(url, { method: 'POST', headers: new Headers({ 'X-Request-Id': `${new Date().getTime()}-${performance.now()}` }), body: JSON.stringify(body) }))
                            })
                        })
                        closePopper(true)
                        Promise.all(promises).then(() => {
                            resolve(this)
                        })
                    })
                }
            }
        })
    })
}

KairosEvent.removeAutoAdded = function (type, reservation) {
    if (KAIROS.events[type] === undefined) {
        throw new Error('Ne peut supprimer un évènement inexistant')
    }
    const url = new URL('store/Evenement', KAIROS.getBase())
    url.searchParams.append('search.reservation', reservation)
    url.searchParams.append('search.process', `kairos:${type}`)

    fetch(url, {headers: new Headers({ 'X-Request-Id': `${new Date().getTime()}-${performance.now()}`})}).then(response => {
        if (!response.ok) {
            throw new Error('Erreur de réponse')
        }
        response.json().then(result => {
            for (let i = 0; i < result.length; i++) {
                let delUrl = new URL(`store/Evenement/${result.data[i].id}`, KAIROS.getBase())
                fetch(delUrl, {method: 'DELETE', headers: new Headers({ 'X-Request-Id': `${new Date().getTime()}-${performance.now()}`})})
            }
        })
    })
}