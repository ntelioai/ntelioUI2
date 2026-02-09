/**
 * Toast - Ephemeral notification toasts
 *
 * @example
 * Toast.success('Saved!')
 * Toast.error('Something went wrong')
 * Toast.warning('Session expiring soon')
 * Toast.info('New version available')
 * Toast.show('Custom message', { type: 'info', duration: 10000 })
 *
 * // Manual dismiss
 * const t = Toast.show('Persistent', { duration: 0 })
 * t.dismiss()
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

const ICONS = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
}

/** @category Feedback */
export class Toast extends Widget {
    static CONTAINER_ID = 'nui-toast-container'
    static _container = null
    static _cssLoaded = false

    static defaults = {
        message: '',
        type: 'info',       // 'success' | 'error' | 'warning' | 'info'
        duration: 5000,      // ms; 0 = no auto-dismiss
        closable: true
    }

    // ── Static convenience API ───────────────────────────────────

    /**
     * Create and display a toast notification.
     *
     * @param {string} message - Text to display
     * @param {Object} [options] - Toast configuration
     * @param {'success'|'error'|'warning'|'info'} [options.type='info'] - Visual style
     * @param {number} [options.duration=5000] - Auto-dismiss delay in ms (0 = permanent)
     * @param {boolean} [options.closable=true] - Show close button
     * @returns {Toast} The toast instance (call .dismiss() to remove manually)
     */
    static show(message, options = {}) {
        return new Toast({ message, ...options })
    }

    /**
     * Show a success toast.
     * @param {string} message - Text to display
     * @param {Object} [options] - Additional Toast options
     * @returns {Toast}
     */
    static success(message, options = {}) {
        return Toast.show(message, { type: 'success', ...options })
    }

    /**
     * Show an error toast (default 8s duration).
     * @param {string} message - Text to display
     * @param {Object} [options] - Additional Toast options
     * @returns {Toast}
     */
    static error(message, options = {}) {
        return Toast.show(message, { type: 'error', duration: 8000, ...options })
    }

    /**
     * Show a warning toast.
     * @param {string} message - Text to display
     * @param {Object} [options] - Additional Toast options
     * @returns {Toast}
     */
    static warning(message, options = {}) {
        return Toast.show(message, { type: 'warning', ...options })
    }

    /**
     * Show an info toast.
     * @param {string} message - Text to display
     * @param {Object} [options] - Additional Toast options
     * @returns {Toast}
     */
    static info(message, options = {}) {
        return Toast.show(message, { type: 'info', ...options })
    }

    // ── Container management ─────────────────────────────────────

    /**
     * Get or create the toast container element in the DOM.
     * @returns {jQuery} The shared toast container
     * @private
     */
    static _getContainer() {
        if (!Toast._container || !Toast._container.length) {
            Toast._container = $(`#${Toast.CONTAINER_ID}`)
            if (!Toast._container.length) {
                Toast._container = $(`<div id="${Toast.CONTAINER_ID}" class="nui-toast-container"></div>`)
                $('body').append(Toast._container)
            }
        }
        return Toast._container
    }

    // ── Instance ─────────────────────────────────────────────────

    /**
     * Create a new Toast instance. Typically called via static convenience
     * methods (success, error, warning, info, show) rather than directly.
     *
     * @param {Object} params - Toast configuration
     * @param {string} [params.message=''] - Notification text
     * @param {'success'|'error'|'warning'|'info'} [params.type='info'] - Visual style
     * @param {number} [params.duration=5000] - Auto-dismiss delay in ms (0 = permanent)
     * @param {boolean} [params.closable=true] - Show close button
     */
    constructor(params = {}) {
        const config = { ...Toast.defaults, ...params }

        if (config.type === 'error' && !params.duration) {
            config.duration = 8000
        }

        const closeBtn = config.closable
            ? '<button type="button" class="nui-toast-close" aria-label="Close">&times;</button>'
            : ''

        const icon = ICONS[config.type] || ICONS.info

        const template = `
            <div class="nui-toast nui-toast-${config.type}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="nui-toast-icon">${icon}</div>
                <div class="nui-toast-message">${config.message}</div>
                ${closeBtn}
            </div>
        `

        super({ template, autoInit: false, register: false })

        this._config = config
        this._timeoutHandle = null

        this._loadAndShow()
    }

    /**
     * Load toast CSS (once) then display the toast.
     * @returns {Promise<void>}
     * @private
     */
    async _loadAndShow() {
        if (!Toast._cssLoaded) {
            await ResourceLoader.loadCss('../../css/widgets/feedback/toast.css', import.meta.url)
            Toast._cssLoaded = true
        }
        this._show()
    }

    /**
     * Insert the toast into the container, animate in, and start the dismiss timer.
     * @private
     */
    _show() {
        const container = Toast._getContainer()
        container.prepend(this.node)

        // Force reflow then animate in
        this.node[0].offsetHeight
        this.node.addClass('nui-toast-visible')

        this.find('.nui-toast-close').on('click', () => this.dismiss())

        if (this._config.duration > 0) {
            this._timeoutHandle = setTimeout(() => this.dismiss(), this._config.duration)
        }

        this.emit('show')
    }

    /**
     * Animate the toast out and destroy it. Safe to call multiple times.
     */
    dismiss() {
        if (this._destroyed) return

        clearTimeout(this._timeoutHandle)
        this.node.removeClass('nui-toast-visible')
        this.node.addClass('nui-toast-hiding')

        this.node.one('transitionend', () => {
            if (!this._destroyed) this.destroy()
        })

        // Fallback if transitionend doesn't fire
        setTimeout(() => {
            if (!this._destroyed) this.destroy()
        }, 500)
    }

    /**
     * Clean up the auto-dismiss timer before destruction.
     */
    beforeDestroy() {
        clearTimeout(this._timeoutHandle)
    }
}
