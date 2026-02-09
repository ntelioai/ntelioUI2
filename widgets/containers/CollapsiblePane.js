/**
 * CollapsiblePane - Resizable collapsible pane for multi-pane layouts
 *
 * A pane that can be collapsed to a thin strip and resized by dragging.
 * Designed for LEFT / CENTER / RIGHT multi-pane layouts using flexbox.
 *
 * @example
 * const left = new CollapsiblePane({
 *     title: 'Explorer',
 *     dir: CollapsiblePane.LEFT,
 *     width: 250
 * })
 * left.appendTo($('#layout'))
 * await left.init()
 *
 * left.collapse()       // toggle
 * left.collapse(true)   // force collapsed
 * left.isCollapsed()    // query
 *
 * left.on('collapse', ({ collapsed }) => { ... })
 * left.on('resize', ({ width }) => { ... })
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

/** @category Containers */
export class CollapsiblePane extends Widget {
    /** @type {number} Direction constant for left-aligned panes */
    static LEFT = 1
    /** @type {number} Direction constant for center (fill) panes */
    static CENTER = 2
    /** @type {number} Direction constant for right-aligned panes */
    static RIGHT = 3

    /** @type {Object} Default configuration values */
    static defaults = {
        title: 'Pane',
        dir: 1, // LEFT
        width: 200,
        minWidth: 100,
        maxWidth: 600,
        collapsible: true,
        resizable: true
    }

    /**
     * Create a new CollapsiblePane.
     *
     * @param {Object} params - Configuration object
     * @param {string} [params.title='Pane'] - Header title
     * @param {1|2|3} [params.dir=1] - Direction (LEFT=1, CENTER=2, RIGHT=3)
     * @param {number} [params.width=200] - Initial width in pixels (ignored for CENTER)
     * @param {number} [params.minWidth=100] - Minimum resize width
     * @param {number} [params.maxWidth=600] - Maximum resize width
     * @param {boolean} [params.collapsible=true] - Allow collapsing via header click
     * @param {boolean} [params.resizable=true] - Allow drag-to-resize
     */
    constructor(params = {}) {
        const config = { ...CollapsiblePane.defaults, ...params }
        const dir = config.dir
        const isCenter = dir === CollapsiblePane.CENTER

        const dirName = dir === CollapsiblePane.RIGHT ? 'right'
            : dir === CollapsiblePane.CENTER ? 'center'
            : 'left'

        // Icon: chevron points toward the edge the pane collapses into
        const iconClass = dir === CollapsiblePane.RIGHT
            ? 'fa-chevron-right'
            : 'fa-chevron-left'

        const template = `
            <div class="nui-collapsible-pane" data-dir="${dirName}">
                <div class="nui-pane-header${isCenter || !config.collapsible ? ' nui-no-collapse' : ''}">
                    <span class="nui-pane-title">${config.title}</span>
                    ${!isCenter && config.collapsible ? `<i class="fas ${iconClass} nui-pane-collapse-icon"></i>` : ''}
                </div>
                <div class="nui-pane-content"></div>
                ${!isCenter && config.resizable ? '<div class="nui-pane-resize-handle"></div>' : ''}
            </div>
        `

        super({ template, autoInit: false, ...params })

        this._config = config
        this._dir = dir
        this._dirName = dirName
        this._width = isCenter ? 0 : config.width
        this._collapsed = false

        // Set initial width for non-center panes
        if (!isCenter) {
            this.node.css('flex-basis', config.width + 'px')
        }
    }

    /**
     * Load pane CSS and bind collapse/resize interactions.
     * @returns {Promise<void>}
     */
    async init() {
        await ResourceLoader.loadCss('../../css/widgets/containers/collapsible-pane.css', import.meta.url)

        if (this._config.collapsible && this._dir !== CollapsiblePane.CENTER) {
            this._bindCollapse()
        }

        if (this._config.resizable && this._dir !== CollapsiblePane.CENTER) {
            this._bindResize()
        }
    }

    // ── Public API ──────────────────────────────────────────────────

