/**
 * Modal login form with injectable authentication.
 *
 * Accepts either an {@link AuthProvider} instance (recommended) or a
 * raw `authenticate` function. Both keep the dialog decoupled from
 * any specific auth backend.
 *
 * @example
 * // With AuthProvider (recommended)
 * import { ScriptrAuthProvider } from './lib/ScriptrAuthProvider.js'
 * const auth = new ScriptrAuthProvider({ serverUrl: '...' })
 * const profile = await LoginDialog.open({ authProvider: auth })
 *
 * @example
 * // With raw function (backward compatible)
 * const result = await LoginDialog.open({
 *     authenticate: async ({ username, password }) => {
 *         return await myApi.login(username, password)
 *     }
 * })
 */
import { Widget } from '../core/Widget.js'
import { ResourceLoader } from '../core/ResourceLoader.js'
import { Modal } from '../widgets/dialogs/Modal.js'

const $ = window.jQuery || window.$

/** @category Application */
export class LoginDialog extends Widget {

    static defaults = {
        title: 'Please sign in',
        termsUrl: null,
        termsTitle: 'Terms and Conditions',
        showRememberMe: true,
        authenticate: null,
        authProvider: null
    }

    /**
     * Open a login dialog and return a Promise.
     * Resolves with the auth result (UserProfile or custom) on success.
     * Rejects if the dialog is dismissed.
     *
     * @param {Object} options
     * @param {import('../data/AuthProvider.js').AuthProvider} [options.authProvider] - Auth provider instance (recommended)
     * @param {Function} [options.authenticate] - async ({ username, password, rememberMe }) => result
     * @param {string}  [options.title]
     * @param {string}  [options.termsUrl]
     * @param {string}  [options.termsTitle]
     * @param {boolean} [options.showRememberMe]
     * @returns {Promise<*>}
     */
    static open(options = {}) {
        return new Promise((resolve, reject) => {
            const dialog = new LoginDialog({
                ...options,
                _onSuccess: resolve,
                _onDismiss: reject
            })
            dialog._open()
        })
    }

    /**
     * Create a new LoginDialog instance. Not typically called directly —
     * use {@link LoginDialog.open} instead.
     *
     * @param {Object} params - Configuration merged with defaults
     * @param {import('../data/AuthProvider.js').AuthProvider} [params.authProvider] - Auth provider instance
     * @param {Function} [params.authenticate] - Async auth function (fallback if no authProvider)
     * @param {string} [params.title='Please sign in'] - Dialog title
     * @param {string} [params.termsUrl] - URL to terms & conditions page
     * @param {string} [params.termsTitle='Terms and Conditions'] - Terms modal title
     * @param {boolean} [params.showRememberMe=true] - Show "Remember me" checkbox
     * @param {Function} [params._onSuccess] - Internal resolve callback
     * @param {Function} [params._onDismiss] - Internal reject callback
     */
    constructor(params = {}) {
        const config = { ...LoginDialog.defaults, ...params }
        const uid = 'nui-login-' + Math.random().toString(36).substr(2, 6)

        const rememberMeHtml = config.showRememberMe ? `
            <div class="form-check text-start my-3">
                <input class="form-check-input" type="checkbox" id="${uid}-remember">
                <label class="form-check-label" for="${uid}-remember">Remember me</label>
            </div>
        ` : ''

        const termsHtml = config.termsUrl ? `
            <div class="nui-login-terms">
                By signing in you agree to the <a href="#" class="nui-login-terms-link">terms and conditions</a>.
            </div>
        ` : ''

        const template = `
            <div class="nui-login-dialog">
                <div class="nui-login-form">
                    <div class="nui-login-error" style="display:none;"></div>
                    <div class="form-floating mb-2">
                        <input type="text" class="form-control nui-login-username"
                               id="${uid}-username" placeholder="Username" autocomplete="username">
                        <label for="${uid}-username">Username</label>
                    </div>
                    <div class="form-floating mb-2">
                        <input type="password" class="form-control nui-login-password"
                               id="${uid}-password" placeholder="Password" autocomplete="current-password">
                        <label for="${uid}-password">Password</label>
                    </div>
                    ${rememberMeHtml}
                    ${termsHtml}
                </div>
            </div>
        `

        super({ template, autoInit: false, register: false })

        this._config = config
        this._onSuccess = params._onSuccess || (() => {})
        this._onDismiss = params._onDismiss || (() => {})
        this._modal = null
        this._uid = uid
    }

