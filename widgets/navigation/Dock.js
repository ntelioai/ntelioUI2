/**
 * Dock - macOS-style application dock with fisheye magnification
 *
 * Vertical or horizontal bar of icon buttons. When the cursor enters the
 * dock, the icon under it grows to a maximum scale and its neighbours
 * scale less the further they are, following a cosine bell falloff —
 * the same way the macOS dock magnifies app icons.
 *
 * Items can be:
 *   • action items   (id + icon + tooltip + optional active marker)
 *   • separators     ({ type: 'separator' })
 *
 * The widget emits `select` when a non-disabled action item is clicked.
 * The visual active state is opt-in (via `setActive(id)` or `active: id`
 * in the constructor) and renders a small dot on the outer edge of the
 * marked item, away from the tooltip side.
 *
 * @example
 * const dock = new Dock({
 *     orientation: 'vertical',
 *     tooltipSide: 'left',
 *     label: 'Demo<br>Control',
 *     items: [
 *         { id: 'home',     icon: '<i class="material-symbols-outlined">home</i>',         tooltip: 'Home' },
 *         { id: 'profile',  icon: '<i class="material-symbols-outlined">person</i>',       tooltip: 'Profile' },
 *         { type: 'separator' },
 *         { id: 'reset',    icon: '<i class="material-symbols-outlined">restart_alt</i>',  tooltip: 'Reset chat' },
 *         { type: 'separator' },
 *         { id: 'clear',    icon: '<i class="material-symbols-outlined">delete_sweep</i>', tooltip: 'Clear' }
 *     ],
 *     active: 'home'
 * })
 * dock.appendTo('#dock-mount')
 * dock.init()
 * dock.on('select', ({ id, item }) => console.log('clicked', id))
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

/** @category Navigation */
export class Dock extends Widget {
    /**
     * Create a new Dock widget.
     *
     * @param {Object} params
     * @param {Array<Object>} [params.items=[]] - Dock items. Each is either:
     *   - `{ id, icon, tooltip, disabled?, active? }` for an action button
     *   - `{ type: 'separator' }` for a divider
     *   `icon` is raw HTML (an `<svg>`, an icon-font `<i>`, an `<img>`, etc).
     *   `tooltip` is the bubble label shown on hover (plain text).
     * @param {'vertical'|'horizontal'} [params.orientation='vertical'] - Dock axis.
     * @param {'left'|'right'|'top'|'bottom'} [params.tooltipSide] - Side the
     *   tooltip bubble appears on. Defaults to 'left' for vertical docks and
     *   'top' for horizontal ones. The magnification grows in the same
     *   direction so icons expand AWAY from the dock's attached edge.
     * @param {string|null} [params.label=null] - Optional label rendered as
     *   raw HTML (use `<br>` for line breaks). Sits above a vertical dock or
     *   to the side of a horizontal one, anchored outside the dock body.
     * @param {string|null} [params.active=null] - Id of the initially active item.
     * @param {Object} [params.magnification]
     * @param {boolean} [params.magnification.enabled=true] - Set false to disable the fisheye.
     * @param {number}  [params.magnification.max=1.55] - Peak scale at cursor.
     * @param {number}  [params.magnification.range=110] - Pixel radius of the magnification window.
     */
    constructor(params = {}) {
        super({
            template: '<div class="nui-dock"></div>',
            ...params
        })

        this._items = params.items || []
        this._orientation = params.orientation === 'horizontal' ? 'horizontal' : 'vertical'

        const defaultSide = this._orientation === 'vertical' ? 'left' : 'top'
        const allowedSides = this._orientation === 'vertical'
            ? ['left', 'right']
            : ['top', 'bottom']
        this._tooltipSide = allowedSides.indexOf(params.tooltipSide) !== -1
            ? params.tooltipSide
            : defaultSide

        this._label = params.label || null
        this._activeId = params.active || null

        const m = params.magnification || {}
        this._magnification = {
            enabled: m.enabled !== false,
            max: typeof m.max === 'number' ? m.max : 1.55,
            range: typeof m.range === 'number' ? m.range : 110
        }

        // Captured "natural" geometry of dock children (refilled on each
        // mouseenter so it survives setItems() re-renders).
        this._magItems = []
        this._magBound = false
    }

