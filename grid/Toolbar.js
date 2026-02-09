import { Widget } from '../core/Widget.js'

/**
 * @typedef {Object} ToolbarButton
 * @property {string}  action    - Unique action name (e.g. 'new', 'edit', 'delete')
 * @property {string}  [label]   - Button text
 * @property {string}  [icon]    - Font Awesome icon class (e.g. 'fas fa-plus')
 * @property {string}  [cls]     - Additional CSS class for the button
 * @property {boolean} [disabled=false]
 * @property {'separator'} [type] - Set to 'separator' for a visual divider
 */

/**
 * Action button bar for the DataControl.
 *
 * Renders a configurable set of buttons and emits an 'action' event
 * when any button is clicked.
 *
 * @extends Widget
 * @category Grid
 * @fires Toolbar#action - { action } when a button is clicked
 */
export class Toolbar extends Widget {
    static template = `
        <div class="data-control-toolbar">
            <div class="toolbar-buttons"></div>
            <div class="toolbar-search">
                <div class="input-group input-group-sm">
                    <input type="text" class="form-control" placeholder="Search..." aria-label="Search">
                    <button class="btn btn-outline-secondary search-btn" type="button">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
        </div>`

    /**
     * @param {Object} params
     * @param {ToolbarButton[]} [params.buttons] - Button definitions
     * @param {boolean} [params.showSearch=true] - Whether to show the search input
     */
    constructor(params = {}) {
        super({ template: Toolbar.template, autoInit: false, ...params })
        this._buttons = params.buttons || []
        this._showSearch = params.showSearch !== false
    }

    async init() {
        this._renderButtons()

        if (!this._showSearch) {
            this.find('.toolbar-search').hide()
        }

        this.find('.toolbar-buttons').on('click', 'button', (e) => {
            const action = $(e.currentTarget).data('action')
            if (action) this.emit('action', { action })
        })

        // Search
        const searchInput = this.find('.toolbar-search input')
        let debounceTimer
        searchInput.on('input', () => {
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
                this.emit('search', { query: searchInput.val().trim() })
            }, 300)
        })

        this.find('.search-btn').on('click', () => {
            this.emit('search', { query: searchInput.val().trim() })
        })
    }

    /** @private */
    _renderButtons() {
        const container = this.find('.toolbar-buttons')
        container.empty()

        this._buttons.forEach(btn => {
            if (btn.type === 'separator') {
                container.append('<span class="toolbar-separator"></span>')
                return
            }

            const iconHtml = btn.icon ? `<i class="${btn.icon}"></i> ` : ''
            const labelHtml = btn.label || ''
            const disabledAttr = btn.disabled ? 'disabled' : ''
            const cls = btn.cls || 'btn-outline-secondary'

            container.append(`
                <button class="btn btn-sm ${cls}" data-action="${btn.action}" ${disabledAttr} title="${btn.label || btn.action}">
                    ${iconHtml}${labelHtml}
                </button>
            `)
        })
    }

    /**
     * Enable or disable a specific toolbar button by action name.
     * @param {string} action
     * @param {boolean} enabled
     */
    setEnabled(action, enabled) {
        this.find(`[data-action="${action}"]`).prop('disabled', !enabled)
    }

    /**
     * Reconfigure buttons and re-render.
     * @param {ToolbarButton[]} buttons
     */
    setButtons(buttons) {
        this._buttons = buttons
        this._renderButtons()
    }
}
