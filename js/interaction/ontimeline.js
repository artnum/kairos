/* timeline interaction */

function iSelectReservation(event) {
    const Viewport = new KView()
    const { x, y } = Viewport.getCurrentBox()
    const entry = Viewport.getRowObject(y)
    const cell = Viewport.getCell(x, y)

    let node = event.target
    while (node && !node.classList.contains('kentry')) { 
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
                  id: reservation.get('uid')
                })
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
    begin.setTime(this.firstDay.getTime())
    begin.setTime(begin.getTime() + (x * 86400000))

    const end = new Date()
    end.setTime(begin.getTime() + ttime * 360000)

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
  
  /*
    const reservationStore = new KStore('kreservation')
    const reservations = travail.data.getRelation('kreservation')
    let updateAll = Promise.resolve()
    if (reservations) {
      const targets = []
      const byTargets = new Map()
      for (const reservation of Array.isArray(reservations) ? reservations : [reservations]) {
        if (targets.indexOf(reservation.get('target')) === -1) { 
          targets.push(reservation.get('target')) 
        }
        if (!byTargets.has(reservation.get('target'))) {
          byTargets.set(reservation.get('target'), [])
        }
        byTargets.get(reservation.get('target')).push(reservation)
      }

      ttime = ttime / (targets.length + 1)
      
      for (const [_, targetReservations] of byTargets.entries()) {
        targetReservations.sort((a, b) => {
            const aTime = new Date(a.get('begin'))
            const bTime = new Date(b.get('begin'))
            return aTime.getTime() - bTime.getTime()
        })
        const newRanges = KVDays.getRanges(new Date(targetReservations[0].get('begin')), ttime, KAIROS.days)
        for (const rkey of newRanges.keys()) {
            if (targetReservations[rkey]) {
                reservationStore.set({
                    id: targetReservations[rkey].get('uid'),
                    time: newRanges[rkey][2],
                    end: newRanges[rkey][1].toISO8601(),
                    begin: newRanges[rkey][0].toISO8601(),
                    version: parseInt(targetReservations[rkey].get('version')),
                    status: travail.data.get('status')
                }, targetReservations[rkey].get('uid'))
            } else {
                reservationStore.set({
                    time: newRanges[rkey][2],
                    end: newRanges[rkey][1].toISO8601(),
                    begin: newRanges[rkey][0].toISO8601(),
                    target: entry.id,
                    affaire: travail.data.get('uid'),
                    status: travail.data.get('status')
                })
            }
        }
        for (let i = newRanges.length; i < targetReservations.length; i++) {
            reservationStore.delete(targetReservations[i].get('uid'))
        }
      }
      /*

      end.setTime(date.getTime() + duration)
      const p = []
      for (const reservation of Array.isArray(reservations) ? reservations : [reservations]) {
        const begin = new Date(reservation.get('begin'))
        const end = new Date()
        end.setTime(begin.getTime() + duration)
        p.push(reservationStore.set({id: reservation.get('uid'), end: end.toISOString(), version: reservation.get('version')}, reservation.get('uid')))
      }
      updateAll = Promise.allSettled(p)
    }
    const ranges = KVDays.getRanges(date, ttime, KAIROS.days)
    updateAll
    .then(_ => {
      for (const range of ranges) {
        reservationStore.set({
            time: range[2],
            begin: range[0].toISO8601(),
            end: range[1].toISO8601(),
            target: entry.id,
            affaire: travail.data.get('uid'),
            status: travail.data.get('status')
        })
        .then(result => {
          KAIROS.info(`Nouvelle réservation`)
        })
      }
    })*/
  }

  function iDeleteReservation (event) {

  }