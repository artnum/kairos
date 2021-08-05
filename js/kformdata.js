function KFormData () {}

KFormData.new = function (form, formdata = null) {
    const fdata = formdata || new FormData()

    const normalize = (v) => { return v.replace(/\r?\n|\r/g, '\n') }

    for (const child of form.children) {
        if (child.children.length > 0) { KFormData.new(child, fdata) }
        if (
            child.disabled ||
            child.type === 'button' ||
            child.type === 'submit' ||
            child.matches('fieldset[disabled] *') ||
            !child.hasAttribute('name')
        ) { continue }

        if (child.nodeName === 'TEXTAREA') {
            fdata.append(child.getAttribute('name'), normalize(child.value))
            continue
        }

        if (child.type === 'checkbox' || child.type === 'radio') {
            if (child.checked) { fdata.append(child.getAttribute('name'), child.value) }
            continue
        }

        if (child.type === 'select-multiple' || child.type === 'select-one') {
            for (const opt of child.options) {
                if (opt.disabled) { continue }
                if (!opt.selected) { continue }
                fdata.append(child.getAttribute('name'), opt.value)
            }
            continue
        }

        if (child.dataset.value) {
            fdata.append(child.getAttribute('name'), child.dataset.value)
            continue
        }
        if (child.value) {
            fdata.append(child.getAttribute('name'), child.value)
        }
    }

    return fdata
}