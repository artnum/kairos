/* eslint-env browser */

const RunsPerSecond = 6
const RunTime = 1000 / RunsPerSecond

function DisplayLoop (func) {
  if (DisplayLoop.count === undefined) { DisplayLoop.count = 0 }
  if (DisplayLoop.functions === undefined) { DisplayLoop.functions = [] }
  DisplayLoop.functions.push(func)
  if (DisplayLoop.running === undefined) { 
    DisplayLoop.running = true
    RunDisplayLoop()
  }
}

async function RunDisplayLoop () {
  do {
    DisplayLoop.count++
    const start = performance.now()
    DisplayLoop.functions.forEach(async function (f) {
      await f(DisplayLoop.count)
    })
    const stop = performance.now()
    if (stop - start < RunTime) {
      await new Promise ((resolve, reject) => {
        setTimeout(() => {resolve()}, RunTime - (stop - start))
      })
    }
  } while (true)
}