/**
 * Navigation Widgets Example
 *
 * Demonstrates BreadCrumbs and Sidebar widgets.
 */
import { BreadCrumbs } from '../../../widgets/navigation/BreadCrumbs.js'
import { Sidebar } from '../../../widgets/navigation/Sidebar.js'

const $ = window.jQuery || window.$

// ─── BreadCrumbs Demo ────────────────────────────────────────────────

const crumbs = new BreadCrumbs({
    homeUrl: '#/',
    breadcrumbs: [
        { label: 'Products', url: '#/products' },
        { label: 'Electronics', url: '#/products/electronics' }
    ]
})
crumbs.appendTo('#breadcrumbs-demo')
crumbs.init()

$('#btn-add').click(() => crumbs.add({ label: 'Laptops', url: '#/products/electronics/laptops' }))
$('#btn-replace').click(() => crumbs.set([
    { label: 'Settings', url: '#/settings' },
    { label: 'Account', url: '#/settings/account' },
    { label: 'Security' }
]))
$('#btn-clear').click(() => crumbs.clear())
$('#btn-reset').click(() => crumbs.set([
    { label: 'Products', url: '#/products' },
    { label: 'Electronics', url: '#/products/electronics' }
]))

// ─── Sidebar Demo ────────────────────────────────────────────────────

const sidebar = new Sidebar({
    items: [
        {
            label: 'General',
            items: [
                { label: 'Overview', url: '#overview' },
                { label: 'Dashboard', url: '#dashboard' },
                { label: 'Analytics', url: '#analytics' }
            ]
        },
        {
            label: 'Configuration',
            items: [
                { label: 'Settings', url: '#settings' },
                { label: 'Users', url: '#users' },
                { label: 'Permissions', url: '#permissions' },
                { label: 'Legacy', url: '#legacy', disabled: true }
            ]
        },
        {
            label: 'Integrations',
            items: [
                { label: 'WhatsApp', url: '#whatsapp' },
                { label: 'Stripe', url: '#stripe' }
            ]
        }
    ]
})
sidebar.appendTo('#sidebar-demo')
sidebar.init()

sidebar.on('select', (url) => {
    $('#sidebar-output').html(`
        <strong>Selected:</strong> <code>${url}</code>
        <br><small class="text-muted">Hash changed → sidebar auto-highlights active item</small>
    `)
    // Also update breadcrumbs to show integration
    const label = url.replace('#', '').charAt(0).toUpperCase() + url.replace('#', '').slice(1)
    crumbs.set([
        { label: 'App', url: '#/' },
        { label: label }
    ])
})

// Expose for console
window.crumbs = crumbs
window.sidebar = sidebar
