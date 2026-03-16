/**
 * PanelLayout — Declarative multi-panel layout with open / closed / minimized states.
 *
 * Arranges panels in a horizontal flex row. One panel is marked `main: true`
 * and fills remaining space (flex: 1). Other panels have fixed widths and
 * stack to the left or right of main. Each panel can be programmatically
 * opened, closed (0px, gone from layout), or minimized (30px vertical strip).
 *
 * @extends Widget
 * @category Containers
 *
 * @fires PanelLayout#panelOpen     - Panel opened:    `{ id, width }`
 * @fires PanelLayout#panelClose    - Panel closed:    `{ id }`
 * @fires PanelLayout#panelMinimize - Panel minimized: `{ id }`
 * @fires PanelLayout#panelResize   - Panel resized:   `{ id, width }`
 *
 * @example
 * const layout = new PanelLayout({
 *     panels: [
 *         { id: 'sources', title: 'Sources', side: 'left', width: 420, state: 'closed' },
 *         { id: 'main', title: 'App', main: true },
 *         { id: 'detail', title: 'Detail', side: 'right', width: 400, state: 'closed' }
 *     ],
 *     autoInit: false
 * })
 * layout.appendTo($('#root'))
 * await layout.init()
 *
 * layout.panel('main').add(myWidget)
 * layout.open('detail')
 * layout.close('detail')
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

const PANEL_DEFAULTS = {
    title: 'Panel',
    main: false,
    side: 'left',
    width: 300,
    minWidth: 150,
    maxWidth: 700,
    resizable: true,
    closable: true,
    minimizable: true,
    showHeader: true,
    state: 'open'
}

// ── PanelProxy ──────────────────────────────────────────────────────

/**
 * Lightweight accessor for a panel's content area.
 * Returned by `PanelLayout.panel(id)`. Not a Widget.
 */
class PanelProxy {
    constructor(layout, entry) {
        this._layout = layout
        this._entry = entry
    }

    /** Add a child widget to this panel's content area. */
    add(widget) {
        widget._parent = this._layout
        this._entry.$content.append(widget.get ? widget.get() : widget.node)
        this._entry.childWidgets.push(widget)
        this._layout._widgets.push(widget)
        return widget
    }

    /** Set HTML or jQuery content directly. */
    setContent(content) {
        if (typeof content === 'string') {
            this._entry.$content.html(content)
        } else {
            this._entry.$content.empty().append(content)
        }
        return this
    }

    /** Clear content and destroy child widgets. */
    clear() {
        ;[...this._entry.childWidgets].forEach(w => w.destroy())
        this._entry.childWidgets = []
        this._entry.$content.empty()
        return this
    }

    /** jQuery find scoped to panel content. */
    find(selector) {
        return this._entry.$content.find(selector)
    }

    /** Get the panel's content jQuery node. */
    getContentNode() {
        return this._entry.$content
    }

    /** Get the full panel jQuery node (header + content). */
    getNode() {
        return this._entry.$panel
    }
}

// ── PanelLayout ─────────────────────────────────────────────────────

/** @category Containers */
export class PanelLayout extends Widget {

    constructor(params = {}) {
        const template = `<div class="nui-panel-layout"></div>`
        super({ template, autoInit: false, ...params })

        this._panelConfigs = params.panels || []
        this._panels = new Map()
    }

    async init() {
        await ResourceLoader.loadCss(
            '../../css/widgets/containers/panel-layout.css',
            import.meta.url
        )

        // Sort: left-side panels, then main, then right-side panels
        const sorted = this._sortPanels(this._panelConfigs)

        for (const rawConfig of sorted) {
            const entry = this._buildPanel(rawConfig)
            this._panels.set(entry.config.id, entry)
            this.node.append(entry.$panel)
        }

        // Bind interactions
        for (const entry of this._panels.values()) {
            if (!entry.config.main && entry.config.resizable) {
                this._bindResize(entry)
            }
            this._bindMinimizedClick(entry)
            this._bindHeaderButtons(entry)
        }
    }

