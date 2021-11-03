function KObjectGStore () {
    if (KObjectGStore._instance) { return KObjectGStore._instance }
    this.store = new Map()
    KObjectGStore._instance = this
    return this
}

KObjectGStore.prototype.put = function (kobject) {
    const uid = kobject.get('uid')
    const type = kobject.getType()
    if (uid && type) {
        if (!this.store.get(type)) {
            this.store.set(type, new Map())
        }
        this.store.get(type).set(uid, kobject)
    }
}

KObjectGStore.prototype.get = function (type, uid) {
    const tstore = this.store.get(type)
    if (tstore) {
        return tstore.get(uid)
    }
    return undefined
}

KObjectGStore.prototype.search = function (type, attr, value) {
    const tstore = this.store.get(type)
    if (tstore) {
        for (const [key, object] of tstore) {
            if (object.get(attr) === value) {
                return object
            }
        }
    }
    return undefined
}

function KObject (type, data) {
    this.type = type
    this.data = new Map()
    this.relation = new Map()
    this.evtTarget = new EventTarget()

    for (const key in data) {
        this.setItem(key, data[key])
    }
    const kobject = new Proxy(this, {
        set (object, name, value) {
            if (name === 'relation') { return false }
            return object.setItem(name, value)
        },
        get (object, name) {
            switch(name) {
                case 'get': return object.getItem.bind(object)
                case 'set': return object.setItem.bind(object)
                case 'has': return object.hasItem.bind(object)
                case 'delete': return object.deleteItem.bind(object)
                case 'keys': return object.itemKeys.bind(objet)
                case 'getCn': return object.getCn.bind(object)
                case 'getRelation': return object.getRelation.bind(object)
                case 'setRelation': return object.setRelation.bind(object)
                case 'addRelation': return object.addRelation.bind(object)
                case 'getType': return object.getType.bind(object)
                case 'addEventListener': return object.addEventListener.bind(object)
                case 'removeEventListener': return object.removeEventListener.bind(object)
                case 'relation': return undefined
            }
            return object.getItem(name)
        },
        has (object, name) {
            return object.hasItem(name)
        },
        enumerate (object) {
            return object.data.keys()
        },
        ownKeys (object) {
            return object.data.keys()
        },
        getOwnPropertyDescriptor (object, name) {
            switch (name) {
                case 'get':
                case 'set':
                case 'has':
                case 'getCn':
                case 'delete':
                case 'getRelation':
                case 'setRelation':
                case 'addRelation':
                case 'getType':
                case 'addEventListener':
                case 'removeEventListener':
                    return {
                        writable: false,
                        enumerable: false,
                        configurable: false
                    }
                case 'relation': return {
                    writable: false,
                    enumerable: false,
                    configurable: false
                }
            }
            const value = object.getItem(name)
            return value ? {
                value: value,
                writable: true,
                enumerable: true,
                configurable: false,
                get: object.getItem.bind(object),
                set: object.setItem.bind(object)
            } : undefined
        },
        defineProperty (object, name, desc) {
            if(desc && 'value' in desc) { object.setItem(name, desc.value) }
            return object
        },
        deleteProperty (object, name) {
            if (object.hasItem(name)) { object.data.delete(name); return true }
            return false
        }
    })
    new KObjectGStore().put(kobject)
    return kobject
}

KObject.prototype.addEventListener = function (type, listener, options) {
    this.evtTarget.addEventListener(type, listener, options)
}

KObject.prototype.removeEventListener = function (type, listener, options) {
    this.evtTarget.removeEventListener(type, listener, options)
}

KObject.prototype.update = function (data) {
    for (const key in data) {
        if (!this.hasItem(key)) {
            this.evtTarget.dispatchEvent(new CustomEvent('add-item', {detail: {kobject: this, name: key, value: data}}))
            this.setItem(key, data[key])
            continue
        }
        if (this.getItem(key) !== data) {
            this.evtTarget.dispatchEvent(new CustomEvent('update-item', {detail: {kobject: this, name: key, value: data}}))
            this.setItem(key, data[key])
            continue
        }
    }
    this.evtTarget.dispatchEvent(new CustomEvent('update', {detail: {kobject: this}}))
}


KObject.prototype.deleteItem = function (name) {
    if (this.hasItem(name)) { 
        this.data.delete(name);
        this.evtTarget.dispatchEvent(new CustomEvent('delete-item', {detail: {kobject: this, item: name}}))
        return true; 
    }
    return false
}

KObject.prototype.itemKeys = function () {
    return this.data.keys()
}

KObject.prototype.setItem = function (name, value) {
    return this.data.set(name, value)
}

KObject.prototype.getItem = function (name) {
    if (name === 'cn') { return this.getCn() }
    if (name === 'name') { return this.getName() }
    if (KAIROS[this.type][name] && KAIROS[this.type][name].remote) {
        if (this.hasItem(KAIROS[this.type][name].remote)) {
            return this.data.get(KAIROS[this.type][name].remote)
        }
    }
    return this.data.get(name)
}

KObject.prototype.hasItem = function (name) {
    return this.data.has(name)
}

KObject.prototype.variables = function (txt) {
    const vars = txt.matchAll(/(?<!\\)\${([a-zA-Z0-9.]*)}/gm)
    for (const matches of vars) {
        const attr = matches[1]
        if (attr.indexOf('.') !== -1) {
            const [relation, attribute] = attr.split('.', 2)
            const object = this.getRelation(relation)
            if (object && object.has(attribute)) {
                txt = txt.replaceAll(matches[0], object.get(attribute))
            } else {
                txt = txt.replaceAll(matches[0], '')
            }
            continue
        }
        const val = this.getItem(attr)
        if (val) { txt = txt.replaceAll(matches[0], val) }
        else { txt = txt.replaceAll(matches[0], '') }
    
    }
    return txt
}

KObject.prototype.getName = function (capitalize = false) {
    let name = this.variables(KAIROS[this.type].name)
    if (capitalize) { return name.charAt(0).toUpperCase() + name.slice(1) }
    return name
}

KObject.prototype.getCn = function () {
    return this.variables(KAIROS[this.type].cn)
}

KObject.prototype.setRelation = function(type, kobject) {
    if (!(kobject instanceof KObject)) {
        kobject = new KObject(type, kobject)
    }
    return this.relation.set(type, kobject)
}

KObject.prototype.addRelation = function (type, kobject) {
    if (!this.relation.has(type)) { return this.setRelation(type, kobject) }
    if (!(kobject instanceof KObject)) {
        kobject = new KObject(type, kobject)
    }
    const currentRelation = this.relation.get(type)
    if (!Array.isArray(currentRelation)) {
        return this.relation.set(type, [currentRelation, kobject])
    }
    currentRelation.push(kobject)
    return this.relation.set(type, currentRelation)
}

KObject.prototype.getRelation = function (type) {
    if (this.relation.has(type)) {
        return this.relation.get(type)
    }
    return undefined
}

KObject.prototype.getType = function () {
    return this.type
}