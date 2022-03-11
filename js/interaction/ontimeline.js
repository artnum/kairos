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

function iAddReservation (event) {
    const Viewport = new KView()
    const {x, y} = Viewport.getCurrentBox()
    const entry = Viewport.getRowObject(y)
    const cell = Viewport.getCell(x, y)
    const ktask = new KTaskBar()
    const travail = ktask.getCurrentList()

    if (cell.size > 0 && !travail) {
      return iSelectReservation.bind(this)(event)
    }

    const date = new Date()
    date.setTime(this.firstDay.getTime())
    date.setTime(date.getTime() + (x * 86400000))

    if (!entry || !travail || !date || isNaN(date.getTime())) { 
      if (!entry) { KAIROS.error('Pas de ressource sélectionnée') }
      else if (!travail) { KAIROS.error('Pas de travail sélectionné') }
      else { KAIROS.error('Date invalide') }
      return
    }

    let ttime = travail.data.get('time')
    if (!isNaN(parseFloat(ttime)) && parseFloat(ttime) > 0) {
      ttime = parseFloat(ttime) / 3600
    } else {
      ttime = KAIROS.defaults.reservation.duration
    }
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
      console.log(byTargets)
      console.log(targets)
    
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
                    version: parseInt(targetReservations[rkey].get('version'))
                }, targetReservations[rkey].get('uid'))
            } else {
                reservationStore.set({
                    time: newRanges[rkey][2],
                    end: newRanges[rkey][1].toISO8601(),
                    begin: newRanges[rkey][0].toISO8601(),
                    target: entry.id,
                    affaire: travail.data.get('uid')
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
      updateAll = Promise.allSettled(p)*/
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
            affaire: travail.data.get('uid')
        })
        .then(result => {
          KAIROS.info(`Nouvelle réservation`)
        })
      }
    })
  }

  function iDeleteReservation (event) {

  }