    // ── Public API ──────────────────────────────────────────────────

    /**
     * Open a panel (from closed or minimized → open).
     * @param {string} panelId
     * @returns {this}
     */
    open(panelId) {
        const entry = this._panels.get(panelId)
        if (!entry || entry.config.main || entry.state === 'open') return this

        entry.state = 'open'
        entry.$panel
            .removeClass('nui-panel-closed nui-panel-minimized')
            .addClass('nui-panel-open')
            .css('flex-basis', entry.width + 'px')

        this.emit('panelOpen', { id: panelId, width: entry.width })
        return this
    }

    /**
     * Close a panel (→ 0px, removed from flow).
     * @param {string} panelId
     * @returns {this}
     */
    close(panelId) {
        const entry = this._panels.get(panelId)
        if (!entry || entry.config.main || entry.state === 'closed') return this

        if (entry.state === 'open') {
            entry.width = parseInt(entry.$panel.css('flex-basis')) || entry.width
        }

        entry.state = 'closed'
        entry.$panel
            .removeClass('nui-panel-open nui-panel-minimized')
            .addClass('nui-panel-closed')

        this.emit('panelClose', { id: panelId })
        return this
    }

    /**
     * Minimize a panel (→ 30px strip with vertical title).
     * @param {string} panelId
     * @returns {this}
     */
    minimize(panelId) {
        const entry = this._panels.get(panelId)
        if (!entry || entry.config.main || entry.state === 'minimized') return this

        if (entry.state === 'open') {
            entry.width = parseInt(entry.$panel.css('flex-basis')) || entry.width
        }

        entry.state = 'minimized'
        entry.$panel
            .removeClass('nui-panel-open nui-panel-closed')
            .addClass('nui-panel-minimized')

        this.emit('panelMinimize', { id: panelId })
        return this
    }

    /**
     * Toggle between open and closed.
     * @param {string} panelId
     * @returns {this}
     */
    toggle(panelId) {
        const entry = this._panels.get(panelId)
        if (!entry) return this
        return entry.state === 'open' ? this.close(panelId) : this.open(panelId)
    }

    /**
     * Get current state of a panel.
     * @param {string} panelId
     * @returns {'open'|'closed'|'minimized'|undefined}
     */
    getState(panelId) {
        const entry = this._panels.get(panelId)
        return entry ? entry.state : undefined
    }

    /**
     * Get a PanelProxy for the given panel.
     * @param {string} panelId
     * @returns {PanelProxy}
     */
    panel(panelId) {
        const entry = this._panels.get(panelId)
        if (!entry) throw new Error(`[PanelLayout] Unknown panel: ${panelId}`)
        if (!entry.proxy) entry.proxy = new PanelProxy(this, entry)
        return entry.proxy
    }

    /** Close all non-main panels. */
    closeAll() {
        for (const [id, entry] of this._panels) {
            if (!entry.config.main) this.close(id)
        }
        return this
    }

    /** Get IDs of all currently open panels. */
    getOpenPanels() {
        const ids = []
        for (const [id, entry] of this._panels) {
            if (entry.state === 'open') ids.push(id)
        }
        return ids
    }

    // ── Private ─────────────────────────────────────────────────────

    /** Sort panels: left-side first, then main, then right-side. */
    _sortPanels(configs) {
        const left = [], main = [], right = []
        for (const c of configs) {
            if (c.main) main.push(c)
            else if (c.side === 'right') right.push(c)
            else left.push(c)
        }
        return [...left, ...main, ...right]
    }

