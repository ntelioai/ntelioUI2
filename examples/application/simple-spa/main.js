/**
 * Simple SPA Example
 *
 * Demonstrates:
 * - Application shell with sidebar navigation
 * - Hash-based routing (PageRouter)
 * - Page subclasses with different content
 * - PageNotFound for unmatched routes
 * - Footer customization
 * - Auth flow: LoginDialog + AuthProvider on startup
 * - Logout button in sidebar bottom menu
 * - Profile editor in Settings
 */
import { Application } from '../../../application/Application.js'
import { VerticalNavbar } from '../../../application/VerticalNavbar.js'
import { Page } from '../../../application/Page.js'
import { PageRouter } from '../../../application/PageRouter.js'
import { I18n } from '../../../utils/I18n.js'
import { Sidebar } from '../../../widgets/navigation/Sidebar.js'
import { AuthProvider } from '../../../data/AuthProvider.js'
import { LoginDialog } from '../../../application/LoginDialog.js'

const $ = window.jQuery || window.$
const t = (key, params) => I18n.t(key, params)

// ─── Demo Auth Provider ──────────────────────────────────────────────

/** In-memory auth provider for the demo. Accepts demo / demo. */
class DemoAuthProvider extends AuthProvider {
    _token = null
    _profile = null

    async login({ username, password }) {
        if (username === 'demo' && password === 'demo') {
            this._token = 'demo-token-' + Date.now()
            this._profile = { username, id: username, groups: ['admin'] }
            this._notifyLogin(this._profile)
            return this._profile
        }
        throw new Error('Invalid credentials. Try demo / demo')
    }

    async logout() {
        this._token = null
        this._profile = null
        this._notifyLogout()
    }

    isAuthenticated()       { return !!this._token }
    getToken()              { return this._token }
    getUserProfile()        { return this._profile }
    async restoreSession()  { return false }
}

// ─── Page Components ─────────────────────────────────────────────────

/** Dashboard page with summary cards. */
class DashboardPage extends Page {
    constructor(params = {}) {
        super({
            template: `
                <div class="page p-4">
                    <h2><i class="fas fa-tachometer-alt me-2"></i>${t('dashboard.title')}</h2>
                    <p class="text-muted">${t('dashboard.subtitle')}</p>
                    <div class="row mt-4">
                        <div class="col-md-4">
                            <div class="card text-bg-primary mb-3">
                                <div class="card-body">
                                    <h5 class="card-title">${t('dashboard.users')}</h5>
                                    <p class="card-text display-6">1,234</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-bg-success mb-3">
                                <div class="card-body">
                                    <h5 class="card-title">${t('dashboard.orders')}</h5>
                                    <p class="card-text display-6">567</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card text-bg-warning mb-3">
                                <div class="card-body">
                                    <h5 class="card-title">${t('dashboard.revenue')}</h5>
                                    <p class="card-text display-6">$12.3k</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="alert alert-info mt-3">
                        <strong>Try it:</strong> ${t('dashboard.tryIt')}
                        <code>PageRouter.navigate('/users')</code>
                    </div>
                </div>
            `,
            ...params
        })
    }
}

/** Users listing page with a sample data table. */
class UsersPage extends Page {
    constructor(params = {}) {
        super({
            template: `
                <div class="page p-4">
                    <h2><i class="fas fa-users me-2"></i>${t('users.title')}</h2>
                    <p class="text-muted">${t('users.subtitle')}</p>
                    <table class="table table-striped mt-3">
                        <thead>
                            <tr><th>${t('users.col.id')}</th><th>${t('users.col.name')}</th><th>${t('users.col.email')}</th><th>${t('users.col.role')}</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>1</td><td>Alice Johnson</td><td>alice@example.com</td><td><span class="badge bg-primary">${t('users.role.admin')}</span></td></tr>
                            <tr><td>2</td><td>Bob Smith</td><td>bob@example.com</td><td><span class="badge bg-secondary">${t('users.role.user')}</span></td></tr>
                            <tr><td>3</td><td>Carol Williams</td><td>carol@example.com</td><td><span class="badge bg-secondary">${t('users.role.user')}</span></td></tr>
                        </tbody>
                    </table>
                </div>
            `,
            ...params
        })
    }
}

