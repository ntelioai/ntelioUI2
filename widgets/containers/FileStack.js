/**
 * FileStack — Tabbed stack of "files" with folder-style tabs on one side.
 *
 * Visual metaphor: a stack of physical paper files. Tabs stick out on the
 * configured side (left or right). Clicking a tab pulls that file forward
 * and shows its content. The set of files is declared at construction —
 * no add/remove at runtime. Each file holds arbitrary child widgets or HTML,
 * accessed via a lightweight FileProxy returned by `stack.file(id)`.
 *
 * Switching tabs toggles a `display: none` class on the file panes rather
 * than re-mounting, so child widget state and scroll positions are preserved.
 *
 * @extends Widget
 * @category Containers
 *
 * @fires FileStack#select - File activated: `{ id, prevId }`
 *
 * @example
 * const stack = new FileStack({
 *     tabSide: 'left',
 *     labelOrientation: 'vertical',
 *     files: [
 *         { id: 'overview', title: 'Overview', icon: 'fa-house', color: '#4a90e2' },
 *         { id: 'tasks',    title: 'Tasks',    icon: 'fa-list',  color: '#3aab64' },
 *         { id: 'notes',    title: 'Notes',    icon: 'fa-pen',   color: '#d65a3a' }
 *     ],
 *     activeId: 'overview',
 *     autoInit: false
 * })
 * stack.appendTo($('#root'))
 * await stack.init()
 *
 * stack.file('overview').setContent('<h2>Hello</h2>')
 * stack.file('tasks').add(myWidget)
 * stack.on('select', ({ id, prevId }) => console.log('now:', id, 'was:', prevId))
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

const FILE_DEFAULTS = {
    title: 'File',
    icon: null,
    color: null,
    disabled: false
}

// ── FileProxy ───────────────────────────────────────────────────────

/**
 * Lightweight accessor for a file's content area.
 * Returned by `FileStack.file(id)`. Not a Widget.
 */
class FileProxy {
    constructor(stack, entry) {
        this._stack = stack
        this._entry = entry
    }

    /** Add a child widget to this file's content area. */
    add(widget) {
        widget._parent = this._stack
        this._entry.$file.append(widget.get ? widget.get() : widget.node)
        this._entry.childWidgets.push(widget)
        this._stack._widgets.push(widget)
        return widget
    }

    /** Set HTML string or jQuery/DOM content directly. */
    setContent(content) {
        if (typeof content === 'string') {
            this._entry.$file.html(content)
        } else {
            this._entry.$file.empty().append(content)
        }
        return this
    }

    /** Destroy child widgets and empty content. */
    clear() {
        ;[...this._entry.childWidgets].forEach(w => w.destroy())
        this._entry.childWidgets = []
        this._entry.$file.empty()
        return this
    }

    /** jQuery find scoped to file content. */
    find(selector) {
        return this._entry.$file.find(selector)
    }

    /** Get the file's content jQuery node. */
    getContentNode() {
        return this._entry.$file
    }

    /** Get the file pane jQuery node (same as content node — no inner header). */
    getNode() {
        return this._entry.$file
    }
}

// ── FileStack ───────────────────────────────────────────────────────

/** @category Containers */
export class FileStack extends Widget {

