function KFieldset (value, choices = {}) {
    this.domNode = document.createElement('FIELDSET')
    this.domNode.classList.add('kfieldset')
    this.choices = choices
    this.value = value
    this.setLegend()
}

KFieldset.prototype.setLegend = function () {
    if (this.choices[this.value]) {
        const legend = document.createElement('LEGEND')
        this.domNode.appendChild(legend)
        legend.innerHTML = `<span class="title">${this.choices[this.value]}</span> <i class="fas fa-chevron-down"></i>`
        legend.dataset.id = this.value
        const list = new KList(legend, this.choices, legend.firstElementChild)
    }
}