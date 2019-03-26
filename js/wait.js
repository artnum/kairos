function DoWait (start = true) {
  if (start) {
    window.requestAnimationFrame(function () {
      document.body.classList.add('waiting')
    })
  } else {
     window.requestAnimationFrame(function () {
       document.body.classList.remove('waiting')
     })
  }
}
