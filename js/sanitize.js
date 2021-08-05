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
    }
}