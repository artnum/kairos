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
      displayname: ['displayname', ' '],
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
      this.nSearch.set('state', '')
      var f = djDomForm.toObject(this.nForm.domNode)

      var terms = f.search.split(/\s+/)
      var selected = []
      var rules = false
      var url = Path.url('store/Contacts')
      if (f.company && f.company === 'on') {
        url.searchParams.set('search.objectclass', 'organization')
        rules = true
      }
      terms.forEach(function (term) {
        if (term.indexOf(':') > 0) {
          var kv = term.split(':', 2)
          kv[1] = '=*' + kv[1] + '*'
          url.searchParams.set('search._operator', 'and')
          switch (kv[0].toLowerCase()) {
            case 'p':
            case 'prenom':
              if (selected.indexOf('givenname') === -1) { selected.push('givenname') }
              url.searchParams.append('search.givenname[]', kv[1])
              break
            case 'n':
            case 'nom':
              if (selected.indexOf('sn') === -1) { selected.push('sn') }
              url.searchParams.append('search.sn[]', kv[1])
              break
            case 'e':
            case 'entreprise':
              if (selected.indexOf('o') === -1) { selected.push('o') }
              url.searchParams.append('search.o[]', kv[1])
              break
            case 'm':
            case 'mail':
              if (selected.indexOf('mail') === -1) { selected.push('mail') }
              url.searchParams.append('search.mail[]', kv[1])
              break
            case 'surnom':
            case 's':
              if (selected.indexOf('displayname') === -1) { selected.push('displayname') }
              url.searchParams.append('search.displayname[]', kv[1])
              break
            default:
              break
          }
        } else {
          if (selected.indexOf('o') === -1) { selected.push('o') }
          if (selected.indexOf('givenname') === -1) { selected.push('givenname') }
          if (selected.indexOf('sn') === -1) { selected.push('sn') }
          if (selected.indexOf('displayname') === -1) { selected.push('displayname') }
          url.searchParams.append('search.sn[]', '=*' + term + '*')
          url.searchParams.append('search.givenname[]', '=*' + term + '*')
          url.searchParams.append('search.o[]', '=*' + term + '*')
          url.searchParams.append('search.displayname[]', '=*' + term + '*')
        }
      })
      if (rules) {
        var r = ''
        selected.forEach(function (t) {
          r += '(_' + t + '_)'
          url.searchParams.set('search._' + t, 'and')
        })
        url.searchParams.set('search._rules', '(&(_objectclass_)(|' + r + '))')
      }
      if (selected.length === 0) {
        this.nSearch.set('state', 'Error')
      } else {
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
      }
      return false
    }
  })
})
