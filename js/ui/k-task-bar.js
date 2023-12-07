function KTaskBar () {
    if (KTaskBar._taskBar) { return KTaskBar._taskBar }

    KTaskBar._taskBar = this
    this.currentTaskData = null
    this.taskbar = document.createElement('DIV')
    this.taskbar.id = 'KTaskBar'
    this.taskbar.style.setProperty('z-index', KAIROS.zMax())
    this.taskbar.innerHTML = `
        <div class="currentTask"></div>
        <div class="currentInfo"></div>
    `
    KAIROS.keepAtTop(this.taskbar)

    window.requestAnimationFrame(() => { document.body.appendChild(this.taskbar) })
}

KTaskBar.prototype.getCurrentTaskData = function () {
    return this.currentTaskData
}

KTaskBar.prototype.resetCurrentTask = function() {
    this.currentTaskData = null
    window.requestAnimationFrame(() => {
        this.taskbar.querySelector('.currentTask').innerHTML = ''
    })
}

KTaskBar.prototype.setCurrentTask = function (what, onWhat, data) {
    new KClosable().add(null, {mouse: true, function: () => { this.resetCurrentTask(); return true}})
    this.currentTaskData = data
    window.requestAnimationFrame(() => {
        this.taskbar.querySelector('.currentTask').innerHTML = `<span class="what">${what}</span> <span class="on">${onWhat}</span>`
    })
}

KTaskBar.prototype.setCurrentInfo = function (info) {
    window.requestAnimationFrame(() => {
        this.taskbar.querySelector('.currentInfo').innerHTML = info
    })
}

KTaskBar.prototype.resetCurrentInfo = function () {
    window.requestAnimationFrame(() => {
        this.taskbar.querySelector('.currentInfo').innerHTML = ''
    })
}