function KContextMenu(title, pickup = false) {
    if (pickup && KContextMenu._instance && (KContextMenu._instance.titles && KContextMenu._instance.titles.indexOf(title) === -1)) {
        KContextMenu._instance.addTitle(title)
        return KContextMenu._instance
    }
    this.order = 0
    this.titles = []
    this._init(title)
    /* chain of promises to ensure that items are kept in order */
    this._mousePosition = [0, 0]
    KContextMenu._instance = this
}

KContextMenu.prototype = {
    _init: function (title) {
        this._deinit()

        this._contextMenu = document.createElement('DIV');
        this._contextMenu.id = 'KContextMenu';
        this._contextMenu.style.setProperty('z-index', KAIROS.zMax());
        this.addTitle(title)

        KAIROS.keepAtTop(this._contextMenu);

        this._contextMenu.dataset.kclosableIdx = new KClosable().add(this._contextMenu, {function: () => { window.requestAnimationFrame(() => document.getElementById('KContextMenu')?.remove()); return true }, mouse: true})
        window.addEventListener('scroll', _ => { this._deinit() }, {capture: true})
        window.requestAnimationFrame(() => {
            document.body.appendChild(this._contextMenu);
        });
    },

    addTitle: function (title) {
        const titleNode = document.createElement('DIV');
        this.titles.push(title)
        titleNode.classList.add('title');
        titleNode.innerHTML = title;
        titleNode.style.order = ++this.order
        window.requestAnimationFrame(() => {
            this._contextMenu.appendChild(titleNode);
        })
    },

    _deinit: function () {
        KContextMenu._instance = undefined
        new KClosable().closeByIdx(document.getElementById('KContextMenu')?.dataset.kclosableIdx)
    },

    show: function (x, y) {
        this._mousePosition = [x, y]
        new Promise(resolve => {
            window.requestAnimationFrame(() => {
                this._contextMenu.style.visibility = 'hidden'
                this._contextMenu.style.display = 'flex'
                this._contextMenu.style.flexDirection = 'column'
                this._contextMenu.style.position = 'fixed'
                this._contextMenu.style.left = x + 'px'
                this._contextMenu.style.top = y + 'px'
                resolve()
            });
        })
        .then(_ => {
            const height = this._contextMenu.getBoundingClientRect().height
            if (y + height > window.innerWidth) {
                window.requestAnimationFrame(() => this._contextMenu.style.top = (y - height) + 'px')
            }
            window.requestAnimationFrame(() => this._contextMenu.style.visibility = 'visible')
        })
    },

    hide: function () {
        window.requestAnimationFrame(() => {
            this._contextMenu.style.display = 'none'
        });
    },

    add: function (title, action) {
        const node = document.createElement('DIV')
        node.classList.add('item')
        node.style.order = ++this.order
        node.addEventListener('click', event => {
            let res
            try {
                res = action(event, this._mousePosition[0], this._mousePosition[1])
            } catch (e) {
                console.error(e)
            }
            this._deinit()
            return res
        })
        node.innerHTML = title;

        window.requestAnimationFrame(() => {
            this._contextMenu.appendChild(node);
        })

    },
    
    separator: function () {
        const div = document.createElement('DIV')
        div.style.order = ++this.order
        div.classList.add('separator', 'item')
    
        window.requestAnimationFrame(() => {
            this._contextMenu.appendChild(div)
        })
    }
};