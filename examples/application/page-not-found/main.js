/**
 * PageNotFound Examples
 */
import { PageNotFound } from '../../../application/PageNotFound.js'

const $ = window.jQuery

// 1. Default message
document.getElementById('btn-default').addEventListener('click', async () => {
    const container = $('#preview-default')
    container.empty()
    const page = new PageNotFound({ autoInit: false })
    page.appendTo(container)
    await page.init()
})

document.getElementById('btn-default-clear').addEventListener('click', () => {
    $('#preview-default').empty()
})

// 2. Custom message
document.getElementById('btn-custom').addEventListener('click', async () => {
    const container = $('#preview-custom')
    container.empty()
    const page = new PageNotFound({
        autoInit: false,
        message: 'Route "/settings/advanced" is not available in this version.'
    })
    page.appendTo(container)
    await page.init()
})

document.getElementById('btn-custom-clear').addEventListener('click', () => {
    $('#preview-custom').empty()
})

window.PageNotFound = PageNotFound
console.log('PageNotFound Examples loaded.')
