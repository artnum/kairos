function KAnimation() {
    this.animSpeed = 1000 / 50
    this.animList = []
}

KAnimation.prototype.push = function (callback) {
    const p = new Promise((resolve) => {
        this.animList.push([callback, resolve])
    })
    if (!this._run) { this.run() }
    return p
}
    
KAnimation.prototype.run = function () {
    new Promise((resolve) => {
        this._run = true
        window.requestAnimationFrame((start) => {
            while(performance.now() - start < this.animSpeed) {
                const op = this.animList.shift()
                if (op === undefined) { break; }
                const retval = op[0]()
                op[1](retval)
            }
            resolve()
        })
    })
    .then(() => {
        if (this.animList.length > 0) {
            this.run()
        }
        this._run = false
    })
}

const KAIROSAnim = new KAnimation()