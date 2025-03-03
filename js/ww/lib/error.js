class ErrorChannel extends BroadcastChannel {
  constructor() {
    super('kairos-log')
  }

  error(error) {
    if (error instanceof Error) {
        this.postMessage({
            level: 'error',
            message: error.message,
            code: error.code || 0
        })
    } else {
        this.postMessage({
            level: 'error',
            message: error,
            code: 0
        })
    }
  }

  log (level, message, code = 0) {
    if (message instanceof Error) {
        this.error(message)
        return
    }
    level = level.toLowerCase()
    switch (level) {
        case 'error':
        case 'warn':
        case 'info':
        case 'debug':
            break
        default:
            level = 'info'
    }
    this.postMessage({
        level: level,
        message: message,
        code: code
    })
  }
}