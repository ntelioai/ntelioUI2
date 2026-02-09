/**
 * Modal - Bootstrap 5 modal dialog widget.
 *
 * @example
 * const modal = new Modal({
 *     title: 'Confirm Action',
 *     body: 'Are you sure?',
 *     confirmLabel: 'Yes',
 *     closeLabel: 'Cancel'
 * })
 *
 * modal.on('confirm', () => console.log('Confirmed!'))
 * modal.on('close', () => console.log('Closed'))
 * modal.open()
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

/** @category Dialogs */
export class Modal extends Widget {
    static defaults = {
        title: 'Dialog',
        body: '',
        confirmLabel: 'OK',
        closeLabel: 'Cancel',
        showConfirm: true,
        showClose: true,
        size: '', // '', 'sm', 'lg', 'xl'
        centered: true,
        backdrop: true, // true, false, 'static'
        keyboard: true,  // Close on Escape
        closeOnConfirm: true
    }

    /**
     * Create a new Modal dialog.
     *
     * @param {Object} params - Configuration object
     * @param {string} [params.title='Dialog'] - Modal header title
     * @param {string|jQuery|Widget} [params.body=''] - Modal body content
     * @param {string} [params.confirmLabel='OK'] - Confirm button text
     * @param {string} [params.closeLabel='Cancel'] - Close/cancel button text
     * @param {boolean} [params.showConfirm=true] - Show the confirm button
     * @param {boolean} [params.showClose=true] - Show the close/cancel button
     * @param {''|'sm'|'lg'|'xl'} [params.size=''] - Bootstrap modal size class
     * @param {boolean} [params.centered=true] - Vertically center the modal
     * @param {boolean|'static'} [params.backdrop=true] - Backdrop behaviour
     * @param {boolean} [params.keyboard=true] - Close on Escape key
     * @param {boolean} [params.closeOnConfirm=true] - Auto-close after confirm
     * @param {boolean} [params.destroyOnClose=true] - Destroy widget after hidden
     */
    constructor(params = {}) {
        const config = { ...Modal.defaults, ...params }

        const sizeClass = config.size ? `modal-${config.size}` : ''
        const centeredClass = config.centered ? 'modal-dialog-centered' : ''

        const template = `
            <div class="modal fade" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog ${sizeClass} ${centeredClass}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${config.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body"></div>
                        <div class="modal-footer"></div>
                    </div>
                </div>
            </div>
        `

        super({ template, autoInit: false, ...params })

        this.config = config
        this._bsModal = null
    }

    /**
     * Initialize the modal: load CSS, set body content, build footer buttons,
     * and bind event handlers.
     * @returns {Promise<void>}
     */
    async init() {
        await ResourceLoader.loadCss('../../css/dialogs/modal.css', import.meta.url)

        // Set body content
        this._setBody(this.config.body)

        // Build footer buttons
        this._buildFooter()

        // Bind events
        this._bindEvents()
    }

    /**
     * Set the modal body content from a string, jQuery element, or Widget.
     * @param {string|jQuery|Widget} content - New body content
     * @private
     */
    _setBody(content) {
        const bodyEl = this.find('.modal-body')
        if (content instanceof jQuery) {
            bodyEl.empty().append(content)
        } else if (content instanceof Widget) {
            bodyEl.empty().append(content.get())
        } else {
            bodyEl.html(content)
        }
    }

    /**
     * Build the footer buttons (close and/or confirm) based on config.
     * @private
     */
    _buildFooter() {
        const footer = this.find('.modal-footer')
        footer.empty()

        if (this.config.showClose) {
            const closeBtn = $(`<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">${this.config.closeLabel}</button>`)
            footer.append(closeBtn)
        }

        if (this.config.showConfirm) {
            const confirmBtn = $(`<button type="button" class="btn btn-primary modal-confirm-btn">${this.config.confirmLabel}</button>`)
            footer.append(confirmBtn)
        }

        // Hide footer if no buttons
        if (!this.config.showClose && !this.config.showConfirm) {
            footer.hide()
        }
    }

