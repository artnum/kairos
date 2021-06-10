function KAffaire () {
    this.data = {
        uid: null
    }
}

KAffaire.prototype.init = function(uid = null) {
    let req
    this.inited = new Promise((resolve, reject) => {
        if (uid) {
            req = fetch(`${KAIROS.getBase()}/store/Affaire/${uid}`)
        } else {
            req = fetch(`${KAIROS.getBase()}/store/Affaire`, {method: 'POST'})
        }

        req.then(response =>{
            if (!response.ok) { KAIROS.ioError(response); resolve(this); return }
            response.json()
            .then(result => {
                if (result.length < 0) { resolve(this); return }
                this.data = Array.isArray(result.data) ? result.data[0] : result.data
                resolve(this)
            })
            .catch(reason => { KAIROS.ioError(reason); resolve(this); return })

        })
        .catch(reason => { KAIROS.ioError(reason); resolve(this); return })
    })
    return this.inited
}

KAffaire.prototype.getId = function () {
    return this.data.uid
}

KAffaire.prototype.getName = function () {
    if (this.data.name) {
        return this.data.name
    }
    if (this.data.uid) {
        return `kaffaire${this.data.uid}`
    }
    return null
}

KAffaire.prototype.delete = function () {
    return new Promise((resolve, reject) => {
        this.inited.then(_ => {
            if (!this.data.uid) { resolve(); return }
            fetch(`${KAIROS.getBase()}/store/Affaire/${this.data.uid}`, {method: 'DELETE', body: JSON.stringify({uid: this.data.uid })})
            .then(response => {
                if (!response.ok) { KAIROS.ioError(response); }
                resolve()
            })
            .catch (reason => { KAIROS.ioError(reason); resolve() })
        })
    })
}