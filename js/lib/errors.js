(() => {
    const TRACE =   0x00011111
    const DEBUG =   0x00001111
    const INFO =    0x00000111
    const WARNING = 0x00000011
    const ERROR =   0x00000001

    function _KError(cause) {
        if (typeof cause === 'string') { cause = new Error(cause) }
        const error = Error.call(this, cause)
    
        Object.getOwnPropertyNames(error)
            .forEach(function (property) {
                this[property] = error[property]
            }, this)
    
        this.name = this.constructor.name
        this.stack = error.stack;
    }
    
    
    _KError.prototype = Object.create(Error.prototype);
    _KError.prototype.constructor = _KError

    _KError.TRACE = TRACE
    _KError.DEBUG = DEBUG
    _KError.INFO = INFO
    _KError.WARNING = WARNING
    _KError.ERROR = ERROR

    globalThis['_KError'] = _KError

    const errorNames = [
        ['KError', ERROR],
        ['KWarning', WARNING],
        ['KInfo', INFO],
        ['KDebug', DEBUG]
    ]

    errorNames.forEach(function ([name, severity]) {
        const errorFunction = function () {
            _KError.apply(this, arguments);
            this.severity = severity
            if (typeof arguments[0] === 'string') {
                this.userMessage = arguments[0]
            } else {
                this.userMessage = arguments[0].message
            }
        };
    
        errorFunction.prototype = Object.create(_KError.prototype);
        errorFunction.prototype.constructor = errorFunction;
    
        globalThis[name] = errorFunction;
    });
})()