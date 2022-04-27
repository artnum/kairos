function KObjectGStore () {
    if (KObjectGStore._instance) { return KObjectGStore._instance }
    this.store = new Map()
    KObjectGStore._instance = this
    new GEvent().listen('kobjet.something', KObjectGStore._instance.receiveKobjectUpdate.bind(KObjectGStore._instance))
    return this
}

KObjectGStore.prototype.receiveKobjectUpdate = function (event) {
    const details = event.detail
    switch (details.operation) {
        default: break;
        case 'write':
            if (details.type && details.id && KAIROS.remoteType[details.type]) {
                const kstore = new KStore(KAIROS.remoteType[details.type])
                kstore.get(details.id)
            } 
            break
        case 'delete':
            if (details.type && details.id && KAIROS.remoteType[details.type]) {
                const kobject = this.get(KAIROS.remoteType[details.type], details.id)
                if (kobject) {
                    kobject.deleteObject()
                    this.delete(KAIROS.remoteType[details.type], details.id)
                }
            } 
            break
    }
}

KObjectGStore.prototype.put = function (kobject) {
    const uid = kobject.get('uid')
    const type = kobject.getType()
    if (uid && type) {
        if (!this.store.get(type)) {
            this.store.set(type, new Map())
        }
        this.store.get(type).set(String(uid), kobject)
    }
}

