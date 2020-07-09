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
  return djDeclare('location.Stores.Locality', [], {
    lastUpdate: 1570179778,
    entries: [],
    getLabel: function (entry) {
      let label = `${entry.name} (Dépôt)`
      if (entry.state) {
        let township = entry.township
        township = township.replace(`(${entry.state.toUpperCase()})`, '').trim() // remove state specifier when already in database
        if (township === entry.name) {
          label = `${entry.np} ${entry.name} (${entry.state.toUpperCase()})`
        } else {
          label = `${entry.np} ${entry.name} (${township} ${entry.state.toUpperCase()})`
        }
      }
      return label
    },
    get: function (id) {
      return new Promise((resolve, reject) => {
        let entry = window.localStorage.getItem(`location/locality/${id}`)
        if (entry) {
          try {
            entry = JSON.parse(entry)
            if (entry.lastFetch >= new Date().getTime() - APPConf.cache.maxAge && entry.lastFetch > this.lastUpdate) {
              resolve(entry)
              return
            }
          } catch (error) { /* NOP */ }
        }
        Query.exec(Path.url(`store/${id}`)).then((results) => {
          entry = null
          if (results.success && results.length === 1) {
            entry = results.data
            entry.label = this.getLabel(entry)
            entry.printableLabel = entry.label
            entry.value = id

            entry.lastFetch = new Date().getTime()
            window.localStorage.setItem(`location/locality/${id}`, JSON.stringify(entry))
          }
          resolve(entry)
        }, (error) => { console.log(error); resolve(null) })
      })
    },
    query: function (txt) {
      return new Promise((resolve, reject) => {
        let queries = []

        let searchName = txt.toAscii()
        let searchNp = searchName
        if (txt) {
          if (txt.indexOf(' ') !== -1) {
            let x = txt.split(' ', 2)
            if (!isNaN(parseInt(x[0], 10)) && String(parseInt(x[0], 10)) === x[0]) {
              searchNp = x[0]
              searchName = x[1].toAscii()
            }
          }
        }

        queries.push(Query.exec(Path.url('store/Warehouse', {params: {'search.name': `~${searchName}%`}})))
        if (txt.length > 0) {
          queries.push(Query.exec(Path.url('store/PC', {params: {'search.name': `~${searchName}%`, 'search.township': `~${searchName}%`, 'search.np': `~${searchNp}%`, 'search._rules': 'name OR township OR np'}})))
        }
        Promise.all(queries).then((results) => {
          let entriesA = []
          let entriesB = []
          results.forEach((result) => {
            if (result.success && result.length > 0) {
              result.data.forEach((entry) => {
                let s = entry.name.toLowerCase().toAscii().indexOf(searchName.toLowerCase())
                let name = entry.name
                if (s !== -1) {
                  name = entry.name.substring(0, s) + '<span class="match">' +
                    entry.name.substring(s, s + searchName.length) + '</span>' +
                    entry.name.substring(s + searchName.length)
                }

                if (entry.np) {
                  s = entry.np.indexOf(searchNp)
                  let np = entry.np
                  if (s !== -1) {
                    np = entry.np.substring(0, s) + '<span class="match">' +
                      entry.np.substring(s, searchNp.length) + '</span>' +
                      entry.np.substring(s + searchNp.length)
                  }
                  let township = entry.township
                  if (entry.name !== entry.township) {
                    s = entry.township.toLowerCase().toAscii().indexOf(searchName.toLowerCase())
                    if (s !== -1) {
                      township = entry.township.substring(0, s) + '<span class="match">' +
                        entry.township.substring(s, searchName.length) + '</span>' +
                        entry.township.substring(s + searchName.length)
                    }
                  } else {
                    township = ''
                  }
                  entry.label = this.getLabel(Object.assign(entry, {np: np, township: township, name: name}))
                  entry.printableLabel = entry.label
                  entry.value = `PC/${entry.uid}`
                } else {
                  entry.label = this.getLabel(entry)
                  entry.printableLabel = entry.label
                  entry.value = `Warehouse/${entry.id}`
                }
                if (entry.np) {
                  entriesB.push(entry)
                } else {
                  entriesA.push(entry)
                }
              })
            }
          })
          entriesA.sort((a, b) => {
            return a.name.localeCompare(b.name)
          })
          entriesB.sort((a, b) => {
            return a.name.localeCompare(b.name)
          })
          this.entries = [...entriesA, ...entriesB]
          resolve(this.entries)
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
