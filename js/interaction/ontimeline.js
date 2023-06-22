/* timeline interaction */

function iSelectReservation(event) {
    const Viewport = new KView()
    const { x, y } = Viewport.getCurrentBox()
    const entry = Viewport.getRowObject(y)
    const cell = Viewport.getCell(x, y)

    let node = event.target
    while (node && node.classList && !node.classList.contains('kentry')) { 
      if (node.classList.contains('kreservation')) { break }
      node = node.parentNode
    }

    if (!(event instanceof KeyboardEvent) && node.id) {
        const kgstore = new KObjectGStore()
        const reservation = kgstore.search('kreservation', 'uuid', node.id)
        if (!reservation) {
            return
        }
        const ui = reservation.getUINode()
        if (!ui) {
            return
        }
        ui.renderForm()
            .then(domNode => {
                const klateral = new KLateral()
                const ktab = klateral.add(domNode, { 
                  title: `Réservation ${reservation.get('uid')}:${reservation.get('version')}`,
                  id: reservation.get('uid'),
                  action: [
                    {name: 'duplicate-at-end', label: 'Créer la fin'},
                    {name: 'delete', label: 'Supprimer'}
                  ]
                })
                if (ktab) {
                  ktab.addEventListener('k-action', event => {
                    ui.dispatchEvent(new CustomEvent(event.detail.action, {detail: {tab: event.detail.tab, target: event.detail.target}}))
                  })
                }
                ui.addEventListener('close', event => {
                    ktab.close()
                })
            })
        return
    }

    if (cell.size === 1 && event instanceof KeyboardEvent) {
        const [_, open] = cell.entries().next().value
        open.getUINode().getDomNode()
            .then(domNode => {
                domNode.style.border = '2px solid blue'
            })
    } else if (event instanceof KeyboardEvent) {
        for (const entry of cell) {
            entry[1].getUINode().getDomNode()
                .then(domNode => {
                    domNode.style.border = '2px solid blue'
                })
        }
    }
}

function iGrowAddReservationEnd (event) {
  const Viewport = new KView()
  const {x, y} = Viewport.getCurrentBox()
  const entry = Viewport.getRowObject(y)
  const cell = Viewport.getCell(x, y)
  const ktask = new KTaskBar()
  const travail = ktask.getCurrentList()

  if (!this.currentGrowAdd) { return }
  this.currentGrowAdd[1].remove()

  const end = new Date()
  end.setTime(this.firstDay.getTime())
  end.setTime(end.getTime() + (x * 86400000))
  
  const endStart = KVDays.dec2HM(KVDays.getDayBeginEnd(end, KAIROS)[1])
  end.setHours(endStart[0], endStart[1], 0, 0)

  if (!entry || !travail || !end || isNaN(end.getTime())) { 
    if (!entry) { KAIROS.error('Pas de ressource sélectionnée') }
    else if (!travail) { KAIROS.error('Pas de travail sélectionné') }
    else { KAIROS.error('Date invalide') }
    return
  }

  const reservationStore = new KStore('kreservation')
  reservationStore.set({
    time: 8 * 3600,
    begin: this.currentGrowAdd[0].toISO8601(),
    end: end.toISO8601(),
    target: this.currentGrowAdd[3],
    affaire: travail.data.get('uid'),
    status: travail.data.get('status')
  })
  this.currentGrowAdd = null

}

function iFollowGrowAddReservation (event) {
  if (!this.currentGrowAdd) { return }
  const Viewport = new KView()
  const x = Viewport.getXFromDate(this.currentGrowAdd[0])
  if (x < 0) {
    this.currentGrowAdd[1].start = LeaderLine.pointAnchor({element: document.firstElementChild, x: Viewport.get('margin-left'), y: this.currentGrowAdd[2]})
  } else {
    this.currentGrowAdd[1].start = LeaderLine.pointAnchor({element: document.firstElementChild, x: x * Viewport.get('day-width') + Viewport.get('margin-left'), y: this.currentGrowAdd[2]})
  }
  this.currentGrowAdd[1].end = LeaderLine.pointAnchor({element: document.firstElementChild, x: event.pageX, y: this.currentGrowAdd[2]})
  this.currentGrowAdd[1].position()
}

