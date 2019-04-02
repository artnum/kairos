/* eslint-env browser */
/* global Artnum */
function getUUID() {
  return new Promise(function (resolve, reject) {
    Artnum.Query.exec(Artnum.Path.url('uuid.php')).then(function (data) {
      resolve(data.uuid)
    })
  })
}