KObjectGStore.prototype.get = function (type, uid) {
    if (uid === undefined) {
        [type, uid] = type.split('/', 2)
    }

    const tstore = this.store.get(type)
    if (tstore) {
        return tstore.get(String(uid))
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

KObjectGStore.prototype.deleteRelations = function (type, uid) {
    const store = this.store.get(type)
    if (!store) { return }
    const kobject = store.get(String(uid))
    if (!kobject) { return }
    const relations = kobject.getAllRelations()
    for (const [relType, objects] of relations) {
        if (objects instanceof Array) {
            for (const object of objects) {
                const kobject = this.get(relType, object)
                if (kobject) { kobject.deleteRelation(type, String(uid))}
            }
        } else {
            const kobject = this.get(relType, objects)
            if (kobject) { kobject.deleteRelation(type, String(uid))}
        }
    }
}

KObjectGStore.prototype.delete = function (type, uid) {
    if (uid === undefined) {
        [type, uid] = type.split('/', 2)
    }

    const tstore = this.store.get(type)
    if (tstore) {
        this.deleteRelations(type, String(uid))
        return tstore.delete(String(uid))
    }
    return false
}

function KObject (type, data) {
    this.type = type
    this.data = new Map()
    this.relation = new Map()
    this.evtTarget = new EventTarget()
    this.UINode = null
    this.deleted = false
    this.lastChange = performance.now()
    const kgstore =  new KObjectGStore()

    for (const key in data) {
        this.setItem(key, data[key])
    }
    if (this.getItem('uid')) {
        const previous = kgstore.get(type, this.getItem('uid'))
        if (previous) {
            previous.update(data)
            return previous
        }
    }

    const kobject = new Proxy(this, {
        set (object, name, value) {
            if (name === 'relation') { return false }
            return object.setItem(name, value)
        },
        get (object, name) {
            switch(name) {
                case 'isDestroyed': return object.isObjectDestroyed.bind(object)
                case 'destroy': return object.destroyObject.bind(object)
                case 'get': return object.getItem.bind(object)
                case 'set': return object.setItem.bind(object)
                case 'has': return object.hasItem.bind(object)
                case 'delete': return object.deleteItem.bind(object)
                case 'keys': return object.itemKeys.bind(object)
                case 'getCn': return object.getCn.bind(object)
                case 'getRelation': return object.getRelation.bind(object)
                case 'getAllRelations': return object.getAllRelations.bind(object)
                case 'setRelation': return object.setRelation.bind(object)
                case 'addRelation': return object.addRelation.bind(object)
                case 'deleteRelation': return object.deleteRelation.bind(object)
                case 'getType': return object.getType.bind(object)
                case 'addEventListener': return object.addEventListener.bind(object)
                case 'removeEventListener': return object.removeEventListener.bind(object)
                case 'toString': return object.doToString.bind(object)
                case 'bindUINode': return object.doBindUINode.bind(object)
                case 'getUINode': return object.doGetUINode.bind(object)
                case 'update': return object.doUpdate.bind(object)
                case 'toXML': return object.doToXML.bind(object)
                case 'toJSON': return object.doToJSON.bind(object)
                case 'getFirstTextValue': return object.getFirstTextValue.bind(object)
                case 'getBody': return object.doGetBody.bind(object)
                case 'deleteObject': return object.doDeleteObject.bind(object)
                case 'relation': return undefined
                case 'clone': return object.doClone.bind(object)
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
                case 'isDestroyed':
                case 'destroy':
                case 'get':
                case 'set':
                case 'has':
                case 'getCn':
                case 'delete':
                case 'getRelation':
                case 'getAllRelations':
                case 'setRelation':
                case 'addRelation':
                case 'deleteRelation':
                case 'getType':
                case 'addEventListener':
                case 'removeEventListener':
                case 'toString':
                case 'bindUINode':
                case 'getUINode':
                case 'update':
                case 'toXML':
                case 'toJSON':
                case 'getFirstTextValue':
                case 'getBody':
                case 'deleteObject':
                case 'clone':
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
    kobject.toXML()
    kgstore.put(kobject)
    return kobject
}

KObject.prototype.doClone = function () {
    const data = new Map()
    for (const [key, value] of this.data) {
        data.set(key, value)
    }

    if (KAIROS.stores[this.type]['version'] && KAIROS.stores[this.type]['version'].remote) {
        data.delete(KAIROS.stores[this.type]['version'].remote)
    }
    if (KAIROS.stores[this.type]['uid'] && KAIROS.stores[this.type]['uid'].remote) {
        data.delete(KAIROS.stores[this.type]['uid'].remote)
    } else {
        for (const name of ['id', 'uid', 'uuid', 'IDent']) {
            if (data.has(name)) { data.delete(name); break }
        }
    }
    if (KAIROS.stores[this.type]['notClonable']) {
        for (const attr of KAIROS.stores[this.type]['notClonable']) {
            data.delete(attr)
        }
    }
    return new KObject(this.getType(), Object.fromEntries(data))
}


KObject.prototype.isObjectDestroyed = function () {
    return this.deleted
}

KObject.prototype.destroyObject = function () {
    const kgstore =  new KObjectGStore()
    this.lastChange = performance.now()
    this.deleted = true
    kgstore.delete(this.getType(), this.getItem('uid'))
}

KObject.prototype.addEventListener = function (type, listener, options) {
    this.evtTarget.addEventListener(type, listener, options)
}

KObject.prototype.removeEventListener = function (type, listener, options) {
    this.evtTarget.removeEventListener(type, listener, options)
}

KObject.prototype.doUpdate = function (data) {
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

KObject.prototype.doDeleteObject = function () {
    this.evtTarget.dispatchEvent(new CustomEvent('delete', {detail: {kobject: this}}))
}

KObject.prototype.deleteItem = function (name) {
    if (this.hasItem(name)) { 
        this.lastChange = performance.now()
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
    this.lastChange = performance.now()
    return this.data.set(name, value)
}

KObject.prototype.getItem = function (name, from = null) {
    if (from === null) { from = [] }
    from.push(this.getType())
    if (!name) { return '' }
    if (name === '') { return '' }
    if (name === 'cn') { return this.getCn() }
    if (name === 'last-change') { return this.lastChange }
    if (name.substring(0, 1) === '_') {
        const kostore = new KObjectGStore()
        const [ktype, kname] = name.substring(1).split('_')
        if (!this.relation) { return '' }
        if (this.relation.size <= 0) { return '' }
        const ifUpRelation = []
        for (const key of this.relation.keys()) {
            if (ktype !== key) { ifUpRelation.push([key, this.relation.get(key)]); continue }
            const relation = kostore.get(key, this.relation.get(key))
            if (!relation) { continue }
            if (from.indexOf(ktype) !== -1) { continue }
            if (relation.getType() !== ktype) { continue }
            if (kname) { 
                return relation.get(kname)
            } else {
                return relation.getCn()
            }
        }
        /* travel tree upward */
        for (const rel of ifUpRelation) {
            if (from.indexOf(rel[0]) !== -1) { continue }
            const relation = kostore.get(rel[0], rel[1])
            if (!relation) { continue }
            const val = relation.get(name, from)
            if (val !== '') { return val }
        }
        return ''
    }
    if (KAIROS.stores[this.type][name] && KAIROS.stores[this.type][name].remote) {
        if (this.hasItem(KAIROS.stores[this.type][name].remote)) {
            return this._getItem(KAIROS.stores[this.type][name].remote, from)
        }
    }
    return this._getItem(name, from)
}

KObject.prototype._getItem = function (name, from = []) {
    if (this.hasItem(name)) {
        const val = this.data.get(name)
        if (val !== '') { return val }
    }
    if (!KAIROS.stores[this.type]) { return '' }
    if (!KAIROS.stores[this.type].alternatives) { return '' }
    if (KAIROS.stores[this.type].alternatives[name]) {
        const val = this.getItem(KAIROS.stores[this.type].alternatives[name], from)
        return val
    }
    return ''
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
    let name = this.variables(KAIROS.stores[this.type].name)
    if (capitalize) { return name.charAt(0).toUpperCase() + name.slice(1) }
    return name
}

KObject.prototype.getCn = function () {
    return this.variables(KAIROS.stores[this.type].cn)
}

KObject.prototype.setRelation = function(type, kobject) {
    return this.addRelation(type, kobject)
}

KObject.prototype.addRelation = function (type, kobject) {
    if (!(kobject instanceof KObject)) {
        throw new Error('kobject must be an instance of KObject')
    }
    if (!this.relation.has(type)) { return this.relation.set(type, kobject.get('uid')) }
    const currentRelation = this.relation.get(type)
    if (!Array.isArray(currentRelation)) {
        if (currentRelation === kobject.get('uid')) { return true }
        return this.relation.set(type, [currentRelation, kobject.get('uid')])
    }
    if (currentRelation.indexOf(kobject.get('uid')) !== -1) { return true }
    currentRelation.push(kobject.get('uid'))
    return this.relation.set(type, currentRelation)
}

KObject.prototype.getRelation = function (type) {
    if (this.relation.has(type)) {
        const relations = this.relation.get(type)
        if (!Array.isArray(relations)) { return new KObjectGStore().get(type, relations) }
        const result = []
        for (const relation of relations) {
            result.push(new KObjectGStore().get(type, relation))
        }
        return result
    }
    return undefined
}

KObject.prototype.getAllRelations = function () {
    return this.relation
}

KObject.prototype.deleteRelation = function (type, kobject)  {
    const uid = kobject instanceof KObject ? kobject.get('uid') : String(kobject)
    const relations = this.relation.get(String(type))
    if (!relations) { return }
    if (relations instanceof Array) {
        const idx = relations.indexOf(uid)
        if (idx !== -1) {
            relations.splice(idx, 1)
        }
    } else {
        if (relations === uid) {
            this.relation.delete(type)
        }
    }
}

KObject.prototype.getType = function () {
    return this.type
}

KObject.prototype.doBindUINode = function (uinode) {
    this.UINode = uinode
}

KObject.prototype.doGetUINode = function () {
    return this.UINode
}

KObject.prototype.getFirstTextValue = function (defaultValue, ...attributes) {
    for (const attribute of attributes) {
        const value = this.getItem(attribute)
        if (value === null || value === undefined) { continue }
        if (value === 'null') { continue } // text 'null' is certainly an error somewhere
        if (value === '') { continue } // we return '' if nothing found, so skip empty string
        if (value === defaultValue) { continue }
        if (typeof value.toString === 'function') {
            return value.toString()
        }
        return value
    }
    return defaultValue
}

KObject.prototype.doToString = function () {
    function oToStr (object, level = 0) {
        let str = ''
        for (const key of Object.keys(object)) {
            switch (typeof object[key]) {
                case 'undefined': str += `${"    ".repeat(level)}[${key}] => ""\n`; break
                case 'object': 
                    if (object[key] === null) { str += `${"    ".repeat(level)}[${key}] => ""\n` }
                    if (object[key] instanceof Object) { str += `${"    ".repeat(level)}[${key}] => {\n${oToStr(object[key], ++level)}\n}\n` }
                    break
                case 'boolean':
                    str += `${"    ".repeat(level)}[${key}] => "${object[key] ? 'vrai' : 'faux'}"\n`; break
                case 'number':
                    str += `${"    ".repeat(level)}[${key}] => ${object[key].toString()}\n`; break
                case 'symbol':
                case 'function':
                default:
                    str += `${"    ".repeat(level)}[${key}] => "${object[key]}"\n`; break
            }
        }
    }
    return oToStr(Object.fromEntries(this.data.entries()), 0)
}

KObject.prototype.doGetBody = function () {
    return Object.fromEntries(this.data)
}

KObject.prototype.doToJSON = function () {
    const data = new Map()
    if (KAIROS.stores[this.getType()].fields) {
        for (const [key, value] of this.data) {
            if(KAIROS.stores[this.getType()].fields.indexOf(key) !== -1) {
                data.set(key, value)
            }
        }
    }
    return JSON.stringify(Object.fromEntries(data))
}

KObject.prototype.doToXML = function (stack = []) {
    const xmlDoc = document.implementation.createDocument('', '', null)

    const v2node = function (doc, key, value) {
        if (value === null) {
            const node = doc.createElement('value')
            node.setAttribute('name', key)
            node.setAttribute('type', 'null')

            return node
        }

        if (value instanceof Object) {   
            if (Array.isArray(value)) {
                const node = doc.createElement('value')
                node.setAttribute('name', key)
                node.setAttribute('type', 'array')
                let i = 0
                for (const element of value) {
                    node.appendChild(v2node(i++, element))
                }
                return node
            }
         
            const node = doc.createElement('value')
            node.setAttribute('name', key)
            node.setAttribute('type', 'object')
            const okeys = Object.keys(value)
            okeys.sort((a, b) => { return String(a).localeCompare(String(b)) })
            for (const x of okeys) {
                node.appendChild(v2node(doc, x, value[x]))
            }
        }
        switch (typeof value) {
            case 'boolean':
                {
                    const node = doc.createElement('value')
                    node.setAttribute('name', key)
                    node.setAttribute('type', 'boolean')
                    node.setAttribute('value', value ? 'true' : 'false')
                    return node
                }
            case 'string':
                {       
                    const node = doc.createElement('value')
                    node.setAttribute('name', key)
                    node.setAttribute('type', 'string')
                    node.appendChild(doc.createTextNode(String(value).normalize('NFC')))
                    return node
                }
            case 'number':
                {
                    const node = doc.createElement('value')
                    node.setAttribute('name', key)
                    node.setAttribute('type', 'number')
                    node.setAttribute('value', Number.toString(value))
                    return node
                }
        }
    }

    const keys = Array.from(this.data.keys())
    keys.sort((a, b) => { return String(a).localeCompare(String(b)) })
    const root = xmlDoc.createElement('kexport')
    root.setAttribute('date', new Date().toISOString())
    const mainObject = xmlDoc.createElement('kobject')
    root.appendChild(mainObject)
    xmlDoc.appendChild(root)
    mainObject.setAttribute('type', this.getType())
    mainObject.setAttribute('id', this.getItem('uid'))
    for (const key of keys) {
        const node =v2node(xmlDoc, key, this.data.get(key))
        mainObject.appendChild(node)
    }

    const relationsNode = xmlDoc.createElement('relation')
    mainObject.appendChild(relationsNode)
    const relationKeys = Array.from(this.relation.keys())
    relationKeys.sort((a, b) => { return String(a).localeCompare(b) })
    const gkstore = new KObjectGStore()
    stack.push(`${this.getType()}:${this.getItem('uid')}`)
    for (const relationKey of relationKeys) {
        const relation = Array.isArray(this.relation.get(relationKey)) ? this.relation.get(relationKey) : [this.relation.get(relationKey)]
        relation.sort((a, b) => { String(a).localeCompare(String(b)) })
        for (const relationId of relation) {
            const rel = xmlDoc.createElement('item')
            rel.setAttribute('type', relationKey)
            rel.setAttribute('object', relationId)
            relationsNode.appendChild(rel)
            object = gkstore.get(relationKey, relationId)
            if (stack.indexOf(`${relationKey}:${relationId}`) !== -1) { continue }
            const subDoc = object.toXML(stack)
            for (const node of subDoc.firstElementChild.children) {
                const subNode = node.cloneNode(true)
                root.appendChild(subNode)
            }
        }
    }
    return xmlDoc
}