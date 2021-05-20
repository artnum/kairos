(_ => {
    const theme = localStorage.getItem('location/theme')
    if (theme) {
        KLoadResources([[`../css/themes/${theme}/${theme}.css`, 'css']])
    } else {
        KLoadResources([['../css/themes/default/default.css', 'css']])
    }
})()