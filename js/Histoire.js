/* eslint-env browser */
/* global APPConf */
class Histoire {
  static List (params) {
    let url = new URL(`${window.origin}/${APPConf.history}`)
    url.searchParams.append('sort.date', 'DESC')
    if (params) {
      if (params.search) {
        for (let i in params.search) {
          url.searchParams.append(`search.${i}`, params.search[i])
        }
      }
    }
    return new Promise((resolve, reject) => {
      fetch(url).then((response) => {
        if (!response.ok) { reject(new Error('Erreur serveur')); return }
        response.json().then((result) => {
          let data = result.data
          for (let i = 0; i < data.length; i++) {
            try {
              if (data[i].details) { data[i].details = JSON.parse(data[i].details) }
            } catch (e) {
              data[i] = null
            }
          }
          resolve(result.data)
        }, () => reject(new Error('Erreur serveur')))
      }, () => reject(new Error('Erreur serveur')))
    })
  }

  static Get (id) {
    return new Promise((resolve, reject) => {
      let url = new URL(`${window.origin}/${APPConf.history}/${id}`)
      fetch(url).then((response) => {
        if (!response.ok) { reject(new Error('Erreur serveur')); return }
        response.json().then((result) => {
          if (result.length > 0) {
            let data = result.data
            if (Array.isArray(data)) { data = data[0] }
            if (data.details) { data.details = JSON.parse(data.details) }
            resolve(data)
          }
        }, () => reject(new Error('JSON erreur')))
      }, () => reject(new Error('Erreur serveur')))
    })
  }
  static LOG (type, object, attribute, original) {
    return new Promise((resolve, reject) => {
      let url = new URL(`${window.origin}/${APPConf.history}`)
      let creator = window.localStorage.getItem(`/${APPConf.base}/user`)
      if (creator) {
        creator = JSON.parse(creator)
      }

      if (creator && creator.id && !isNaN(parseInt(creator.id))) {
        creator = parseInt(creator.id)
      } else {
        creator = 0
      }
      let modLog = {
        type: type,
        subtype: 'LOG',
        date: new Date().toISOString(),
        object: object,
        attribute: attribute,
        original: original,
        creator: creator,
        details: ''
      }
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(modLog)
      }).then((response) => {
        if (!response.ok) { reject(new Error('Erreur serveur')); return }
        response.json().then((result) => {
          if (result.length > 0) {
            if (Array.isArray(result.data)) {
              resolve(result.data[0].id)
            } else {
              resolve(result.data.id)
            }
          } else {
            reject(new Error('Pas de données'))
          }
        }, () => reject(new Error('Erreur serveur')))
      }, () => reject(new Error('Erreur serveur')))
    })
  }

  static NOTE (type, object, text) {
    return new Promise((resolve, reject) => {
      let url = new URL(`${window.origin}/${APPConf.history}`)
      let creator = window.localStorage.getItem(`/${APPConf.base}/user`)
      if (creator) {
        creator = JSON.parse(creator)
      }

      if (creator && creator.id && !isNaN(parseInt(creator.id))) {
        creator = parseInt(creator.id)
      } else {
        creator = 0
      }
      let modLog = {
        type: type,
        subtype: 'NOTE',
        date: new Date().toISOString(),
        object: object,
        attribute: null,
        original: null,
        creator: creator,
        details: JSON.stringify({content: text})
      }
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(modLog)
      }).then((response) => {
        if (!response.ok) { reject(new Error('Erreur serveur')); return }
        response.json().then((result) => {
          if (result.length > 0) {
            if (Array.isArray(result.data)) {
              resolve(result.data[0].id)
            } else {
              resolve(result.data.id)
            }
          } else {
            reject(new Error('Pas de données'))
          }
        }, () => reject(new Error('Erreur serveur')))
      }, () => reject(new Error('Erreur serveur')))
    })
  }
}