function iZoomCurrentBox (event) {
  event.stopPropagation()
  const Viewport = new KView()
  const {x, y} = Viewport.getCurrentBox()
  if (document.getElementById(`zoomed_box_${x}_${y}`)) { return }
  if (window.ZoomedBox) { window.ZoomedBox() }
  if (Viewport.getCell(x, y).size < 1) { return }
  const view = document.createElement('DIV')
  view.id = `zoomed_box_${x}_${y}`
  let xpos = Viewport.getPixelX(x + 1) - 28
  if (xpos + 300 > Viewport.get('viewport-width')) {
    xpos = Viewport.getPixelX(x) - 363
  }
  view.style.setProperty('left', `${xpos}px`)

  const entries = Viewport.getObjectsOnGrid(x, y)
  view.classList.add('kreservation-popup')
  view.style.setProperty('position', 'absolute')
  let top = -1
  const copies = []
  for (const [_, entry] of entries) {
    if (top  < 0) {
      const uinode = entry.getUINode()
      top = Viewport.getRowTop(uinode.rowid)
    }
    const kobject = entry.copy()
    copies.push(kobject)
    const ui = new KUIReservation(kobject, {copy: entry})
    ui.setWidth(300)
    ui.render()
    .then(domNode => {
      domNode.style.setProperty('order', entry.get('displayOrder'))
      domNode.style.setProperty('position', 'relative')
      window.requestAnimationFrame(() => {
        view.appendChild(domNode)
      })
    })
  }
  window.ZoomedBox = () => {
    copies.forEach(o => o.deleteObject())
    window.requestAnimationFrame(() => { if (view.parentNode) { view.parentNode.removeChild(view) } })
    window.ZoomedBox = undefined
    return true
  }

  KClosable.new(view, {function: window.ZoomedBox })

  const totalHeight = copies.length * Viewport.get('entry-height') + 14
  if (totalHeight + top > Viewport.get('viewport-height')) {
    top -= (copies.length - 1) * Viewport.get('entry-height') 
  } else {
    top -= 14
  }
  view.style.setProperty('top', `${top}px`)

  window.requestAnimationFrame(() => {
    document.body.appendChild(view)
  })
}

function iGrowAddReservation (event) {
  if (!event.shiftKey) { return }
  if (this.currentGrowAdd) { return }
  const Viewport = new KView()
  const {x, y} = Viewport.getCurrentBox()
  const entry = Viewport.getRowObject(y)
  const ktask = new KTaskBar()
  const travail = ktask.getCurrentList()

  if (!entry || !travail) { 
    if (!entry) { KAIROS.error('Pas de ressource sélectionnée') }
    else if (!travail) { KAIROS.error('Pas de travail sélectionné') }
    else { KAIROS.error('Date invalide') }
    return
  }


  const begin = new Date()
  begin.setTime(this.firstDay.getTime())
  begin.setTime(begin.getTime() + (x * 86400000))

  const beginStart = KVDays.dec2HM(KVDays.getDayBeginEnd(begin, KAIROS)[0])
  begin.setHours(beginStart[0], beginStart[1], 0, 0)

  const lineX = Viewport.getXFromDate(begin) * Viewport.get('day-width') + Viewport.get('margin-left')
  this.currentGrowAdd = [begin, new LeaderLine({
    start: LeaderLine.pointAnchor({element: document.firstElementChild, x: lineX, y: event.pageY}),
    end: LeaderLine.pointAnchor({element: document.firstElementChild, x: lineX, y: event.pageY}),
    path: 'grid'
  }), event.pageY, entry.id]
}