    /**
     * @param {Object} params
     * @param {Object[]} params.files                                 - Non-empty array of file configs (unique ids)
     * @param {string}   params.files[].id                            - Unique file id
     * @param {string}   params.files[].title                         - Tab label
     * @param {string}   [params.files[].icon]                        - Font Awesome icon class, e.g. 'fa-folder'
     * @param {string}   [params.files[].color]                       - CSS color used to tint the tab
     * @param {boolean}  [params.files[].disabled=false]              - If true, tab is greyed out and unselectable
     * @param {string}   [params.activeId]                            - Initially active file id (default: first non-disabled)
     * @param {'left'|'right'}          [params.tabSide='left']        - Side the tabs stick out from
     * @param {'vertical'|'horizontal'} [params.labelOrientation='vertical'] - Tab label orientation
     * @param {number}   [params.tabSize=36]                          - Tab thickness in px (vertical: width; horizontal: min-height)
     * @param {number}   [params.tabSpacing=4]                        - Gap between tabs in px
     */
    constructor(params = {}) {
        const template = `<div class="nui-file-stack"></div>`
        super({ template, autoInit: false, ...params })

        const files = Array.isArray(params.files) ? params.files : []
        if (files.length === 0) {
            throw new Error('[FileStack] requires at least one file in `files`')
        }

        const seen = new Set()
        for (const f of files) {
            if (!f || !f.id) throw new Error('[FileStack] every file must have an `id`')
            if (seen.has(f.id)) throw new Error(`[FileStack] duplicate file id: ${f.id}`)
            seen.add(f.id)
        }

        this._tabSide = params.tabSide === 'right' ? 'right' : 'left'
        this._labelOrientation = params.labelOrientation === 'horizontal' ? 'horizontal' : 'vertical'
        this._tabSize = Number.isFinite(params.tabSize) ? params.tabSize : 36
        this._tabSpacing = Number.isFinite(params.tabSpacing) ? params.tabSpacing : 4

        this._fileConfigs = files.map(f => ({ ...FILE_DEFAULTS, ...f }))

        /** @private  id → { config, $tab, $file, proxy, childWidgets } */
        this._files = new Map()

        // Resolve initial active id (request → first non-disabled → first)
        let activeId = params.activeId
        const requested = this._fileConfigs.find(f => f.id === activeId && !f.disabled)
        if (!requested) {
            if (activeId) {
                console.warn(`[FileStack] activeId "${activeId}" not available; falling back to first non-disabled file`)
            }
            const fallback = this._fileConfigs.find(f => !f.disabled) || this._fileConfigs[0]
            activeId = fallback.id
        }
        this._activeId = activeId

        this.node
            .attr('data-tab-side', this._tabSide)
            .attr('data-label-orientation', this._labelOrientation)
            .css({
                '--fs-tab-size': this._tabSize + 'px',
                '--fs-tab-spacing': this._tabSpacing + 'px'
            })
    }

    async init() {
        await ResourceLoader.loadCss(
            '../../css/widgets/containers/file-stack.css',
            import.meta.url
        )

        const $tabs = $('<div class="nui-fs-tabs" role="tablist"></div>')
        const $pane = $('<div class="nui-fs-pane"></div>')
        this.node.append($tabs).append($pane)

        for (const config of this._fileConfigs) {
            const $tab = this._buildTab(config)
            const $file = $('<div class="nui-fs-file" role="tabpanel"></div>')
                .attr('data-file-id', config.id)

            const isActive = config.id === this._activeId
            if (isActive) {
                $tab.addClass('nui-fs-active').attr('aria-selected', 'true')
            } else {
                $file.addClass('nui-fs-hidden')
                $tab.attr('aria-selected', 'false')
            }

            $tabs.append($tab)
            $pane.append($file)

            this._files.set(config.id, {
                config,
                $tab,
                $file,
                proxy: null,
                childWidgets: []
            })
        }

        this._bindTabClicks($tabs)
    }

    // ── Public API ──────────────────────────────────────────────────

    /**
     * Activate a file. No-op for same/unknown/disabled.
     * Emits `select` event with `{ id, prevId }` on change.
     * @param {string} id
     * @returns {this}
     */
    select(id) {
        if (id === this._activeId) return this
        const entry = this._files.get(id)
        if (!entry) {
            console.warn(`[FileStack] Unknown file id: ${id}`)
            return this
        }
        if (entry.config.disabled) return this

        const prevId = this._activeId
        const prev = this._files.get(prevId)
        if (prev) {
            prev.$tab.removeClass('nui-fs-active').attr('aria-selected', 'false')
            prev.$file.addClass('nui-fs-hidden')
        }

        entry.$tab.addClass('nui-fs-active').attr('aria-selected', 'true')
        entry.$file.removeClass('nui-fs-hidden')

        this._activeId = id
        this.emit('select', { id, prevId: prevId || null })
        return this
    }

