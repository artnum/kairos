function KTemplate () {
    if (this.global?._KTemplateIntance) {
        return this.global._KTemplateIntance
    }
    if (self) {
        this.global = self
    }
    this.global = window
    this.global._KTemplateIntance = this
}

KTemplate.prototype.get = function(template) {
    const toDom = function (str) {
        const div = document.createElement('DIV')
        div.innerHTML = str
        if (div.childElementCount === 0 || div.childElementCount > 1) {
            return div
        }
        
        const element = div.firstElementChild
        div.removeChild(element)
        return element
    }

    return new Promise((resolve, reject) => {
        switch (template.type) {
            case 'html':
                resolve(toDom(template.content))
                return
            case 'file':
                fetch(KAIROS.URL(template.content))
                .then(response => {
                    if (!response.ok) { reject(new Error('ERR:fetch')); return }
                    return response.text()
                })
                .then ((htmlstr) => {
                    resolve(toDom(htmlstr))
                })
                
                return
        }
    })
}