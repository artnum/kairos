/* eslint-env browser */

const RunsPerSecond = 6
const RunTime = 1000 / RunsPerSecond
var count = 0
function DisplayLoop (func) {
  count++
  let start = performance.now()
  func(count).then(() => {
    let stop = performance.now()
    if (stop - start > RunTime) {
      DisplayLoop(func)
    } else {
      setTimeout(DisplayLoop, RunTime - (stop - start), func)
    }
  })
}
