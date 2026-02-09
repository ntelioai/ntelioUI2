/**
 * Sidebar - Categorical sub-navigation widget
 *
 * Grouped menu for content-level navigation within pages.
 * Different from VerticalNavbar (app-level) — this is for sub-sections.
 *
 * @example
 * const sidebar = new Sidebar({
 *     items: [
 *         {
 *             label: 'General',
 *             icon: '<svg>…</svg>',
 *             items: [
 *                 { label: 'Overview', url: '#overview' },
 *                 { label: 'Settings', url: '#settings' }
 *             ]
 *         }
 *     ]
 * })
 * sidebar.on('select', (url) => { ... })
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

/** @category Navigation */
export class Sidebar extends Widget {
    /**
     * Create a new Sidebar widget.
     *
     * @param {Object} params - Configuration object
     * @param {Array<{label: string, icon?: string, items?: Array<{label: string, url?: string, icon?: string, disabled?: boolean}>}>} [params.items=[]] - Category items with nested menu entries
     * @param {Function} [params.onClick] - Click callback receiving the selected URL
     */
    constructor(params = {}) {
        super({
            template: '<div class="nui-sidebar"></div>',
            ...params
        })
        this._items = params.items || []
        this._onClick = params.onClick || null
    }

    /**
     * Load sidebar CSS, render menu items, attach click handlers,
     * and set up hash-change highlighting.
     * @returns {Promise<void>}
     */
    async init() {
        await ResourceLoader.loadCss('../../css/widgets/navigation/sidebar.css', import.meta.url)
        this._renderMenu()
        this._attachEvents()
        this._highlightActive()

        this._hashHandler = () => this._highlightActive()
        window.addEventListener('hashchange', this._hashHandler)
    }

    /**
     * Replace menu items at runtime.
     * @param {Array} items - Category items array
     */
    setItems(items) {
        this._items = items
        this._renderMenu()
        this._attachEvents()
        this._highlightActive()
    }

    /**
     * Highlight a specific menu item by URL.
     * @param {string} url - The URL/hash to highlight
     */
    setActive(url) {
        this.find('.nui-sidebar-item').removeClass('active')
        this.find(`.nui-sidebar-item[data-url="${url}"]`).addClass('active')
    }

    // ── Private ──────────────────────────────────────────────────────

    /**
     * Build the sidebar HTML from the current items array.
     * @private
     */
    _renderMenu() {
        const container = this.get()
        container.empty()

        this._items.forEach(category => {
            const $cat = $(`
                <div class="nui-sidebar-category">
                    ${category.icon ? `<span class="nui-sidebar-cat-icon">${category.icon}</span>` : ''}
                    <span class="nui-sidebar-cat-label">${category.label}</span>
                </div>
            `)
            container.append($cat)

            if (category.items) {
                category.items.forEach(item => {
                    const cls = 'nui-sidebar-item' + (item.disabled ? ' disabled' : '')
                    const $item = $(`
                        <a class="${cls}" data-url="${item.url || ''}" href="${item.url || '#'}">
                            ${item.icon ? `<span class="nui-sidebar-item-icon">${item.icon}</span>` : ''}
                            ${item.label}
                        </a>
                    `)
                    container.append($item)
                })
            }
        })
    }

    /**
     * Bind click handlers to non-disabled sidebar items.
     * Emits the 'select' event with the clicked item's URL.
     * @private
     */
    _attachEvents() {
        this.find('.nui-sidebar-item:not(.disabled)').off('click').on('click', (e) => {
            e.preventDefault()
            const $item = $(e.currentTarget)
            const url = $item.data('url')

            this.find('.nui-sidebar-item').removeClass('active')
            $item.addClass('active')

            if (this._onClick) this._onClick(url)
            this.emit('select', url)
        })
    }

    /**
     * Highlight the sidebar item matching the current location hash.
     * Falls back to last-segment matching if no exact match is found.
     * @private
     */
    _highlightActive() {
        const hash = window.location.hash
        if (!hash) return

        const lastSegment = hash.substring(hash.lastIndexOf('/') + 1)
        this.find('.nui-sidebar-item').removeClass('active')

        // Exact match first, then last-segment fallback
        let $match = this.find(`.nui-sidebar-item[data-url="${hash}"]`)
        if (!$match.length) {
            $match = this.find(`.nui-sidebar-item[data-url="#${lastSegment}"]`)
        }
        $match.addClass('active')
    }

    /**
     * Clean up the hash-change listener before destruction.
     */
    beforeDestroy() {
        if (this._hashHandler) {
            window.removeEventListener('hashchange', this._hashHandler)
        }
    }
}
