function KSettings () {
    if (KSettings._instance) { 
        return KSettings._instance
    }
    const stItem = localStorage.getItem('k-settings')
    if (!stItem) { this.settings = {} }
    else { this.settings = JSON.parse(stItem) }
    KSettings._instance = this
    return this
}

KSettings.prototype.set = function (name, value) {
    this.settings[name] = value
    localStorage.setItem('k-settings', JSON.stringify(this.settings))
}

KSettings.prototype.get = function (name) {
    return this.settings[name]
}

KSettings.prototype.has = function (name) {
    return this.settings[name] !== undefined
}