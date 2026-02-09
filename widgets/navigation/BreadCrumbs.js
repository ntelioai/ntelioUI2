/**
 * BreadCrumbs - Arrow-shaped breadcrumb navigation
 *
 * Displays a trail of navigation breadcrumbs with chevron shapes
 * and slide-in animation. Supports home icon and dynamic updates.
 *
 * @example
 * const crumbs = new BreadCrumbs({
 *     homeUrl: '#/',
 *     breadcrumbs: [
 *         { label: 'Products', url: '#/products' },
 *         { label: 'Electronics' }
 *     ]
 * })
 * crumbs.add({ label: 'Laptops', url: '#/products/laptops' })
 * crumbs.set([...])   // replace all
 * crumbs.clear()      // remove all
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

/** @category Navigation */
export class BreadCrumbs extends Widget {
    /**
     * Create a new BreadCrumbs widget.
     *
     * @param {Object} params - Configuration object
     * @param {string} [params.homeUrl] - URL for the home icon crumb (omit to hide)
     * @param {Array<{label: string, url?: string}>} [params.breadcrumbs=[]] - Initial breadcrumb items
     */
    constructor(params = {}) {
        super({
            template: `
                <div class="nui-breadcrumbs">
                    <nav aria-label="breadcrumb">
                        <div class="nui-breadcrumb-trail"></div>
                    </nav>
                </div>
            `,
            ...params
        })
        this._homeUrl = params.homeUrl || null
        this._breadcrumbs = params.breadcrumbs || []
    }

    /**
     * Load breadcrumbs CSS and perform the initial render.
     * @returns {Promise<void>}
     */
    async init() {
        await ResourceLoader.loadCss('../../css/widgets/navigation/breadcrumbs.css', import.meta.url)
        this._render()
    }

    /**
     * Replace all breadcrumbs.
     * @param {Array} breadcrumbs - [{ label, url }]
     */
    set(breadcrumbs) {
        this._breadcrumbs = breadcrumbs
        this._render()
    }

    /**
     * Append a breadcrumb to the trail.
     * @param {{ label: string, url?: string }} breadcrumb
     */
    add(breadcrumb) {
        this._breadcrumbs.push(breadcrumb)
        this._appendItem(breadcrumb)
        this._updateActiveState()
    }

    /**
     * Clear all breadcrumbs.
     */
    clear() {
        this._breadcrumbs = []
        this.find('.nui-breadcrumb-trail').empty()
    }

    // ── Private ──────────────────────────────────────────────────────

    /**
     * Rebuild the entire breadcrumb trail from the current state.
     * @private
     */
    _render() {
        const trail = this.find('.nui-breadcrumb-trail')
        trail.empty()

        if (this._homeUrl) {
            const $home = $('<a>')
                .attr('href', this._homeUrl)
                .addClass('nui-crumb nui-crumb-home')
                .html('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>')
            trail.append($home)
        }

        this._breadcrumbs.forEach(crumb => this._appendItem(crumb))
        this._updateActiveState()
    }

    /**
     * Append a single crumb element to the trail.
     * @param {{label: string, url?: string}} crumb - Breadcrumb definition
     * @private
     */
    _appendItem(crumb) {
        const $item = $('<a>')
            .addClass('nui-crumb')
            .text(crumb.label)
        if (crumb.url) $item.attr('href', crumb.url)
        this.find('.nui-breadcrumb-trail').append($item)
    }

    /**
     * Mark the last crumb in the trail as active.
     * @private
     */
    _updateActiveState() {
        this.find('.nui-crumb').removeClass('nui-crumb-active')
        this.find('.nui-crumb:last-child').addClass('nui-crumb-active')
    }
}