    /** Build a panel's DOM and return its entry object. */
    _buildPanel(rawConfig) {
        const config = { ...PANEL_DEFAULTS, ...rawConfig }
        const isMain = config.main
        const side = isMain ? 'main' : config.side

        // Determine initial state class
        const stateClass = isMain ? 'nui-panel-open'
            : config.state === 'closed' ? 'nui-panel-closed'
            : config.state === 'minimized' ? 'nui-panel-minimized'
            : 'nui-panel-open'

        // Build header actions
        let actionsHtml = ''
        if (!isMain) {
            const btns = []
            if (config.minimizable) {
                btns.push(`<button class="nui-panel-btn nui-panel-minimize-btn" title="Minimize"><i class="fas fa-minus"></i></button>`)
            }
            if (config.closable) {
                btns.push(`<button class="nui-panel-btn nui-panel-close-btn" title="Close"><i class="fas fa-times"></i></button>`)
            }
            if (btns.length) {
                actionsHtml = `<div class="nui-panel-header-actions">${btns.join('')}</div>`
            }
        }

        const headerClass = config.showHeader ? '' : ' nui-panel-no-header'
        const resizeHandle = (!isMain && config.resizable)
            ? '<div class="nui-panel-resize-handle"></div>'
            : ''

        const html = `
            <div class="nui-panel ${isMain ? 'nui-panel-main ' : ''}${stateClass}"
                 data-panel-id="${config.id}"
                 ${!isMain ? `data-side="${config.side}"` : ''}>
                <div class="nui-panel-header${headerClass}">
                    <span class="nui-panel-title">${config.title}</span>
                    ${actionsHtml}
                </div>
                <div class="nui-panel-content"></div>
                ${resizeHandle}
            </div>
        `

        const $panel = $(html)

        // Set initial flex-basis for non-main open panels
        if (!isMain && config.state === 'open') {
            $panel.css('flex-basis', config.width + 'px')
        }

        const entry = {
            config,
            state: config.state,
            width: config.width,
            $panel,
            $header: $panel.find('> .nui-panel-header'),
            $content: $panel.find('> .nui-panel-content'),
            $handle: $panel.find('> .nui-panel-resize-handle'),
            proxy: null,
            childWidgets: []
        }

        return entry
    }

    /** Bind pointer-drag resizing on a panel's resize handle. */
    _bindResize(entry) {
        const handle = entry.$handle[0]
        if (!handle) return

        const isRight = entry.config.side === 'right'

        handle.addEventListener('pointerdown', (e) => {
            if (entry.state !== 'open') return
            e.preventDefault()

            const startX = e.clientX
            const startWidth = parseInt(entry.$panel.css('flex-basis')) || entry.width

            handle.setPointerCapture(e.pointerId)
            handle.classList.add('nui-active')
            this.node.addClass('nui-resizing')

            const onMove = (e) => {
                const delta = isRight
                    ? startX - e.clientX
                    : e.clientX - startX
                const newWidth = Math.max(
                    entry.config.minWidth,
                    Math.min(entry.config.maxWidth, startWidth + delta)
                )
                entry.$panel.css('flex-basis', newWidth + 'px')
                entry.width = newWidth
            }

            const onUp = (e) => {
                handle.releasePointerCapture(e.pointerId)
                handle.classList.remove('nui-active')
                this.node.removeClass('nui-resizing')
                handle.removeEventListener('pointermove', onMove)
                handle.removeEventListener('pointerup', onUp)
                this.emit('panelResize', { id: entry.config.id, width: entry.width })
            }

            handle.addEventListener('pointermove', onMove)
            handle.addEventListener('pointerup', onUp)
        })
    }

    /** Clicking a minimized panel's header restores it to open. */
    _bindMinimizedClick(entry) {
        if (entry.config.main) return
        entry.$header.on('click', (e) => {
            // Don't trigger on button clicks
            if ($(e.target).closest('.nui-panel-btn').length) return
            if (entry.state === 'minimized') {
                this.open(entry.config.id)
            }
        })
    }

    /** Bind close and minimize header buttons. */
    _bindHeaderButtons(entry) {
        if (entry.config.main) return

        entry.$panel.find('.nui-panel-close-btn').on('click', () => {
            this.close(entry.config.id)
        })

        entry.$panel.find('.nui-panel-minimize-btn').on('click', () => {
            this.minimize(entry.config.id)
        })
    }

    beforeDestroy() {
        for (const entry of this._panels.values()) {
            for (const w of entry.childWidgets) {
                if (w.destroy) w.destroy()
            }
        }
    }
}
