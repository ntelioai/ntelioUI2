import { AuthProvider } from './AuthProvider.js'

/**
 * Scriptr.io authentication provider for ntelioUI2.
 *
 * Bridges the ntelioUI2 {@link AuthProvider} interface to scriptr.io's
 * user-token authentication system via ntelioMiddleware REST API.
 *
 * Supports single-tenant (direct) and multi-tenant (provisioning) modes.
 * Session persistence uses cookies (30-day expiry when `rememberMe` is set).
 *
 * @extends AuthProvider
 *
 * @example
 * import { ScriptrAuthProvider } from './data/ScriptrAuthProvider.js'
 * import { LoginDialog } from './application/LoginDialog.js'
 *
 * const auth = new ScriptrAuthProvider({
 *     serverUrl: 'https://myinstance.scriptrapps.io',
 *     anonymousToken: 'YOUR_ANON_TOKEN'
 * })
 *
 * const restored = await auth.restoreSession()
 * if (!restored) {
 *     await LoginDialog.open({ authProvider: auth })
 * }
 * // auth.getToken() is now available for API calls
 *
 * @category Data
 */
export class ScriptrAuthProvider extends AuthProvider {

    /** @type {string|null} */
    _token = null

    /** @type {import('./AuthProvider.js').UserProfile|null} */
    _profile = null

    /** @type {string} */
    _serverUrl = ''

    /** @type {string|null} */
    _anonymousToken = null

    /** @type {boolean} */
    _multiTenant = false

    /** @type {string|null} Multi-tenant auth key */
    _authKey = null

    /** @type {string|null} Multi-tenant sub-account server URL */
    _subAccountUrl = null

    /**
     * @param {Object} config
     * @param {string} config.serverUrl       - scriptr.io instance URL (e.g. 'https://myinstance.scriptrapps.io')
     * @param {string} [config.anonymousToken] - Anonymous token for unauthenticated login requests
     * @param {boolean} [config.multiTenant=false] - Enable multi-tenant provisioning flow
     */
    constructor(config = {}) {
        super()
        this._serverUrl = config.serverUrl || ''
        this._anonymousToken = config.anonymousToken || null
        this._multiTenant = config.multiTenant === true
    }

    // ─── Abstract Method Implementations ──────────────────────────

    /**
     * Authenticate against scriptr.io.
     *
     * Single-tenant: POST to `/ntelioMiddleware/server/public/api/core/v1/users/auth/login`
     * Multi-tenant:  POST to `/ntelioMiddleware/server/public/api/app/v1/provisioning/auth/login`
     *
     * @param {import('./AuthProvider.js').LoginCredentials} credentials
     * @returns {Promise<import('./AuthProvider.js').UserProfile>}
     * @throws {Error} If authentication fails
     */
    async login({ username, password, rememberMe } = {}) {
        const loginUrl = this._multiTenant
            ? `${this._getBaseUrl()}/ntelioMiddleware/server/public/api/app/v1/provisioning/auth/login`
            : `${this._getBaseUrl()}/ntelioMiddleware/server/public/api/core/v1/users/auth/login`

        const res = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._anonymousToken || ''}`
            },
            credentials: 'include',
            body: JSON.stringify({ email: username, password })
        })

        const data = typeof res.ok && await res.json()
        if (!res.ok) throw new Error(data?.error?.message || 'Login failed')

        // Handle scriptr.io error responses (200 status but error in body)
        if (data.error) throw new Error(data.error.message || 'Login failed')
        if (!data.token) throw new Error('Login failed: no token received')

        // Store token and profile
        this._token = data.token
        this._profile = {
            username: data.user.login,
            id: data.user.login,
            groups: data.user.groups || []
        }

        // Handle multi-tenant sub-account routing
        if (this._multiTenant && data.businessAccount?.serverUrl) {
            this._authKey = data.businessAccount.authKey
            this._subAccountUrl = data.businessAccount.serverUrl
        }

        // Persist session
        if (rememberMe) this._saveCookies()

        this._notifyLogin(this._profile)
        return this._profile
    }

    /** @returns {Promise<void>} */
    async logout() {
        this._token = null
        this._profile = null
        this._authKey = null
        this._subAccountUrl = null
        this._clearCookies()
        this._notifyLogout()
    }

    /** @returns {boolean} */
    isAuthenticated() {
        if (this._token) return true
        // Attempt cookie restore
        return this._restoreFromCookies()
    }

    /** @returns {string|null} */
    getToken() {
        return this._token
    }

    /** @returns {import('./AuthProvider.js').UserProfile|null} */
    getUserProfile() {
        return this._profile
    }

    /**
     * Attempt to restore a previous session from cookies.
     * @returns {Promise<boolean>}
     */
    async restoreSession() {
        if (this._token) return true
        return this._restoreFromCookies()
    }

    // ─── Helpers ──────────────────────────────────────────────────

    /** @returns {string} The effective base URL (sub-account in multi-tenant, or main server) */
    _getBaseUrl() {
        return this._subAccountUrl || this._serverUrl
    }

    /**
     * Return the base URL for authenticated API calls.
     * In multi-tenant mode after login, routes through api.scriptrapps.io.
     * @returns {string}
     */
    getApiBaseUrl() {
        if (this._multiTenant && this._subAccountUrl) {
            return 'https://api.scriptrapps.io'
        }
        return this._serverUrl
    }

    /** @returns {string} REST API base path for ntelioMiddleware */
    getRestApiBaseUrl() {
        return `${this.getApiBaseUrl()}/ntelioMiddleware/server/api`
    }

    /** Persist session to cookies (30-day expiry). @private */
    _saveCookies() {
        const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
        const opts = `expires=${expires}; path=/; SameSite=Strict; Secure`
        document.cookie = `nui_token=${encodeURIComponent(this._token)}; ${opts}`
        document.cookie = `nui_profile=${encodeURIComponent(JSON.stringify(this._profile))}; ${opts}`
        if (this._multiTenant && this._authKey) {
            document.cookie = `nui_mode=multi-tenant; ${opts}`
            document.cookie = `nui_authKey=${encodeURIComponent(this._authKey)}; ${opts}`
            document.cookie = `nui_subUrl=${encodeURIComponent(this._subAccountUrl)}; ${opts}`
        }
    }

    /** Clear session cookies. @private */
    _clearCookies() {
        const clear = 'expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; Secure'
        ;['nui_token', 'nui_profile', 'nui_mode', 'nui_authKey', 'nui_subUrl']
            .forEach(name => { document.cookie = `${name}=; ${clear}` })
    }

    /**
     * Try to restore session state from cookies.
     * @returns {boolean} True if restored successfully
     * @private
     */
    _restoreFromCookies() {
        const token = this._getCookie('nui_token')
        const profileStr = this._getCookie('nui_profile')
        if (!token || !profileStr) return false

        try {
            this._token = token
            this._profile = JSON.parse(profileStr)

            if (this._getCookie('nui_mode') === 'multi-tenant') {
                this._authKey = this._getCookie('nui_authKey')
                this._subAccountUrl = this._getCookie('nui_subUrl')
            }
            return true
        } catch {
            this._clearCookies()
            return false
        }
    }

    /**
     * Read a cookie by name.
     * @param {string} name
     * @returns {string|null}
     * @private
     */
    _getCookie(name) {
        const match = document.cookie
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith(name + '='))
        if (!match) return null
        try { return decodeURIComponent(match.substring(name.length + 1)) }
        catch { return null }
    }
}