    /**
     * Wire up confirm button click and Bootstrap modal lifecycle events.
     * Sets up the _confirmed flag to distinguish confirm from dismiss.
     * @private
     */
    _bindEvents() {
        this._confirmed = false

        // Confirm button
        this.find('.modal-confirm-btn').on('click', () => {
            this._confirmed = true
            this.emit('confirm')
            if (this.config.closeOnConfirm) {
                this.close()
            }
        })

        // Bootstrap modal events - 'close' only fires on dismiss (Cancel/X/Escape), not after confirm
        this.node.on('hidden.bs.modal', () => {
            if (!this._confirmed) {
                this.emit('close')
            }
            this.emit('hidden')
            if (this.config.destroyOnClose !== false) {
                this.destroy()
            }
        })

        this.node.on('shown.bs.modal', () => {
            this.emit('shown')
            // Focus confirm button for keyboard accessibility
            this.find('.modal-confirm-btn').focus()
        })
    }

    /**
     * Open the modal. Appends to body if needed and initializes Bootstrap Modal.
     * @returns {Modal} this (for chaining)
     */
    open() {
        // Append to body if not already
        if (!this.node.parent().length) {
            this.node.appendTo('body')
        }

        // Initialize Bootstrap modal
        if (!this._bsModal) {
            this._bsModal = new bootstrap.Modal(this.node[0], {
                backdrop: this.config.backdrop,
                keyboard: this.config.keyboard
            })
        }

        this._bsModal.show()
        this.emit('open')
        return this
    }

    /**
     * Close the modal programmatically.
     * @returns {Modal} this (for chaining)
     */
    close() {
        if (this._bsModal) {
            this._bsModal.hide()
        }
        return this
    }

    /**
     * Update the modal title text.
     * @param {string} title - New title
     * @returns {Modal} this (for chaining)
     */
    setTitle(title) {
        this.find('.modal-title').text(title)
        return this
    }

    /**
     * Update the modal body content.
     * @param {string|jQuery|Widget} content - New body content
     * @returns {Modal} this (for chaining)
     */
    setBody(content) {
        this._setBody(content)
        return this
    }

    /**
     * Replace the modal body with a centered loading spinner.
     * @returns {Modal} this (for chaining)
     */
    showBodyLoading() {
        this.find('.modal-body').html(`
            <div class="d-flex justify-content-center p-4">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `)
        return this
    }

    /**
     * Dispose the Bootstrap modal instance and clean up backdrop/body state.
     */
    beforeDestroy() {
        if (this._bsModal) {
            this._bsModal.dispose()
            this._bsModal = null
        }
        // Remove any backdrop remnants
        $('.modal-backdrop').remove()
        $('body').removeClass('modal-open').css('overflow', '')
    }

    /**
     * Fetch content from a URL and display it in a modal.
     * Replaces the old ModalContentPopup class.
     *
     * @param {string} url - URL to fetch content from (HTML or text)
     * @param {string} [title='Content'] - Modal title
     * @param {Object} [options] - Additional Modal options (size, backdrop, etc.)
     * @param {string} [options.checkboxLabel] - If set, shows a checkbox below the content.
     *   The confirm button stays disabled until the checkbox is checked.
     *   Useful for "I accept the Terms & Conditions" flows.
     * @param {string} [options.confirmLabel='Accept'] - Confirm button label (only shown with checkboxLabel)
     * @returns {Promise<Modal>} Resolves with the modal instance once content is loaded
     *
     * @example
     * Modal.showContent('./terms.html', 'Terms & Conditions')
     * Modal.showContent('./terms.html', 'Terms', { checkboxLabel: 'I accept the terms' })
     */
    static async showContent(url, title = 'Content', options = {}) {
        const hasCheckbox = !!options.checkboxLabel

        const modal = new Modal({
            title,
            body: '',
            showConfirm: hasCheckbox,
            confirmLabel: options.confirmLabel || 'Accept',
            closeLabel: options.closeLabel || (hasCheckbox ? 'Cancel' : 'Close'),
            size: options.size || 'lg',
            ...options
        })
        await modal.init()

        if (hasCheckbox) {
            modal.find('.modal-confirm-btn').prop('disabled', true)
        }

        modal.showBodyLoading()
        modal.open()

        try {
            const response = await fetch(url)
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const content = await response.text()
            const bodyEl = modal.find('.modal-body').addClass('preformatted-content')
            bodyEl.html(content)

            if (hasCheckbox) {
                const chkId = 'nui-content-chk-' + Date.now()
                bodyEl.append(`
                    <div class="nui-content-checkbox form-check mt-3 pt-3" style="border-top: 1px solid var(--nui-border-color, #dee2e6); white-space: normal;">
                        <input class="form-check-input" type="checkbox" id="${chkId}">
                        <label class="form-check-label" for="${chkId}">${options.checkboxLabel}</label>
                    </div>
                `)
                bodyEl.find(`#${chkId}`).on('change', function () {
                    modal.find('.modal-confirm-btn').prop('disabled', !this.checked)
                })
            }
        } catch (error) {
            modal.find('.modal-body')
                .removeClass('preformatted-content')
                .html(`<div class="alert alert-danger">Failed to load content: ${error.message}</div>`)
        }

        return modal
    }
}

