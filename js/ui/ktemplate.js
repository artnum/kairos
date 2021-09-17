const KTemplate = {
    get (template) {
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
}