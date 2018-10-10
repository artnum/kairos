/* eslint-env browser, amd */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Evented',
  'dojo/Deferred',

  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',

  'dojo/text!./templates/contacts.html',

  'dojo/dom',
  'dojo/date',
  'dojo/date/stamp',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/dom-style',
  'dojo/dom-class',
  'dojo/dom-form',
  'dojo/dom-attr',
  'dojo/request/xhr',

  'dijit/form/Form',
  'dijit/form/DateTextBox',
  'dijit/form/TimeTextBox',
  'dijit/form/Button',
  'dijit/form/RadioButton',
  'dijit/form/Select',
  'dijit/registry',

  'location/card',
  'artnum/Path',
  'artnum/Query'
], function (
  djDeclare,
  djLang,
  djEvented,
  djDeferred,

  dtWidgetBase,
  dtTemplatedMixin,
  dtWidgetsInTemplateMixin,

  _template,

  djDom,
  djDate,
  djDateStamp,
  djDomConstruct,
  djOn,
  djDomStyle,
  djDomClass,
  djDomForm,
  djDomAttr,

  djXhr,
  dtForm,
  dtDateTextBox,
  dtTimeTextBox,
  dtButton,
  dtRadioButton,
  dtSelect,
  dtRegistry,

  Card,
  Path,
  Query
) {
  return djDeclare('location.contacts', [ dtWidgetBase, dtTemplatedMixin, dtWidgetsInTemplateMixin, djEvented ], {
    baseClass: 'contacts',
    templateString: _template,
    mapping: { firstname: ['givenname', ' '],
      familyname: ['sn', ' '],
      organization: ['o', ' '],
      locality: ['l', null],
      npa: ['postalcode', null],
      address: ['postaladdress', null] },

    constructor: function (p) {
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
      var f = djDomForm.toObject(this.nForm.domNode)

      var terms = f.search.split(/\s+/)
      for (var i = 0; i < terms.length; i++) {
        /* add = in front of searh as * means verify for presence if first letter in search term */
        terms[i] = '=*' + terms[i] + '*'
      }

      var url = Path.url('store/Contacts')
      url.searchParams.set('search.sn', terms)
      url.searchParams.set('search.givenname', terms)
      url.searchParams.set('search.o', terms)
      url.searchParams.set('search._sn', 'or')
      url.searchParams.set('search._givenname', 'or')
      Query.exec(url).then(djLang.hitch(this, function (res) {
        var frag = document.createDocumentFragment()
        frag.appendChild(document.createElement('DIV'))
        frag.lastChild.setAttribute('class', 'results')
        if (res.length === 0) {
          frag.lastChild.appendChild(document.createTextNode('Pas de résultats'))
        } else {
          res.data.forEach(djLang.hitch(this, function (entry) {
            var c = new Card('/Contacts/')
            c.entry(entry)

            djOn(c.domNode, 'click', djLang.hitch(this, function (event) {
              /* get form once again it may have changed */
              var f = djDomForm.toObject(this.nForm.domNode)
              var id = dtRegistry.getEnclosingWidget(event.target).get('identity')
              if (id != null) {
                this.sup.saveContact(id, { type: f.cType, comment: f.details })
                this.resetResults()
              }
            }))
            frag.lastChild.appendChild(c.domNode)
          }))
        }
        window.requestAnimationFrame(djLang.hitch(this, () => {
          this.resetResults()
          djDomStyle.set(this.nFreeFormField, 'display', 'none')
          this.domNode.appendChild(frag)
        }))
      }))
      return false
    }
  })
})