    /**
     * Load CSS, paint the dock, and wire mouse handlers.
     * @returns {Promise<void>}
     */
    async init() {
        await ResourceLoader.loadCss('../../css/widgets/navigation/dock.css', import.meta.url)
        this._applyModifiers()
        this._render()
        this._attachClickEvents()
        this._setupMagnification()
    }

    /**
     * Replace dock items at runtime.
     * @param {Array<Object>} items - New items array (same shape as constructor)
     */
    setItems(items) {
        this._items = items || []
        this._render()
        this._attachClickEvents()
        // Force a recapture next time the cursor enters the dock.
        this._magItems = []
    }

    /**
     * Mark a single item as active. Pass null to clear.
     * @param {string|null} id - Item id to activate
     */
    setActive(id) {
        this._activeId = id || null
        this.find('.nui-dock-item').removeClass('is-active')
        if (this._activeId != null) {
            this.find(`.nui-dock-item[data-id="${this._activeId}"]`).addClass('is-active')
        }
    }

    /**
     * Get the id of the currently active item (or null).
     * @returns {string|null}
     */
    getActive() {
        return this._activeId
    }

    // ── Private ──────────────────────────────────────────────────────────

    /**
     * Toggle the orientation + tooltip-side modifier classes on the root.
     * @private
     */
    _applyModifiers() {
        const root = this.get()
        root.removeClass('nui-dock-vertical nui-dock-horizontal')
            .removeClass('nui-dock-tt-left nui-dock-tt-right nui-dock-tt-top nui-dock-tt-bottom')
            .addClass(this._orientation === 'horizontal' ? 'nui-dock-horizontal' : 'nui-dock-vertical')
            .addClass('nui-dock-tt-' + this._tooltipSide)
    }

    /**
     * Build the dock HTML from the current items array.
     * @private
     */
    _render() {
        const root = this.get()
        root.empty()

        if (this._label) {
            // Absolutely-positioned label that sits outside the dock body
            // (anchored to the side opposite the dock's content axis).
            const $label = $('<div class="nui-dock-label" aria-hidden="true"></div>').html(this._label)
            root.append($label)
        }

        this._items.forEach((item) => {
            if (item && item.type === 'separator') {
                root.append('<div class="nui-dock-sep" aria-hidden="true"></div>')
                return
            }
            if (!item || item.id == null) return

            const isActive = item.id === this._activeId
            const $btn = $('<button type="button" class="nui-dock-item"></button>')
                .attr('data-id', item.id)
                .attr('aria-label', item.tooltip || String(item.id))
                .toggleClass('is-active', isActive)
                .toggleClass('is-disabled', item.disabled === true)

            // Icon wrapper carries the raw HTML so callers control the icon
            // system entirely (SVG, font-icon, <img>, emoji — anything).
            const $icon = $('<span class="nui-dock-icon" aria-hidden="true"></span>').html(item.icon || '')
            $btn.append($icon)

            if (item.tooltip) {
                $btn.append($('<span class="nui-dock-tip"></span>').text(item.tooltip))
            }

            root.append($btn)
        })
    }

    /**
     * Bind click → select event for non-disabled action items.
     * @private
     */
    _attachClickEvents() {
        this.find('.nui-dock-item:not(.is-disabled)').off('click.nuiDock').on('click.nuiDock', (e) => {
            const id = $(e.currentTarget).attr('data-id')
            const item = this._items.find((it) => it && it.id === id)
            this.emit('select', { id, item })
        })
    }