    /**
     * Load the login dialog CSS stylesheet.
     * @returns {Promise<void>}
     */
    async init() {
        await ResourceLoader.loadCss('../css/specialized/auth/login-dialog.css', import.meta.url)
    }

    /**
     * Initialize the dialog, create the underlying Modal, bind events, and show it.
     * @returns {Promise<void>}
     * @private
     */
    async _open() {
        await this.init()

        this._modal = new Modal({
            title: this._config.title,
            body: this.node,
            confirmLabel: 'Sign in',
            showClose: false,
            backdrop: 'static',
            keyboard: false,
            closeOnConfirm: false,
            size: 'sm',
            centered: true
        })

        await this._modal.init()

        this._modal.on('confirm', () => this._authenticate())
        this._modal.on('close', () => {
            this._onDismiss(new Error('Login dismissed'))
            this.destroy()
        })

        // Enter key submits
        this.find('.nui-login-username, .nui-login-password').on('keypress', (e) => {
            if (e.which === 13) {
                e.preventDefault()
                this._authenticate()
            }
        })

        // Terms link
        this.find('.nui-login-terms-link').on('click', (e) => {
            e.preventDefault()
            Modal.showContent(
                this._config.termsUrl,
                this._config.termsTitle,
                { size: 'lg' }
            )
        })

        this._modal.open()

        this._modal.on('shown', () => {
            this.find('.nui-login-username').focus()
        })
    }

    /**
     * Collect credentials, validate, call the auth provider or function,
     * and resolve/reject the promise returned by {@link LoginDialog.open}.
     * @returns {Promise<void>}
     * @private
     */
    async _authenticate() {
        const authFn = this._config.authProvider
            ? (creds) => this._config.authProvider.login(creds)
            : this._config.authenticate

        if (!authFn) {
            this._showError('No authProvider or authenticate function provided')
            return
        }

        const credentials = {
            username: this.find('.nui-login-username').val().trim(),
            password: this.find('.nui-login-password').val()
        }

        if (this._config.showRememberMe) {
            credentials.rememberMe = this.find(`#${this._uid}-remember`).prop('checked')
        }

        if (!credentials.username) {
            this._showError('Please enter your username')
            this.find('.nui-login-username').focus()
            return
        }
        if (!credentials.password) {
            this._showError('Please enter your password')
            this.find('.nui-login-password').focus()
            return
        }

        this._setLoading(true)
        this._hideError()

        try {
            const result = await authFn(credentials)
            this._setLoading(false)
            this._onSuccess(result)
            this._modal.close()
        } catch (error) {
            this._setLoading(false)
            this._showError(error.message || 'Authentication failed. Please try again.')
        }
    }

    /**
     * Display an error message above the form fields.
     * @param {string} message - Error text to show
     * @private
     */
    _showError(message) {
        this.find('.nui-login-error').text(message).show()
    }

    /**
     * Hide the error message.
     * @private
     */
    _hideError() {
        this.find('.nui-login-error').hide()
    }

    /**
     * Toggle loading state on inputs and the confirm button.
     * @param {boolean} loading - True to disable inputs and show spinner
     * @private
     */
    _setLoading(loading) {
        const confirmBtn = this._modal.find('.modal-confirm-btn')
        if (loading) {
            this.find('input').prop('disabled', true)
            confirmBtn.prop('disabled', true)
            confirmBtn.data('original-text', confirmBtn.text())
            confirmBtn.html('<span class="spinner-border spinner-border-sm" role="status"></span> Signing in...')
        } else {
            this.find('input').prop('disabled', false)
            confirmBtn.prop('disabled', false)
            confirmBtn.text(confirmBtn.data('original-text') || 'Sign in')
        }
    }
}
