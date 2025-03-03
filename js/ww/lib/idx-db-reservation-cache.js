const RESERVATION_STORE_NAME = 'ReservationCache'
const INDEXED_DB_NAME = 'KairosDB'
class IdxDbReservationCache {
    constructor() {
        this.db = null
    }

    open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(INDEXED_DB_NAME, 1)
            request.onerror = (event) => {
                reject(event.target.error)
            }
            request.onsuccess = (event) => {
                this.db = event.target.result
                resolve(this)
            }
            request.onupgradeneeded = (event) => {
                this.db = event.target.result
                const objectStore = this.db.createObjectStore(RESERVATION_STORE_NAME, { keyPath: "uuid" })
                objectStore.createIndex('begin', '_idxBegin', { unique: false })
                objectStore.createIndex('end', '_idxEnd', { unique: false })
                objectStore.createIndex('target', '_idxTarget', { unique: false })
                objectStore.createIndex('id', '_idxId', { unique: true })
                resolve(this)
            }
        })
    }

    close() {
        this.db.close()
    }

    /* delete entry and return the entry as it was in indexed db */
    delete (entry) {
        return new Promise((resolve, reject) => {
            const uuid = typeof entry === 'object' ? entry.uuid : entry
            this.get(uuid)
            .then(entry => {
                const transaction = this.db.transaction(RESERVATION_STORE_NAME, 'readwrite')
                const request = transaction.objectStore(RESERVATION_STORE_NAME).delete(uuid)
                request.onsuccess = (event) => {
                    transaction.commit()
                    resolve(entry)
                }
                request.onerror = (event) => {
                    transaction.abort()
                    reject(event.target.error)
                }
                
            })
        })
    }

    get (entry) {
        return new Promise((resolve, reject) => {
            const uuid = typeof entry === 'object' ? entry.uuid : entry
            const transaction = this.db.transaction(RESERVATION_STORE_NAME, 'readonly')
            transaction.onerror = (event) => {
                reject(event.target.error)
            }

            const request = transaction.objectStore(RESERVATION_STORE_NAME).get(uuid)
            request.onerror = (event) => {
                transaction.abort()
                reject(event.target.error)
            }
            request.onsuccess = (event) => {
                transaction.commit()
                if (event.target.result) {
                    return resolve(event.target.result)
                }
                resolve(false)
            }
        })
    }

    add (entry) {
        return new Promise((resolve, reject) => {
            const daymsec = 86400000
    
            this.get(entry.uuid)
            .then(previousEntry => {
                const transaction = this.db.transaction(RESERVATION_STORE_NAME, "readwrite")
                const objectStore = transaction.objectStore(RESERVATION_STORE_NAME)
    
                entry._idxId = parseInt(entry.id)
                entry._idxBegin = Math.floor((new Date(entry.begin)).getTime() / daymsec)
                entry._idxEnd = Math.floor((new Date(entry.end)).getTime() / daymsec)
                entry._idxTarget = entry.target
                entry.version = parseInt(entry.version)

                if (previousEntry === false) {
                    const addRequest = objectStore.add(entry)
                    addRequest.onsuccess = (event) => {
                        transaction.commit()
                        resolve(this)
                    }
                    addRequest.onerror = (event) => {
                        transaction.abort()
                        reject(event.target.error)
                    }
                } else {
                    if (parseInt(entry.version) === previousEntry.version) {
                        // no update needed
                        return resolve(this)
                    }
                    const updateRequest = objectStore.put(entry)
                    updateRequest.onsuccess = (event) => {
                        transaction.commit()
                        resolve(this)
                    }
                    updateRequest.onerror = (event) => {
                        transaction.abort()
                        reject(event.target.error)
                    }
                }
            })
        })
    }

    findById (id) {
        return new Promise((resolve, reject) => {
            id = parseInt(id)
            const transaction = this.db.transaction(RESERVATION_STORE_NAME, 'readonly')
            transaction.onerror = (event) => {
                reject(event.target.error)
            }   

            const objectStore = transaction.objectStore(RESERVATION_STORE_NAME)
            const request = objectStore.index('id').get(id)
            request.onerror = (event) => {
                transaction.abort()
                reject(event.target.error)
            }

            request.onsuccess = (event) => {
                transaction.commit()
                const entry = event.target.result
                if (!entry) { return }
                delete entry._idxBegin
                delete entry._idxEnd
                delete entry._idxTarget
                delete entry._idxId
                resolve(entry)
            }
        })
    }

    findByTarget (target) {
        return new Promise((resolve, reject) => {
            target = String(target)
            const transaction = this.db.transaction(RESERVATION_STORE_NAME, "readonly")
            const results = []

            transaction.onerror = (event) => {
                reject(event.target.error)
            }
            transaction.oncomplete = (event) => {
                resolve(results)
            }

            const objectStore = transaction.objectStore(RESERVATION_STORE_NAME)
            const request = objectStore.index('target').openCursor(IDBKeyRange.only(target))

            request.onerror = (event) => {
                reject(event.target.error)
            }
            request.onsuccess = (event) => {
                const cursor = event.target.result
                if (!cursor) { return }
                delete cursor.value._idxBegin
                delete cursor.value._idxEnd
                delete cursor.value._idxTarget
                delete cursor.value._idxId
                results.push(cursor.value)
                cursor.continue()
            }
        })
    }

    /* either begin/end search or by target */
    find (query) {
        query = Object.assign({begin: null, end: null, target: null, id: null}, query)
        if ((query.begin === null || query.end === null) && query.target === null && query.id === null) {
            return Promise.reject()
        }

        if (query.id !== null) {
            return this.findById(query.id)
        }

        if (query.target !== null) {
            return this.findByTarget(query.target)
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(RESERVATION_STORE_NAME, 'readonly')
            const results = []

            transaction.onerror = (event) => {
                reject(event.target.error)
            }
            transaction.oncomplete = (event) => {
                resolve(results)
            }

            const objectStore = transaction.objectStore(RESERVATION_STORE_NAME)
            const range = IDBKeyRange.bound(Math.floor((new Date(query.begin)).getTime() / 86400000), Math.floor((new Date(query.end)).getTime() / 86400000))

            const indexBegin = objectStore.index('begin')
            const indexEnd = objectStore.index('end')
            const requestBegin = indexBegin.openCursor(range)
            const requestEnd = indexEnd.openCursor(range)

            requestBegin.onerror = (event) => {
                reject(event.target.error)
            }
            requestBegin.onsuccess = (event) => {
                const cursor = event.target.result

                if (!cursor) { return }
                if (results.find(result => result.uuid === cursor.value.uuid)) {
                    cursor.continue()
                    return
                }
                delete cursor.value._idxBegin
                delete cursor.value._idxEnd
                delete cursor.value._idxTarget
                delete cursor.value._idxId
                results.push(cursor.value)
                cursor.continue()
            }

            requestEnd.onerror = (event) => {
                reject(event.target.error)
            }
            requestEnd.onsuccess = (event) => {
                const cursor = event.target.result

                if (!cursor) { return }
                if (results.find(result => result.uuid === cursor.value.uuid)) {
                    cursor.continue()
                    return
                }
                delete cursor.value._idxBegin
                delete cursor.value._idxEnd
                delete cursor.value._idxTarget
                delete cursor.value._idxIdy
                results.push(cursor.value)
                cursor.continue()
            }

        })
    }
}