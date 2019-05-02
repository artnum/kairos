/* eslint-env browser */
function createLinkFromPhone (htmlnode) {
  let phoneExp = /(:? |^)(:?0|\+)[0-9 +./-]+/g
  let unwantedChar = /[ ./-]/g
  for (let i = htmlnode.childNodes.length - 1; i >= 0; i--) {
    let node = htmlnode.childNodes[i]
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.nodeName === 'A' || node.nodeName === 'SCRIPT') { continue } // don't put link into link
      createLinkFromPhone(node)
    } else if (node.nodeType === Node.TEXT_NODE) {
      let txt = node.nodeValue
      let res = String(node.nodeValue).match(phoneExp)
      let frag = document.createDocumentFragment()
      if (res) {
        for (let m of res) {
          let num = m.replace(unwantedChar, '')
          if (num.length < 5 || /[0-9]{1,2}\.[0-9]{1,2}\.[0-9]{2,4}/.test(m)) {
            continue
          } else {
            let a = document.createElement('A')
            a.setAttribute('href', `tel:${num}`)
            a.classList.add('phonenumber')
            a.appendChild(document.createTextNode(m))
            let x = txt.split(m)
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
}
