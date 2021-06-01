function KAnimation () {
    this.content = []
}

KAnimation.prototype.add = function (callback) {
    this.content.push(new Promise((resolve, reject) => {
        window.requestAnimationFrame(() => {
            callback()
            resolve()
        })
    }))
}

KAnimation.prototype.then = function (callback) {
    const arr = this.content
    this.content =[]
    return new Promise((resolve, reject) => {
        Promise.all(arr).then(() => { callback() })
    })
}