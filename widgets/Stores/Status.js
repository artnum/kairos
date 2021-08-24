/* eslint-env browser, amd */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'artnum/Path',
  'artnum/Query'
], function (
  djDeclare,
  djLang,
  Path,
  Query
) {
  return djDeclare('location.Stores.Status', [], {
    entries: [],
    constructor: function (options = {}) {
      this.params = {}
      if (options.type !== undefined) {
        this.params = {'search.type': options.type}
      }
    },

    get: function (id) {
      return new Promise((resolve, reject) => {
        if (!id) {
          resolve({label: '', value: ''})
          return
        }
        if(!isNaN(parseInt(id))) {
          id = `Status/${id}`
        }
        let s = id.split('/')
        if (s[0] === 'store' || s[0] === '') {
          s.shift()
          if (s[0] === 'store') {
            s.shift()
          }
          id = s.join('/')
        }
        if (!id.includes('Status')) { id = `Status/${id}` }

        fetch(new URL(`${KAIROS.getBase()}/store/${id}`))
        .then(response => {
          if (!response.ok) { return null }
          return response.json()
        })
        .then(results => {
          if (results.length !== 1) { resolve(null); return }
          const entry = Array.isArray(results.data) 
            ? results.data[0]
            : results.data
          if (parseInt(entry.type) === 3) {
            let severity = parseInt(entry.severity)
            if (severity < 1000) {
              entry.color = 'black'
            } else if (severity < 2000) {
              entry.color = 'blue'
            } else if (severity < 3000) {
              entry.color = 'darkorange'
            } else {
              entry.color = 'red'
            }
          }
          let name = `${entry.name}`
          entry.label = name
          entry.value = id
          if (entry.symbol) {
            entry.symbol = ` <i class="${GSymbol(entry.symbol).join(' ')}" aria-hidden="true"> </i> `
          }

          entry.lastFetch = new Date().getTime()
          window.localStorage.setItem(`location/${id}`, JSON.stringify(entry))
          resolve(entry)
        })
      })
    },

    query: function (txt, currentValue = undefined) {
      return new Promise((resolve, reject) => {
        const entries = []
        let searchName = txt.toAscii()
        const url = new URL(`${KAIROS.getBase()}/store/Status`)
        url.searchParams.set('search.name', `~${searchName}%`)
        url.searchParams.set('sort.severity', 'ASC')
        for (const k in this.params) {
          url.searchParams.set(k, this.params[k])
        }
        fetch(url).then(response => {
          if (!response.ok) { return null }
          return response.json()
        })
        .then(results => {
          if (!results) { resolve(entries); return }
          for (let i = 0; i < results.length; i++) {
            const entry = results.data[i]
            if (entry.disabled && entry.disabled !== '0') { continue }
            let name = entry.name
            if (parseInt(entry.type) === 3) {
              let severity = parseInt(entry.severity)
              if (severity < 1000) {
                entry.color = 'black'
              } else if (severity < 2000) {
                entry.color = 'blue'
              } else if (severity < 3000) {
                entry.color = 'darkorange'
              } else {
                entry.color = 'red'
              }
            }
            if (currentValue !== undefined) {
              let s = entry.name.toLowerCase().toAscii().indexOf(searchName.toLowerCase())
              if (s !== -1) {
                name = `${entry.name.substring(0, s)}<span class="match">${entry.name.substring(s, s + searchName.length)}</span>${entry.name.substring(s + searchName.length)}`
              }
            }
            entry.printableLabel = entry.name
            entry.label = `${name}`
            entry.value = `Status/${entry.id}`
            if (entry.symbol) {
              entry.symbol = ` <i class="${GSymbol(entry.symbol).join(' ')}" aria-hidden="true"> </i> `
            }
            
            if (currentValue) {
              if (isNaN(parseInt(currentValue))) {
                if (parseInt(currentValue.split('/').pop()) === parseInt(entry.id)) {
                  entry.selected = true
                }
              } else {
                if (parseInt(currentValue) === parseInt(entry.id)) {
                  entry.selected = true
                }
              }
            }
            entries.push(entry)
          }
   
          this.entries = entries
          resolve(entries)
        })
      })
    },
    getIdentity: function (object) {
      if (object.uid) {
        return object.uid
      } else {
        return object.id
      }
    }
  })
})
