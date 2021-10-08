/* eslint-env browser */
function createLinkFromPhone (htmlnode) {
  const phoneExp = /(:? |^)(:?0|\+)[0-9 +./-]+/g
  const unwantedChar = /[ ./-]/g
  let phoneLinks = []
  for (let i = htmlnode.childNodes.length - 1; i >= 0; i--) {
    const node = htmlnode.childNodes[i]
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.nodeName === 'A' || node.nodeName === 'SCRIPT') { continue } // don't put link into link
      phoneLinks = phoneLinks.concat(createLinkFromPhone(node))
    } else if (node.nodeType === Node.TEXT_NODE) {
      let txt = node.nodeValue
      const res = String(node.nodeValue).match(phoneExp)
      const frag = document.createDocumentFragment()
      if (res) {
        for (const m of res) {
          const num = m.replace(unwantedChar, '')
          if (num.length < 5 || /^[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{2,4}$/.test(m)) {
            continue
          } else {
            const a = document.createElement('A')
            phoneLinks.push(a)
            a.setAttribute('href', `tel:${num}`)
            a.classList.add('phonenumber')
            a.appendChild(document.createTextNode(m))
            const x = txt.split(m)
            frag.appendChild(document.createTextNode(x[0]))
            frag.appendChild(a)
            txt = x[1]
          }
        }
        if (txt) {
          frag.appendChild(document.createTextNode(txt))
        }
        node.parentNode.replaceChild(frag, node)
      }
    }
  }
  return phoneLinks
}
