window.addEventListener('load', event => {
    let themeCss = document.createElement('LINK')
    themeCss.type="text/css"
    themeCss.rel="stylesheet"
    themeCss.href="../css/themes/default/default.css"
    if (localStorage.getItem('location/theme')) {
        let theme = localStorage.getItem('location/theme')
        themeCss.href=`../css/themes/${theme}/${theme}.css`
    }
    themeCss.addEventListener('load', event => {
        setTimeout(() => {
            window.requestAnimationFrame(() => {
                let n = document.getElementById('cssLoading')
                if (n) {
                    n.parentNode.removeChild(n)
                }
            })
        }, 500)
    })
    
    window.requestAnimationFrame(() => {
        document.head.appendChild(themeCss)
    })
})