    /**
     * Toggle or set collapsed state.
     * @param {boolean} [force] - true = collapse, false = expand, undefined = toggle
     * @returns {boolean} New collapsed state
     */
    collapse(force) {
        if (this._dir === CollapsiblePane.CENTER) return false

        const shouldCollapse = force !== undefined ? force : !this._collapsed

        if (shouldCollapse === this._collapsed) return this._collapsed

        if (shouldCollapse) {
            // Store current width before collapsing
            this._width = parseInt(this.node.css('flex-basis')) || this._width
            this.node.addClass('collapsed')
            this._collapsed = true
            this.emit('collapse', { collapsed: true, width: this._width })
        } else {
            this.node.removeClass('collapsed')
            this.node.css({
                'flex-basis': this._width + 'px',
                'max-width': ''
            })
            this._collapsed = false
            this.emit('expand', { width: this._width })
        }

        return this._collapsed
    }

    /**
     * @returns {boolean} Whether pane is collapsed
     */
    isCollapsed() {
        return this._collapsed
    }

    /**
     * Get or set the pane width (for non-center panes).
     * @param {number} [width] - New width in px. Omit to get current.
     * @returns {number} Current width
     */
    width(width) {
        if (width !== undefined && this._dir !== CollapsiblePane.CENTER) {
            this._width = Math.max(this._config.minWidth, Math.min(this._config.maxWidth, width))
            if (!this._collapsed) {
                this.node.css('flex-basis', this._width + 'px')
            }
        }
        return this._width
    }

    /**
     * Add a child widget to the pane content area.
     */
    add(widget) {
        this.find('.nui-pane-content').append(widget.get ? widget.get() : widget.node)
        if (widget._parent !== this) {
            this._widgets.push(widget)
            widget._parent = this
        }
        return widget
    }

    /**
     * Set the content area HTML directly.
     * @param {string|jQuery} content - HTML string or jQuery element
     */
    setContent(content) {
        const el = this.find('.nui-pane-content')
        if (typeof content === 'string') {
            el.html(content)
        } else {
            el.empty().append(content)
        }
        return this
    }

    /**
     * Clear the content area.
     */
    clear() {
        // Destroy child widgets first
        ;[...this._widgets].forEach(w => w.destroy())
        this.find('.nui-pane-content').empty()
        return this
    }

    // ── Private ─────────────────────────────────────────────────────

    /**
     * Bind click-to-collapse on the pane header.
     * @private
     */
    _bindCollapse() {
        this.find('.nui-pane-header').on('click', () => {
            this.collapse()
        })
    }

    /**
     * Bind pointer-drag resizing on the resize handle.
     * Uses native Pointer Events for drag tracking.
     * @private
     */
    _bindResize() {
        const handle = this.node.find('> .nui-pane-resize-handle')[0]
        if (!handle) return

        const isRight = this._dir === CollapsiblePane.RIGHT

        handle.addEventListener('pointerdown', (e) => {
            if (this._collapsed) return
            e.preventDefault()

            const startX = e.clientX
            const startWidth = parseInt(this.node.css('flex-basis')) || this._width

            handle.setPointerCapture(e.pointerId)
            handle.classList.add('nui-active')
            this.node.addClass('nui-resizing')

            const onMove = (e) => {
                const delta = isRight
                    ? startX - e.clientX   // Right pane: drag left = wider
                    : e.clientX - startX   // Left pane: drag right = wider

                const newWidth = Math.max(
                    this._config.minWidth,
                    Math.min(this._config.maxWidth, startWidth + delta)
                )

                this.node.css('flex-basis', newWidth + 'px')
                this._width = newWidth
            }

            const onUp = (e) => {
                handle.releasePointerCapture(e.pointerId)
                handle.classList.remove('nui-active')
                this.node.removeClass('nui-resizing')
                handle.removeEventListener('pointermove', onMove)
                handle.removeEventListener('pointerup', onUp)

                this.emit('resize', { width: this._width })
            }

            handle.addEventListener('pointermove', onMove)
            handle.addEventListener('pointerup', onUp)
        })
    }

    /**
     * No-op — pointer event listeners are cleaned up automatically when DOM is removed.
     */
    beforeDestroy() {
}