    /**
     * macOS-style fisheye magnification.
     *
     * On every mousemove inside the dock we compute, for each child, the
     * distance from the cursor along the dock's axis and feed it through
     * a cosine bell:
     *
     *     scale = 1 + (MAX − 1) · (cos(π · t) + 1) / 2,    t = |dist| / RANGE
     *
     * The cursor's anchor item stays visually pinned where the user is
     * pointing; every other item is translated along the axis so the
     * dock's cumulative scaled-length is preserved (no overlap).
     *
     * Bound once per instance; safely no-ops if magnification is disabled.
     * @private
     */
    _setupMagnification() {
        if (!this._magnification.enabled || this._magBound) return
        this._magBound = true

        const dock = this.get()[0]
        const isVertical = this._orientation === 'vertical'

        const cursorAlongAxis = (e) => {
            const r = dock.getBoundingClientRect()
            return isVertical ? (e.clientY - r.top) : (e.clientX - r.left)
        }

        const transformOriginFor = () => {
            // Grow AWAY from the dock's attached edge — i.e. toward the
            // tooltip side. macOS docks at the screen edge do the same.
            switch (this._tooltipSide) {
                case 'left':  return 'right center'
                case 'right': return 'left center'
                case 'top':   return 'center bottom'
                case 'bottom': return 'center top'
                default: return 'center center'
            }
        }
        const origin = transformOriginFor()

        const bellScale = (dist) => {
            const t = Math.abs(dist) / this._magnification.range
            if (t >= 1) return 1
            return 1 + (this._magnification.max - 1) * (Math.cos(t * Math.PI) + 1) / 2
        }

        const capture = () => {
            // Only buttons and separators participate in layout — the floating
            // label is position:absolute and intentionally skipped.
            const elems = Array.from(dock.children).filter((el) =>
                el.classList.contains('nui-dock-item') || el.classList.contains('nui-dock-sep')
            )
            elems.forEach((c) => { c.style.transform = ''; c.style.transformOrigin = '' })
            const r = dock.getBoundingClientRect()
            this._magItems = elems.map((el) => {
                const rr = el.getBoundingClientRect()
                return {
                    el,
                    center: isVertical
                        ? (rr.top + rr.bottom) / 2 - r.top
                        : (rr.left + rr.right) / 2 - r.left,
                    size: isVertical ? rr.height : rr.width,
                    isSep: el.classList.contains('nui-dock-sep')
                }
            })
        }

        const apply = (cursor) => {
            const items = this._magItems
            if (cursor == null || items.length === 0) {
                items.forEach((it) => { it.el.style.transform = '' })
                return
            }

            const scales = items.map((it) => (it.isSep ? 1 : bellScale(cursor - it.center)))

            // Cumulative layout: each magnified center sits half its scaled
            // size beyond the previous item, preserving the original gap
            // between natural centers.
            const mc = new Array(items.length)
            for (let i = 0; i < items.length; i++) {
                const scaled = items[i].size * scales[i]
                if (i === 0) {
                    mc[i] = scaled / 2
                } else {
                    const prevScaled = items[i - 1].size * scales[i - 1]
                    const naturalGap = items[i].center - items[i - 1].center
                    mc[i] = mc[i - 1] + prevScaled / 2 +
                            (naturalGap - (items[i - 1].size + items[i].size) / 2) +
                            scaled / 2
                }
            }

            // Anchor: keep the item closest to the cursor visually pinned.
            let anchor = 0
            let best = Infinity
            for (let i = 0; i < items.length; i++) {
                const d = Math.abs(items[i].center - cursor)
                if (d < best) { best = d; anchor = i }
            }
            const offset = items[anchor].center - mc[anchor]

            for (let i = 0; i < items.length; i++) {
                const t = mc[i] + offset - items[i].center
                const translate = isVertical
                    ? `translateY(${t.toFixed(2)}px)`
                    : `translateX(${t.toFixed(2)}px)`
                if (items[i].isSep) {
                    items[i].el.style.transform = translate
                } else {
                    items[i].el.style.transformOrigin = origin
                    items[i].el.style.transform = `${translate} scale(${scales[i].toFixed(3)})`
                }
            }
        }

        this._magHandlers = {
            enter: () => capture(),
            move:  (e) => {
                if (this._magItems.length === 0) capture()
                apply(cursorAlongAxis(e))
            },
            leave: () => apply(null),
            resize: () => { this._magItems = [] }
        }

        dock.addEventListener('mouseenter', this._magHandlers.enter)
        dock.addEventListener('mousemove',  this._magHandlers.move)
        dock.addEventListener('mouseleave', this._magHandlers.leave)
        window.addEventListener('resize',   this._magHandlers.resize)
    }

    /**
     * Clean up the window resize listener.
     */
    beforeDestroy() {
        if (this._magHandlers) {
            window.removeEventListener('resize', this._magHandlers.resize)
        }
    }
}
