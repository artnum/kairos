function KColor () {
    if (KColor._instance) { return KColor._instance}

    this.colorid = 0
    this.colors = new Map()
    this.groups = new Map()
    KColor._instance = this
}

KColor.prototype.set = function (id, colorDescription) {
    const colorId = this.get(id)
    if (colorId) { 
        document.body.style.setProperty(colorId , colorDescription)
        return colorId 
    }
    const color = `--kcolor-${++this.colorid}`
    window.requestAnimationFrame(() => { document.body.style.setProperty(color, colorDescription) })
    this.colors.set(id, [color, colorDescription])
    return color
}

KColor.prototype.get = function (id) {
    const color = this.colors.get(id)
    if (!color) { return null }
    if (document.body.style.getPropertyValue(color[0]) === '') {
        window.requestAnimationFrame(() => { document.body.style.setProperty(color[0], color[1]) })
    }
    return color[0]
}

KColor.prototype.delete = function (id) {
    const color = this.colors.get(id)
    if (!color) { return }
    if (document.body.style.getPropertyValue(color[0]) !== '') {
        window.requestAnimationFrame(() => { document.body.style.removeProperty(color[0]) })
    }
    return
}

KColor.prototype.generate = function (group) {
    const color = this.groups.get(group)
    if (color) {
        if (color.h + color.step >= 360 && color.l < 30) {
            color.s = 50
            color.l = 70
        } else if (color.h + color.step >= 360) {
            color.l = color.l - 20
        }
        color.h = (color.h + color.step) % 360
        this.groups.set(group, color)
        return color
    }
    this.groups.set(group, {h: 0, s: 100, l: 90, step: 40})
    return {h: 0, s: 100, l: 70}
}