function Kolor(color) {
    this.color = color
}

Kolor.prototype.foreground = function () {
    const r = Math.pow(parseInt(this.color.substr(1, 2), 16) / 255, 2.2)
    const g = Math.pow(parseInt(this.color.substr(3, 2), 16) / 255, 2.2)
    const b = Math.pow(parseInt(this.color.substr(5, 2), 16) / 255, 2.2)
 
    if (0.2126 * r + 0.7151 * g + 0.721 * b < 0.4) {
        return '#FFFFFF'
    } 
    return '#000000'
}