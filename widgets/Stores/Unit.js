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
  return djDeclare('location.Stores.Unit', [], {
    entries: [],

    get: function (id) {
      return new Promise((resolve, reject) => {
        if (!id) {
          resolve({label: '', value: ''})
          return
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
        if (!id.includes('Unit')) { id = `Unit/${id}` }
        Query.exec(Path.url(`store/${id}`)).then((results) => {
          if (results.success && results.length === 1) {
            entry = results.data
            let name = `${entry.name}`
            entry.label = name
            entry.value = id

            entry.lastFetch = new Date().getTime()
            window.localStorage.setItem(`location/${id}`, JSON.stringify(entry))
          }
          resolve(entry)
        })
      })
    },

    query: function (txt) {
      return new Promise((resolve, reject) => {
        let entries = []
        let searchName = txt.toAscii()
        Query.exec(Path.url('store/Unit', {params: Object.assign({'search.name': `~${searchName}%`}, this.params)})).then((results) => {
          if (results.success && results.length > 0) {
            results.data.forEach((entry) => {
              if (entry.disabled && entry.disabled !== '0') { return }
              let s = entry.name.toLowerCase().toAscii().indexOf(searchName.toLowerCase())
              let name = entry.name
              if (s !== -1) {
                name = entry.name.substring(0, s) + '<span class="match">' +
                  entry.name.substring(s, s + searchName.length) + '</span>' +
                  entry.name.substring(s + searchName.length)
              }

              entry.label = `${name}${entry.symbol ? ' [' + entry.symbol + ']' : ''}`
              entry.value = `Unit/${entry.id}`

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
