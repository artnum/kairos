const KSano = {
    phone: function (phone) {
        const phoneExp = /(:? |^)(:?0|\+)[0-9 +./-]+/g
        const unwantedChar = /[ .-\/\(\)]/g

        if (phoneExp.test(String(phone))) {
            return String(phone).replace(unwantedChar, '')
        }
        return null
    },
    mail: function (mail) {
        const mailExp = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
        mail = String(mail).toLowerCase()
        if (mailExp.test(mail)) {
            return mail
        }
        return null
    },
    url: function (url) {
        return url
    },
    num: function (num) {
        let v = Number.parseInt(num, 10)
        if (isNaN(v)) {
            v = Number.parseFloat(num, 10)
            if (isNaN(v)) {
                return 0;
            }
        }
        return v
    },
    txt: function (txt) {
        if (txt === undefined || txt === null) { return '' }
        return txt.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
    },
    auto: function (value) {
        const int = Number.parseInt(value, 10)
        const float = Number.parseFloat(value, 10)
        if (isNaN(int) && isNaN(float)) {
            return KSano.txt(value)
        }
        return isNaN(int) ? float : int
    }

}