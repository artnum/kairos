function compareDate (a, b) {
  let _a = new Date(a)
  let _b = new Date(b)

  _a.setHours(12, 0, 0, 0)
  _b.setHours(12, 0, 0, 0)
  return _a.getTime() - _b.getTime()
}
