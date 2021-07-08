function KFieldset (value, choices = {}) {
    this.domNode = document.createElement('FIELDSET')
    this.domNode.classList.add('kfieldset')
    this.choices = choices
    this.value = value
    this.setLegend()
}

KFieldset.prototype.setLegend = function () {
    let value = ''
    let id
    if (this.choices[this.value]) {
        value = this.choices[this.value]
        id = this.value
    } else {
        let haveFreeChoice = false
        for (const choice in this.choices) {
            if (this.choices[choice] === '<input>') {
                haveFreeChoice = true
                id = choice
                break
            }
        }
        if (haveFreeChoice) {
            value = this.value
        }
    }
    if (value !== '') {
        const legend = document.createElement('LEGEND')
        this.domNode.appendChild(legend)
        legend.innerHTML = `<span class="title">${value}</span> <i class="fas fa-chevron-down"></i>`
        legend.dataset.id = id
        legend.dataset.value = value
        const list = new KList(legend, this.choices, legend.firstElementChild)
    }

}