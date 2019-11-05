/* eslint-env browser */
/* global APPConf */
function Histoire(type, object, attribute, original) {
  let creator = window.localStorage.getItem(`/${APPConf.base}/user`)
  if (creator) {
    creator = JSON.parse(creator)
  }

  if (creator && creator.id && !isNaN(parseInt(creator.id))) {
    creator = parseInt(creator.id)
  } else {
    creator = 0
  }
  let modLog = {type: type, date: new Date().toISOString(), object: object, attribute: attribute, original: original, creator: creator}
  let url = new URL(`${window.origin}/${APPConf.history}`)
  fetch(url, {
    method: 'POST',
    body: JSON.stringify(modLog)
  })
}