/** Settings page with sub-navigation sidebar for General, Appearance, and Notifications. */
class SettingsPage extends Page {
    constructor(params = {}) {
        super({
            template: `
                <div class="page p-4">
                    <h2><i class="fas fa-cog me-2"></i>${t('settings.title')}</h2>
                    <p class="text-muted">${t('settings.subtitle')}</p>
                    <div class="d-flex mt-3" style="gap: 1.5rem;">
                        <div style="width: 200px; min-width: 200px; border-right: 1px solid #e9ecef;">
                            <div class="settings-sidebar"></div>
                        </div>
                        <div class="settings-content flex-grow-1"></div>
                    </div>
                </div>
            `,
            ...params
        })
    }

    /**
     * Initialize the settings sub-navigation sidebar and default section.
     * @returns {Promise<void>}
     */
    async init() {
        // Sub-navigation sidebar
        this._sidebar = new Sidebar({
            autoInit: false,
            items: [
                {
                    label: t('settings.cat.general'),
                    items: [
                        { label: t('settings.appName'), url: '#general' },
                        { label: t('settings.menuStyle'), url: '#appearance' }
                    ]
                },
                {
                    label: t('settings.cat.account'),
                    items: [
                        { label: 'Profile', url: '#profile' },
                        { label: 'Change Password', url: '#password' },
                        { label: t('settings.notifications'), url: '#notifications' }
                    ]
                }
            ]
        })
        this._sidebar.appendTo(this.find('.settings-sidebar'))
        await this._sidebar.init()
        this._sidebar.setActive('#general')

        // Show general section by default
        this._showSection('general')

        this._sidebar.on('select', (url) => {
            this._showSection(url.replace('#', ''))
        })
    }

    /**
     * Render a settings section into the content area.
     * @param {string} section - Section identifier ('general', 'appearance', 'notifications')
     * @private
     */
    _showSection(section) {
        const content = this.find('.settings-content')
        if (section === 'general') {
            content.html(`
                <h5>${t('settings.appName')}</h5>
                <form style="max-width: 400px;">
                    <div class="mb-3">
                        <label class="form-label">${t('settings.appName')}</label>
                        <input type="text" class="form-control" value="My SPA">
                    </div>
                    <button type="button" class="btn btn-primary btn-sm">${t('settings.save')}</button>
                </form>
            `)
        } else if (section === 'appearance') {
            const saved = localStorage.getItem('nui-sidebar-theme') || 'light'
            content.html(`
                <h5>${t('settings.menuStyle')}</h5>
                <form style="max-width: 400px;">
                    <div class="mb-3">
                        <label class="form-label">${t('settings.menuStyle')}</label>
                        <select class="form-select menu-style-select">
                            <option value="light">${t('settings.menuStyle.light')}</option>
                            <option value="dark">${t('settings.menuStyle.dark')}</option>
                        </select>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm btn-save">${t('settings.save')}</button>
                </form>
            `)
            content.find('.menu-style-select').val(saved)
            content.find('.btn-save').on('click', () => {
                const theme = content.find('.menu-style-select').val()
                if (window.app?.navbar?.setTheme) {
                    window.app.navbar.setTheme(theme)
                }
            })
        } else if (section === 'profile') {
            const auth = window.app?._auth
            const profile = auth?.getUserProfile() || {}
            content.html(`
                <h5>Profile</h5>
                <form style="max-width: 400px;">
                    <div class="mb-3">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-control" value="${profile.username || ''}" disabled>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Display Name</label>
                        <input type="text" class="form-control profile-display-name" value="${profile.displayName || profile.username || ''}" placeholder="Enter display name">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control profile-email" value="${profile.email || ''}" placeholder="Enter email">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Groups</label>
                        <input type="text" class="form-control" value="${(profile.groups || []).join(', ')}" disabled>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm btn-save-profile">${t('settings.save')}</button>
                    <span class="text-success ms-2 profile-saved" style="display:none;">Saved!</span>
                </form>
            `)
            content.find('.btn-save-profile').on('click', () => {
                if (profile) {
                    profile.displayName = content.find('.profile-display-name').val()
                    profile.email = content.find('.profile-email').val()
                }
                content.find('.profile-saved').fadeIn(200).delay(1500).fadeOut(200)
            })
        } else if (section === 'password') {
            content.html(`
                <h5>Change Password</h5>
                <form style="max-width: 400px;">
                    <div class="mb-3">
                        <label class="form-label">Current Password</label>
                        <input type="password" class="form-control pw-current" placeholder="Enter current password">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">New Password</label>
                        <input type="password" class="form-control pw-new" placeholder="Enter new password">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" class="form-control pw-confirm" placeholder="Confirm new password">
                    </div>
                    <button type="button" class="btn btn-primary btn-sm btn-change-pw">${t('settings.save')}</button>
                    <span class="text-success ms-2 pw-success" style="display:none;">Password changed!</span>
                    <div class="text-danger small mt-2 pw-error" style="display:none;"></div>
                </form>
            `)
            content.find('.btn-change-pw').on('click', () => {
                const current = content.find('.pw-current').val()
                const newPw = content.find('.pw-new').val()
                const confirm = content.find('.pw-confirm').val()
                const errorEl = content.find('.pw-error')
                errorEl.hide()

                if (!current) {
                    errorEl.text('Please enter your current password.').show()
                    return
                }
                if (current !== 'demo') {
                    errorEl.text('Current password is incorrect.').show()
                    return
                }
                if (!newPw || newPw.length < 4) {
                    errorEl.text('New password must be at least 4 characters.').show()
                    return
                }
                if (newPw !== confirm) {
                    errorEl.text('Passwords do not match.').show()
                    return
                }

                content.find('.pw-current, .pw-new, .pw-confirm').val('')
                content.find('.pw-success').fadeIn(200).delay(1500).fadeOut(200)
            })
        } else if (section === 'notifications') {
            content.html(`
                <h5>${t('settings.notifications')}</h5>
                <form style="max-width: 400px;">
                    <div class="form-check mb-3">
                        <input class="form-check-input" type="checkbox" checked>
                        <label class="form-check-label">${t('settings.notifications')}</label>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm">${t('settings.save')}</button>
                </form>
            `)
        }
    }
}

