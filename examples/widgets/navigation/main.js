/**
 * Navigation Widgets Example
 *
 * Demonstrates BreadCrumbs, Sidebar, and Dock widgets.
 */
import { BreadCrumbs } from '../../../widgets/navigation/BreadCrumbs.js'
import { Sidebar } from '../../../widgets/navigation/Sidebar.js'
import { Dock } from '../../../widgets/navigation/Dock.js'

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

// ─── Dock Demo (vertical) ────────────────────────────────────────────

// Helper: wrap a Material Symbol name in an icon-font tag. The Dock widget
// itself doesn't care which icon system you use — `icon` accepts any HTML.
const sym = (name) => `<i class="material-symbols-outlined" style="font-size:22px">${name}</i>`

const dockVert = new Dock({
    orientation: 'vertical',
    tooltipSide: 'left',
    label: 'Demo<br>Control',
    active: 'home',
    items: [
        { id: 'home',    icon: sym('home'),         tooltip: 'Home' },
        { id: 'profile', icon: sym('person'),       tooltip: 'Profile' },
        { type: 'separator' },
        { id: 'reset',   icon: sym('restart_alt'),  tooltip: 'Reset chat' },
        { type: 'separator' },
        { id: 'clear',   icon: sym('delete_sweep'), tooltip: 'Clear messages' }
    ]
})
dockVert.appendTo('#dock-vertical-mount')
dockVert.init()

dockVert.on('select', ({ id, item }) => {
    $('#dock-output').text(`select → id=${id}  tooltip=${item.tooltip}`)
    // For toggle-style items (home / profile) reflect the selection visually.
    if (id === 'home' || id === 'profile') dockVert.setActive(id)
})

$('#dock-btn-active-a').click(() => dockVert.setActive('home'))
$('#dock-btn-active-b').click(() => dockVert.setActive('profile'))
$('#dock-btn-active-none').click(() => dockVert.setActive(null))
$('#dock-btn-replace').click(() => dockVert.setItems([
    { id: 'search',   icon: sym('search'),        tooltip: 'Search' },
    { id: 'inbox',    icon: sym('inbox'),         tooltip: 'Inbox' },
    { id: 'starred',  icon: sym('star'),          tooltip: 'Starred' },
    { type: 'separator' },
    { id: 'archive',  icon: sym('archive'),       tooltip: 'Archive' }
]))

// ─── Dock Demo (horizontal) ──────────────────────────────────────────

const dockHoriz = new Dock({
    orientation: 'horizontal',
    tooltipSide: 'top',
    active: 'mail',
    items: [
        { id: 'finder',   icon: sym('folder_open'),   tooltip: 'Finder' },
        { id: 'mail',     icon: sym('mail'),          tooltip: 'Mail' },
        { id: 'calendar', icon: sym('event'),         tooltip: 'Calendar' },
        { type: 'separator' },
        { id: 'music',    icon: sym('library_music'), tooltip: 'Music' },
        { id: 'photos',   icon: sym('image'),         tooltip: 'Photos' },
        { type: 'separator' },
        { id: 'trash',    icon: sym('delete'),        tooltip: 'Trash' }
    ]
})
dockHoriz.appendTo('#dock-horizontal-mount')
dockHoriz.init()
dockHoriz.on('select', ({ id }) => dockHoriz.setActive(id))

// Expose for console
window.crumbs = crumbs
window.sidebar = sidebar
window.dockVert = dockVert
window.dockHoriz = dockHoriz
