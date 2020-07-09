const _GSymbols = {
  worker: ['fas', 'fa-user-cog'],
  tools: ['fas', 'fa-tools'],
  bolt: ['fas', 'fa-bolt'],
  truck: ['fas', 'fa-truck']
}

function GSymbol(symbol) {
  if (symbol) {
    let addClass = ['symbol']
    if (symbol.indexOf('.') !== -1) {
      addClass = [...symbol.split('.'), ...addClass]
      symbol = addClass.shift()
    }
    if (_GSymbols[symbol]) {
      return [..._GSymbols[symbol], ...addClass]
    }
  }
  return []
}
