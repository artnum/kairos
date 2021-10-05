function countUpdateMessage (msg) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${KAIROS.getBase()}/store/CountReservation/${msg.id}`)
        fetch(url)
        .then(response => {
            if (!response.ok) { throw new Error('ERR:Server') }
            return response.json()
        })
        .then(result => {
            if (!result.success) { throw new Error('ERR:Server') }
            const entry = Array.isArray(result.data) ? result.data[0] : result.data
            resolve([entry.reservation, msg.cid])
        })
        .catch(reason => {
            reject(reason)
        })
    })
}