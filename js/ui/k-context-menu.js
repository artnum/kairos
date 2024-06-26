function KContextMenu(title) {
    this._init(title);
    /* chain of promises to ensure that items are kept in order */
    this._requestAnimationPipeline = Promise.resolve()
    this._mousePosition = [0, 0]
}

KContextMenu.prototype = {
    _init: function (title) {
        this._deinit()
        this._contextMenu = document.createElement('DIV');
        this._contextMenu.id = 'KContextMenu';
        this._contextMenu.style.setProperty('z-index', KAIROS.zMax());
        const titleNode = document.createElement('DIV');
        titleNode.classList.add('title');
        titleNode.innerHTML = title;
        this._contextMenu.appendChild(titleNode);
        KAIROS.keepAtTop(this._contextMenu);
        window.requestAnimationFrame(() => {
            document.body.appendChild(this._contextMenu);
        });
        this._contextMenu.dataset.kclosableIdx = new KClosable().add(this._contextMenu, {function: () => { window.requestAnimationFrame(() => document.getElementById('KContextMenu')?.remove()); return true }, mouse: true})
        window.addEventListener('scroll', _ => { this._deinit() }, {capture: true})
        
    },

    _deinit: function () {
        new KClosable().closeByIdx(document.getElementById('KContextMenu')?.dataset.kclosableIdx)
    },

    show: function (x, y) {
        this._mousePosition = [x, y]
        window.requestAnimationFrame(() => {
            this._contextMenu.style.display = 'block';
            this._contextMenu.style.position = 'fixed';
            this._contextMenu.style.left = x + 'px';
            this._contextMenu.style.top = y + 'px';
        });
    },

    hide: function () {
        window.requestAnimationFrame(() => {
            this._contextMenu.style.display = 'none';
        });
    },

    add: function (title, action) {
        const node = document.createElement('DIV');
        node.classList.add('item');
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
        this._requestAnimationPipeline.then(() => {
            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    this._contextMenu.appendChild(node);
                    resolve()
                })
            })
        })
    },
    
    separator: function () {
        const div = document.createElement('DIV')
        div.classList.add('separator', 'item')
        this._requestAnimationPipeline.then(() => {
            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    this._contextMenu.appendChild(div)
                    resolve()
                })
            })
        })
    }
};