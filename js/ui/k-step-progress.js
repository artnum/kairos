function KStepProgressUI (step = 5) {
    this.domNode = document.createElement('DIV')
    this.domNode.classList.add('k-step-progress')
    for (let i = 0; i < 100; i+=step) {
        const domStep = document.createElement('DIV')
        domStep.classList.add('k-step')
        domStep.dataset.step = i
        domStep.style.setProperty('min-width', `${step}%`)
        domStep.style.setProperty('max-width', `${step}%`)
        this.domNode.appendChild(domStep)
        domStep.addEventListener('click', this.clickStep.bind(this))
    }
}


KStepProgressUI.prototype.clickStep = function (event) {
    const node = event.target

    for (let step = node.parentNode.firstElementChild; step; step = step.nextElementSibling) {
        step.classList.remove('selected')
    }
    if (node.classList.contains('selected')) {
        node.classList.remove('selected')
        for (let prev = node; prev; prev = prev.previousElementSibling) {
            prev.classList.remove('selected')
        }
    } else {
        for (let prev = node; prev; prev = prev.previousElementSibling) {
            prev.classList.add('selected')
        }
    }
}