/**
 * ConfirmDialog - Simple yes/no confirmation.
 *
 * @example
 * ConfirmDialog.show({
 *     title: 'Delete Item',
 *     message: 'Are you sure you want to delete this item?'
 * }).then(confirmed => {
 *     if (confirmed) deleteItem()
 * })
 * @category Dialogs
 */
export class ConfirmDialog extends Modal {
    /**
     * Create a confirm dialog.
     *
     * @param {Object} params - Configuration object
     * @param {string} [params.title='Confirm'] - Dialog title
     * @param {string} [params.message] - Confirmation message
     * @param {string} [params.confirmLabel='Yes'] - Confirm button label
     * @param {string} [params.closeLabel='No'] - Cancel button label
     * @param {''|'sm'|'lg'|'xl'} [params.size='sm'] - Modal size
     */
    constructor(params = {}) {
        super({
            title: params.title || 'Confirm',
            body: params.message || params.body || 'Are you sure?',
            confirmLabel: params.confirmLabel || 'Yes',
            closeLabel: params.closeLabel || 'No',
            size: params.size || 'sm',
            ...params
        })
    }

    /**
     * Show a promise-based confirmation dialog.
     * @param {Object} params - ConfirmDialog configuration
     * @returns {Promise<boolean>} Resolves true on confirm, false on dismiss
     */
    static show(params = {}) {
        return new Promise((resolve) => {
            const dialog = new ConfirmDialog(params)
            dialog.init()

            dialog.on('confirm', () => resolve(true))
            dialog.on('close', () => resolve(false))

            dialog.open()
        })
    }
}

/**
 * AlertDialog - Simple alert with OK button.
 *
 * @example
 * AlertDialog.show({
 *     title: 'Error',
 *     message: 'Something went wrong!'
 * })
 * @category Dialogs
 */
export class AlertDialog extends Modal {
    /**
     * Create an alert dialog.
     *
     * @param {Object} params - Configuration object
     * @param {string} [params.title='Alert'] - Dialog title
     * @param {string} [params.message] - Alert message
     * @param {string} [params.confirmLabel='OK'] - OK button label
     * @param {''|'sm'|'lg'|'xl'} [params.size='sm'] - Modal size
     */
    constructor(params = {}) {
        super({
            title: params.title || 'Alert',
            body: params.message || params.body || '',
            confirmLabel: params.confirmLabel || 'OK',
            showClose: false,
            size: params.size || 'sm',
            ...params
        })
    }

    /**
     * Show a promise-based alert dialog.
     * @param {Object} params - AlertDialog configuration
     * @returns {Promise<void>} Resolves when the dialog is dismissed
     */
    static show(params = {}) {
        return new Promise((resolve) => {
            const dialog = new AlertDialog(params)
            dialog.init()

            dialog.on('confirm', () => resolve())
            dialog.on('close', () => resolve())

            dialog.open()
        })
    }
}
