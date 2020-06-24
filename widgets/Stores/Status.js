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
        let entry = null
        let s = id.split('/')
        if (s[0] === 'store' || s[0] === '') {
          s.shift()
          if (s[0] === 'store') {
            s.shift()
          }
          id = s.join('/')
        }
        entry = window.localStorage.getItem(`location/${id}`)
        if (entry) {
          try {
            entry = JSON.parse(entry)
            if (entry.lastFetch >= new Date().getTime() - APPConf.cache.maxAge) {
              resolve(entry)
              return
            }
          } catch (error) { /* NOP */ }
        }
        if (!id.includes('Status')) { id = `Status/${id}` }
        Query.exec(Path.url(`store/${id}`)).then((results) => {
          if (results.success && results.length === 1) {
            entry = results.data
            let severity = parseInt(entry.severity)
            if (severity < 1000) {
              entry.color = 'black'
            } else if (severity < 2000) {
              entry.color = 'blue'
            } else if (severity < 3000) {
              entry.color = 'darkorange'
            } else {
              entry.color = 'darkred'
            }
            let name = `${entry.name}`
            entry.label = name
            entry.value = id
            if (entry.symbol) {
              entry.symbol = ` <i class="${GSymbol(entry.symbol).join(' ')}" aria-hidden="true"> </i> `
            }

            entry.lastFetch = new Date().getTime()
            window.localStorage.setItem(`location/${id}`, JSON.stringify(entry))
          }
          resolve(entry)
        })
      })
    },

    query: function (txt, currentValue = undefined) {
      return new Promise((resolve, reject) => {
        let entries = []
        let searchName = txt.toAscii()
        Query.exec(Path.url('store/Status', {params: Object.assign({'search.name': `~${searchName}%`}, this.params)})).then((results) => {
          if (results.success && results.length > 0) {
            results.data.forEach((entry) => {
              if (entry.disabled && entry.disabled !== '0') { return }
              let name = entry.name
              let severity = parseInt(entry.severity)
              if (severity < 1000) {
                entry.color = 'black'
              } else if (severity < 2000) {
                entry.color = 'blue'
              } else if (severity < 3000) {
                entry.color = 'darkorange'
              } else {
                entry.color = 'darkred'
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
            })
          }
          entries.sort((a, b) => {
            return a.name.localeCompare(b.name)
          })

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