function iAddReservation (event) {
    const Viewport = new KView()
    const {x, y} = Viewport.getCurrentBox()
    const entry = Viewport.getRowObject(y)
    const cell = Viewport.getCell(x, y)
    const ktask = new KTaskBar()
    const travail = ktask.getCurrentList()

    if (cell.size > 0 && !travail && !(event instanceof MouseEvent)) {
      return iSelectReservation.bind(this)(event)
    }
    let ttime = 8

    const begin = new Date()
    if (!this.firstDay) { return }
    begin.setTime(this.firstDay.getTime())
    begin.setTime(begin.getTime() + (x * 86400000))

    const beginStart = KVDays.dec2HM(KVDays.getDayBeginEnd(begin, KAIROS)[0])
    begin.setHours(beginStart[0], beginStart[1], 0, 0)


    const end = new Date()
    end.setTime(begin.getTime() + ttime * 360000)

    const endStart = KVDays.dec2HM(KVDays.getDayBeginEnd(end, KAIROS)[1])
    end.setHours(endStart[0], endStart[1], 0, 0)


    if (!entry || !travail || !begin || isNaN(begin.getTime())) { 
      if (!entry) { KAIROS.error('Pas de ressource sélectionnée') }
      else if (!travail) { KAIROS.error('Pas de travail sélectionné') }
      else { KAIROS.error('Date invalide') }
      return
    }

    /*let ttime = travail.data.get('time')
    if (!isNaN(parseFloat(ttime)) && parseFloat(ttime) > 0) {
      ttime = parseFloat(ttime) / 3600
    } else {
      ttime = KAIROS.defaults.reservation.duration
    }*/
    const reservationStore = new KStore('kreservation')

    reservationStore.set({
      time: ttime * 3600,
      begin: begin.toISO8601(),
      end: end.toISO8601(),
      target: entry.id,
      affaire: travail.data.get('uid'),
      status: travail.data.get('status')
    })
  }

  function iDeleteReservation (event) {

  }

  function KIOpenResourceAllocation (day) {
    const r1 = new KStore('kstatus', {type: 2, deleted: 0})
    const stuffs = new KStore('kreservation')
    const kaffaire = new KStore('kaffaire')
    const kstatus = new KStore('kstatus', {type: 1, deleted: 0})
    const dayEnd = new KDate()
    dayEnd.setTime(day.getTime())
    const dayBegin = new KDate()
    dayBegin.setTime(day.getTime())

    dayBegin.setHours(0, 0, 0, 0)
    dayEnd.setHours(24, 0, 0, 0)
    Promise.all([
      stuffs.query({
        '#and': {
          begin: ['<', dayEnd.toISOString().split('Z')[0]],
          end: ['>', dayBegin.toISOString().split('Z')[0]],
          deleted: '--'
        }
      }),
      r1.query({name: '*'}), 
    ])
    .then(([reservations, r1data]) => {
      const affaires = []
      const qAffaires = []
      for (const reservation of reservations) {
        if (affaires.find((value) => reservation.get('affaire') === value)) { continue }
        affaires.push(reservation.get('affaire'))
        qAffaires.push(new Promise(resolve => {
          kaffaire.get(reservation.get('affaire'))
          .then(affaire => {
            kstatus.get(affaire.get('status'))
            .then(status => {
              if (status) { affaire.set('color', status.get('color')) }
              resolve(affaire)
            })
          })
          .catch(_ => {
            resolve(null)
          })
        }))
      }

      return Promise.all(qAffaires)
      .then(affaires => {
        affaires = affaires.filter(a => a !== null)
        const kr = new KResource(r1data, affaires, day, 'afftbcar')
        return kr.render()
      })
    })
    .then(([resources, stuffs]) => {
      const div = document.createElement('DIV')
      div.appendChild(resources)
      div.appendChild(stuffs)
      const popup = new KLateral().open()

      popup.add(div, {title: `Véhicules du ${day.shortDate()}`})
      const box = resources.getBoundingClientRect()
      window.requestAnimationFrame(() => {
        stuffs.style.setProperty('padding-top', `${box.height + 8}px`)
      })
    })
  }