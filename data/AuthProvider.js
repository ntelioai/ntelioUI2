/**
 * @typedef {Object} UserProfile
 * @property {string} username  - Login name or email
 * @property {string} id        - Unique user identifier
 * @property {string[]} [groups] - Roles or permission groups the user belongs to
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string}  username    - Username or email
 * @property {string}  password    - Password
 * @property {boolean} [rememberMe] - Persist session across page reloads
 */

/**
 * Abstract authentication provider.
 *
 * Defines the contract for login, logout, session management, and
 * token access. Consuming applications extend this class for their
 * platform (Scriptr.io, Firebase, OAuth, etc.) and inject the
 * instance into LoginDialog or Application.
 *
 * Follows the same abstract pattern as {@link DataProvider}: abstract
 * methods throw if not overridden, concrete event methods are provided
 * by the base class.
 *
 * @abstract
 *
 * @example
 * // Platform-specific implementation
 * class ScriptrAuthProvider extends AuthProvider {
 *     async login({ username, password, rememberMe }) {
 *         const res = await fetch('/api/auth/login', {
 *             method: 'POST',
 *             headers: { 'Content-Type': 'application/json' },
 *             body: JSON.stringify({ email: username, password })
 *         })
 *         if (!res.ok) throw new Error('Invalid credentials')
 *         const data = await res.json()
 *         this._token = data.token
 *         this._profile = { username: data.user.login, id: data.user.login, groups: data.user.groups }
 *         if (rememberMe) localStorage.setItem('auth_token', data.token)
 *         this._notifyLogin(this._profile)
 *         return this._profile
 *     }
 *     async logout() {
 *         this._token = null
 *         this._profile = null
 *         localStorage.removeItem('auth_token')
 *         this._notifyLogout()
 *     }
 *     isAuthenticated() { return !!this._token }
 *     getToken() { return this._token }
 *     getUserProfile() { return this._profile }
 *     async restoreSession() {
 *         const token = localStorage.getItem('auth_token')
 *         if (!token) return false
 *         this._token = token
 *         // optionally fetch profile from server
 *         return true
 *     }
 * }
 *
 * @example
 * // Usage with LoginDialog
 * import { LoginDialog } from '../application/LoginDialog.js'
 *
 * const auth = new ScriptrAuthProvider()
 * const profile = await LoginDialog.open({ authProvider: auth })
 * console.log('Logged in as', profile.username)
 *
 * @example
 * // Usage in an Application startup flow
 * const auth = new ScriptrAuthProvider()
 * const restored = await auth.restoreSession()
 * if (!restored) {
 *     await LoginDialog.open({ authProvider: auth })
 * }
 * // auth.getToken() is now available for API calls
 *
 * @category Data
 */
export class AuthProvider {

    /** @type {function[]} @private */
    _loginListeners = []

    /** @type {function[]} @private */
    _logoutListeners = []

    // ─── Abstract Methods ────────────────────────────────────────────

    /**
     * Authenticate with the given credentials.
     *
     * Must be implemented by subclass. Should persist the session if
     * `rememberMe` is true, and call `this._notifyLogin(profile)` on
     * success.
     *
     * @param {LoginCredentials} credentials
     * @returns {Promise<UserProfile>} The authenticated user profile
     * @throws {Error} If authentication fails (message shown in LoginDialog)
     * @abstract
     */
    async login(credentials) {
        throw new Error('AuthProvider.login() must be implemented by subclass')
    }

    /**
     * End the current session.
     *
     * Must be implemented by subclass. Should clear token, profile,
     * and any persisted session data, then call `this._notifyLogout()`.
     *
     * @returns {Promise<void>}
     * @abstract
     */
    async logout() {
        throw new Error('AuthProvider.logout() must be implemented by subclass')
    }

    /**
     * Check whether a valid session exists.
     *
     * @returns {boolean} True if the user is currently authenticated
     * @abstract
     */
    isAuthenticated() {
        throw new Error('AuthProvider.isAuthenticated() must be implemented by subclass')
    }

    /**
     * Return the current authentication token for API requests.
     *
     * @returns {string|null} Auth token, or null if not authenticated
     * @abstract
     */
    getToken() {
        throw new Error('AuthProvider.getToken() must be implemented by subclass')
    }

    /**
     * Return the current user's profile.
     *
     * @returns {UserProfile|null} Profile object, or null if not authenticated
     * @abstract
     */
    getUserProfile() {
        throw new Error('AuthProvider.getUserProfile() must be implemented by subclass')
    }

    /**
     * Attempt to restore a previous session from persistent storage
     * (cookies, localStorage, etc.) on application startup.
     *
     * @returns {Promise<boolean>} True if a valid session was restored
     * @abstract
     */
    async restoreSession() {
        throw new Error('AuthProvider.restoreSession() must be implemented by subclass')
    }

    // ─── Event System ────────────────────────────────────────────────

    /**
     * Register a handler called after successful login.
     *
     * @param {function(UserProfile):void} handler - Receives the user profile
     * @returns {function():void} Unsubscribe function
     */
    onLogin(handler) {
        this._loginListeners.push(handler)
        return () => {
            this._loginListeners = this._loginListeners.filter(h => h !== handler)
        }
    }

    /**
     * Register a handler called after logout.
     *
     * @param {function():void} handler
     * @returns {function():void} Unsubscribe function
     */
    onLogout(handler) {
        this._logoutListeners.push(handler)
        return () => {
            this._logoutListeners = this._logoutListeners.filter(h => h !== handler)
        }
    }

    /**
     * Notify all login listeners. Call this from your `login()`
     * implementation after authentication succeeds.
     *
     * @param {UserProfile} profile - The authenticated user profile
     * @protected
     */
    _notifyLogin(profile) {
        this._loginListeners.forEach(h => h(profile))
    }

    /**
     * Notify all logout listeners. Call this from your `logout()`
     * implementation after the session is cleared.
     *
     * @protected
     */
    _notifyLogout() {
        this._logoutListeners.forEach(h => h())
    }
}
