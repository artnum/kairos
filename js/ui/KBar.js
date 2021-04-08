function KBar () {
    const barNode = document.createElement('DIV')
    barNode.classList.add('kbar')
    this.domNode = barNode
}

KBar.prototype.show = function () {
    if (this.domNode.parentNode) { return }
    window.requestAnimationFrame(() => { document.body.insertBefore(this.domNode, document.body.firstChild) })
}

KBar.prototype.hide = function () {
    if (!this.domNode.parentNode) { return }
    window.requestAnimationFrame(() => { this.domNode.parentNode.removeChild(this.domNode) })
}