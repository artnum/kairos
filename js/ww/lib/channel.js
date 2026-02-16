class Channel {
    constructor (id, port) {
        this.id = String(id)
        this.same = []
        this.port = port
    }

    setPort (port) {
        this.port = port
    }

    message (msg) {
        if (this.port === null) { return }
        this.port.postMessage(msg)
    }

    addSame (id) {
        this.same.push(String(id))
    }

    isMe (id) {
        return this.id === String(id) || this.same.includes(String(id))
    }

    onMessage (callback) {
        this.port.onmessage = callback
    }
}