    /**
     * Returns a FileProxy for accessing this file's content area.
     * @param {string} id
     * @returns {FileProxy}
     */
    file(id) {
        const entry = this._files.get(id)
        if (!entry) throw new Error(`[FileStack] Unknown file: ${id}`)
        if (!entry.proxy) entry.proxy = new FileProxy(this, entry)
        return entry.proxy
    }

    /** @returns {string} Currently active file id */
    getActiveFileId() {
        return this._activeId
    }

    /** @returns {string[]} File ids in declared order */
    getFileIds() {
        return this._fileConfigs.map(f => f.id)
    }

    /** @returns {Object|undefined} Read-only copy of file's config (or undefined) */
    getFileConfig(id) {
        const entry = this._files.get(id)
        return entry ? { ...entry.config } : undefined
    }

    /**
     * Flip tabs to the other side at runtime.
     * @param {'left'|'right'} side
     * @returns {this}
     */
    setTabSide(side) {
        if (side !== 'left' && side !== 'right') return this
        this._tabSide = side
        this.node.attr('data-tab-side', side)
        return this
    }

    /**
     * Change label orientation at runtime.
     * @param {'vertical'|'horizontal'} orientation
     * @returns {this}
     */
    setLabelOrientation(orientation) {
        if (orientation !== 'vertical' && orientation !== 'horizontal') return this
        this._labelOrientation = orientation
        this.node.attr('data-label-orientation', orientation)
        return this
    }

    /**
     * Disable a tab. If currently active, falls back to first other non-disabled file.
     * @param {string} id
     * @returns {this}
     */
    disable(id) {
        const entry = this._files.get(id)
        if (!entry) return this
        entry.config.disabled = true
        entry.$tab.addClass('nui-fs-disabled').attr('disabled', 'disabled')
        if (this._activeId === id) {
            const fallback = this._fileConfigs.find(f => f.id !== id && !f.disabled)
            if (fallback) this.select(fallback.id)
        }
        return this
    }

    /**
     * Enable a previously disabled tab.
     * @param {string} id
     * @returns {this}
     */
    enable(id) {
        const entry = this._files.get(id)
        if (!entry) return this
        entry.config.disabled = false
        entry.$tab.removeClass('nui-fs-disabled').removeAttr('disabled')
        return this
    }

    // ── Private ─────────────────────────────────────────────────────

    /** @private */
    _buildTab(config) {
        const iconHtml = config.icon
            ? `<i class="fas ${config.icon} nui-fs-tab-icon"></i>`
            : ''
        const colorAttr = config.color
            ? ` style="--fs-tint:${config.color}"`
            : ''
        const disabledAttr = config.disabled ? ' disabled="disabled"' : ''
        const disabledClass = config.disabled ? ' nui-fs-disabled' : ''
        const title = String(config.title == null ? '' : config.title)
        const escTitle = title.replace(/"/g, '&quot;')

        return $(`
            <button type="button"
                    role="tab"
                    class="nui-fs-tab${disabledClass}"
                    data-file-id="${config.id}"
                    title="${escTitle}"${colorAttr}${disabledAttr}>
                ${iconHtml}
                <span class="nui-fs-tab-label">${escTitle}</span>
            </button>
        `)
    }

    /** @private */
    _bindTabClicks($tabs) {
        $tabs.on('click', '.nui-fs-tab', (e) => {
            const id = $(e.currentTarget).attr('data-file-id')
            if (id) this.select(id)
        })
    }

    beforeDestroy() {
        for (const entry of this._files.values()) {
            for (const w of entry.childWidgets) {
                if (w && w.destroy) w.destroy()
            }
            entry.childWidgets = []
        }
    }
}
