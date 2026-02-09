import { Autoform } from '../../../forms/Autoform.js'
import { I18n } from '../../../utils/I18n.js'

const $ = window.jQuery

// ─── Logging helper ─────────────────────────────────────────────

/**
 * Append a timestamped message to the event log panel.
 * @param {string} msg - Message to log
 */
function log(msg) {
    const time = new Date().toLocaleTimeString()
    panel.text(panel.text() + `\n[${time}] ${msg}`)
    panel.scrollTop(panel[0].scrollHeight)
}

$('#btn-clear-log').on('click', () => {
    $('#event-log').text('Waiting for events...')
})

// ─── Demo 1: Basic Contact Form ────────────────────────────────

$('#btn-basic').on('click', () => {
    const container = $('#basic-form-container')
    container.html('')

    I18n.loadTranslations('en', {
        name: 'Your Name',
        email: 'Email Address',
        message: 'Your Message'
    })

    const form = new Autoform({
        title: 'Contact Us',
        fields: [
            { label: 'name', name: 'name', type: 'text', required: true },
            { label: 'email', name: 'email', type: 'email', required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$', patternMessage: 'Please enter a valid email' },
            { label: 'message', name: 'message', type: 'textarea', rows: 4 }
        ]
    })

    form.on('submit', (data) => {
        log('SUBMIT (basic): ' + JSON.stringify(data.data))
        log('Stringified:\n' + data.stringified)
    })
    form.on('reset', () => {
        log('RESET (basic): form cleared')
    })

    form.init().then(() => form.appendTo(container))
})

// ─── Demo 2: All Field Types ───────────────────────────────────

$('#btn-all-types').on('click', () => {
    const container = $('#all-types-container')
    container.html('')

    I18n.loadTranslations('en', {
        username: 'Username',
        pass: 'Password',
        age: 'Age',
        contactEmail: 'Contact Email',
        bio: 'Short Bio',
        agree: 'I agree to the terms',
        rating: 'Rate our service',
        country: 'Country',
        satisfaction: 'Satisfaction Level',
        dob: 'Date of Birth'
    })

    const form = new Autoform({
        title: 'All Field Types Demo',
        fields: [
            { label: 'username', name: 'username', type: 'text', required: true },
            { label: 'pass', name: 'password', type: 'password' },
            { label: 'age', name: 'age', type: 'number', min: 0, max: 150, step: 1 },
            { label: 'contactEmail', name: 'contact_email', type: 'email' },
            { label: 'bio', name: 'bio', type: 'textarea', rows: 3 },
            { label: 'agree', name: 'agree', type: 'checkbox' },
            { label: 'rating', name: 'rating', type: 'rating' },
            {
                label: 'country', name: 'country', type: 'select',
                options: ['USA', 'UK', 'France', 'Germany', 'Japan', 'Australia']
            },
            {
                label: 'satisfaction', name: 'satisfaction', type: 'range',
                min: 0, max: 10, step: 1, value: 5
            },
            { label: 'dob', name: 'dob', type: 'calendar', placeholder: 'Pick a date' }
        ]
    })

    form.on('submit', (data) => {
        log('SUBMIT (all-types): ' + JSON.stringify(data.data))
    })
    form.on('reset', () => {
        log('RESET (all-types): form cleared')
    })

    form.init().then(() => form.appendTo(container))
})

// ─── Demo 3: Multi-Value Fields ────────────────────────────────

$('#btn-multi').on('click', () => {
    const container = $('#multi-form-container')
    container.html('')

    I18n.loadTranslations('en', {
        skills: 'Select Skills',
        tags: 'Add Tags',
        category: 'Category'
    })

    const form = new Autoform({
        title: 'Multi-Value Demo',
        fields: [
            {
                label: 'skills', name: 'skills', type: 'multiDropdown',
                options: [
                    { value: 'js', label: 'JavaScript' },
                    { value: 'py', label: 'Python' },
                    { value: 'go', label: 'Go' },
                    { value: 'rust', label: 'Rust' },
                    { value: 'java', label: 'Java' },
                    { value: 'csharp', label: 'C#' }
                ],
                value: ['js']
            },
            {
                label: 'tags', name: 'tags', type: 'multiValue',
                placeholder: 'Type a tag and press +',
                value: ['frontend', 'open-source']
            },
            {
                label: 'category', name: 'category', type: 'dropDown',
                options: ['Engineering', 'Design', 'Marketing', 'Sales']
            }
        ]
    })

    form.on('submit', (data) => {
        log('SUBMIT (multi): ' + JSON.stringify(data.data))
    })
    form.on('reset', () => {
        log('RESET (multi): form cleared')
    })

    form.init().then(() => form.appendTo(container))
})

// Auto-create the basic form on page load
$(document).ready(() => {
    $('#btn-basic').trigger('click')
})
