/* eslint-env browser, amd */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dojo/Evented',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/contacts.html',
  'dijit/registry',
  'dojo/on',
  'dojo/dom-style',
  'dojo/dom-form',
  'location/card',
], function (
  djDeclare,
  dtWidgetBase,
  djEvented,
  dtTemplatedMixin,
  dtWidgetsInTemplateMixin,
  _template,
  dtRegistry,
  djOn,
  djDomStyle,
  djDomForm,
  Card
) {
  return djDeclare('location.contacts', [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
    baseClass: 'contacts',
    templateString: _template,
    mapping: { firstname: ['givenname', ' '],
      familyname: ['sn', ' '],
      displayname: ['displayname', ' '],
      organization: ['o', ' '],
      locality: ['l', null],
      npa: ['postalcode', null],
      address: ['postaladdress', null] },

    constructor: function (p) {
      this.store = new KContactStore(`${KAIROS.getBase()}/store/Contacts`)
      this.sup = p.target
    },

    keyEvent: function (event) {
      var k = event.key ? event.key : event.keyCode

      if (k === 'Enter') {
        if (event.target.name === 'search') {
          this.doSearch(event)
        }
      }
    },
    doAddFreeform: function (event) {
      var f = djDomForm.toObject(this.nForm.domNode)
      if (f.freeform) {
        this.sup.saveContact(null, {
          type: f.cType,
          comment: f.details,
          freeform: f.freeform})
        this.nFreeform.value = ''
      }
    },
    resetResults: function () {
      djDomStyle.set(this.nFreeFormField, 'display', '')
      for (var i = this.domNode.lastChild; i; i = i.previousSibling) {
        if (i.nodeName === 'DIV' && i.getAttribute('class') === 'results') {
          i.parentNode.removeChild(i)
          break
        }
      }
    },
    doSearch: function (event) {
      this.nSearch.set('state', '')
      var f = djDomForm.toObject(this.nForm.domNode)

      this.store.query(f.search, {limit: KAIROS.searchLimit})
      .then(res => {
        const frag = document.createDocumentFragment()
        frag.appendChild(document.createElement('DIV'))
        frag.lastChild.setAttribute('class', 'results')
        if (res.length === 0) {
          frag.lastChild.appendChild(document.createTextNode('Pas de résultats'))
        } else {
          res.forEach((entry) => {
            var c = new Card('/Contacts/')
            c.entry(entry)
            const div = document.createElement('DIV')
            div.addEventListener('click', (event) => {
              /* get form once again it may have changed */
              let node = event.target
              while (node && !node.dataset.id) { node = node.parentNode }
              var f = djDomForm.toObject(this.nForm.domNode)
              if (node.dataset.id) {
                this.sup.saveContact(node.dataset.id, { type: f.cType, comment: f.details })
                this.resetResults()
              }
            })
            div.innerHTML = entry.getHTMLLabel()
            div.dataset.id = entry.getId()
            frag.lastChild.appendChild(div)
          })
        }
        window.requestAnimationFrame(() => {
          this.resetResults()
          djDomStyle.set(this.nFreeFormField, 'display', 'none')
          this.domNode.appendChild(frag)
        })
      })
    }
  })
})