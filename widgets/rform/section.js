/* eslint-env amd, browser */
/* global Histoire */
define(['dojo/_base/declare'], function (djDeclare) {
  return djDeclare('location.rform.section', [], {
    Sections: {
      note: function () {
        return new Promise((resolve, reject) => {
          Histoire.List({search: {
            subtype: 'NOTE',
            object: this.reservation.uid,
            type: 'Reservation'
          }}).then((result) => {
            result.reverse()
            for (let entry of result) {
              if (entry) {
                this.nNewNote.insertBefore(this.HTML.note(entry), this.nNewNote.firstChild)
              }
            }
            resolve()
          }, () => reject(new Error('Erreur serveur')))
        })
      },
      history: function () {
        return new Promise((resolve, reject) => {
          Histoire.List({search: {
            subtype: 'LOG',
            object: this.reservation.uid,
            type: 'Reservation'
          }}).then((result) => {
            result.forEach((entry) => {
              let div = document.createElement('DIV')
              let action = ''
              if (entry.details && entry.details.action) {
                switch (entry.details.action) {
                  case 'duplicate':
                    action = `Copié depuis ${entry.details.original}`; break
                  case 'create':
                    action = 'Création'; break
                }
              }
              div.innerHTML = `<span class="date">${new Date(entry.date).fullDate()} ${new Date(entry.date).shortHour()}</span><span class="user">${entry._user && entry._user.name ? entry._user.name : ''}</span><span>${action !== '' ? action : (entry.attribute.indexOf('uuid') !== -1 ? 'Création' : '')}</span>`
              div.dataset.historyId = entry.id
              this.historyList[entry.id] = entry
              window.requestAnimationFrame(() => {
                this.nHistory.appendChild(div)
              })
              div.addEventListener('click', (event) => {
                let node = event.target
                for (; node && node.nodeName !== 'DIV'; node = node.parentNode) ;
                let unselect = false
                if (node.classList.contains('modified')) { unselect = true }
                for (let n of this.domNode.querySelectorAll('*.modified')) {
                  n.classList.remove('modified')
                }
                if (unselect) { return }
                if (this.historyList[node.dataset.historyId]) {
                  if (!this.historyList[node.dataset.historyId].attribute ||
                      this.historyList[node.dataset.historyId].attribute.indexOf('uuid') !== -1) {
                    return
                  }

                  if (!node.classList.contains('modified')) {
                    node.classList.add('modified')
                    for (let v of this.historyList[node.dataset.historyId].attribute) {
                      let mod = this.domNode.querySelector(`*[name="H:${v}"]`)
                      if (mod) { mod.classList.add('modified') }
                    }
                  }
                }
              })
            })
            resolve()
          }, () => reject(new Error('Erreur serveur')))
        })
      }
    }
    /* end */
  })
})