// ─── SVG Icons ───────────────────────────────────────────────────────

const icons = {
    dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    users: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    logout: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`
}

// ─── Boot ────────────────────────────────────────────────────────────

/** Main SPA application with VerticalNavbar, auth flow, and three pages. */
class MyApp extends Application {

    constructor(auth) {
        super({
            pathMap: {
                '/': DashboardPage,
                '/dashboard': DashboardPage,
                '/users': UsersPage,
                '/settings': SettingsPage
            },
            labelsMap: {
                '/dashboard': t('nav.dashboard'),
                '/users': t('nav.users'),
                '/settings': t('nav.settings')
            },
            menu: [
                { icon: icons.dashboard, label: t('nav.dashboard'), path: '/dashboard' },
                { icon: icons.users, label: t('nav.users'), path: '/users' }
            ],
            bottomMenu: [
                { icon: icons.settings, label: t('nav.settings'), path: '/settings' },
                { type: 'separator' },
                { icon: icons.logout, label: 'Logout', onClick: () => this._logout() }
            ],
            title: t('app.title'),
            NavbarCls: VerticalNavbar,
            footer: `<div class="footer-text">${t('app.footer')}</div>`
        })
        this._auth = auth
    }

    async _logout() {
        await this._auth.logout()
        this.destroy()
        await LoginDialog.open({
            authProvider: this._auth,
            title: 'Simple SPA Login',
            showRememberMe: false
        })
        MyApp._boot(this._auth)
    }

    /**
     * Load i18n translations, show login, and boot the application.
     * @returns {Promise<void>}
     */
    static async load() {
        const basePath = new URL('./i18n', import.meta.url).href
        await I18n.load(basePath)

        const auth = new DemoAuthProvider()
        await LoginDialog.open({
            authProvider: auth,
            title: 'Simple SPA Login',
            showRememberMe: false
        })

        $(document).ready(function() {
            MyApp._boot(auth)
        })
    }

    static _boot(auth) {
        const app = new MyApp(auth)
        app.appendTo('body')
        app.init()
        window.app = app
    }
}

MyApp.load()

// Expose for console debugging
window.MyApp = MyApp
window.PageRouter = PageRouter
