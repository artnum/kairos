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
  return djDeclare('location.Stores.User', [], {
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
        Query.exec(Path.url(`store/${id}`)).then((results) => {
          if (results.success && results.length === 1) {
            entry = results.data
            let name = `${entry.name}`
            entry.label = name
            entry.value = id
          }
          resolve(entry)
        })
      })
    },
    query: function (txt) {
      return new Promise((resolve, reject) => {
        let entries = []
        let searchName = txt.toAscii()
        Query.exec(Path.url('store/User', {params: {'search.name': `~${searchName}%`}})).then((results) => {
          console.log(results)
          if (results.success && results.length > 0) {
            results.data.forEach((entry) => {
              let s = entry.name.toLowerCase().toAscii().indexOf(searchName.toLowerCase())
              let name = entry.name
              if (s !== -1) {
                name = entry.name.substring(0, s) + '<span class="match">' +
                  entry.name.substring(s, s + searchName.length) + '</span>' +
                  entry.name.substring(s + searchName.length)
              }

              entry.label = `${name}`
              entry.value = `User/${entry.id}`

              entries.push(entry)
              console.log(entry)
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
