const fs = require('fs')
const KAIROS  = require('./app.js');
try {
  fs.writeFileSync('./app.json', JSON.stringify(KAIROS))
} catch (e) {
  console.log(e)
}



