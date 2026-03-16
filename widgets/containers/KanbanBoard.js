/**
 * KanbanBoard — Multi-column drag-and-drop Kanban board.
 *
 * Each column is backed by a {@link DataProvider}. Cards can be dragged
 * between columns (transfer) or reordered within a column (reorder).
 * Uses the [dragula](https://github.com/bevacqua/dragula) library for
 * drag-and-drop, loaded automatically via CDN.
 *
 * @extends Widget
 * @category Containers
 *
 * @fires KanbanBoard#transfer - Card moved to a different column: `{ item, fromColumn, toColumn, index }`
 * @fires KanbanBoard#reorder  - Card reordered within the same column: `{ item, column, fromIndex, toIndex }`
 * @fires KanbanBoard#select   - Card clicked: `{ item, column }`
 *
 * @example
 * const board = new KanbanBoard({
 *     columns: [
 *         { id: 'todo',  title: 'To Do',       dataProvider: todoDP },
 *         { id: 'doing', title: 'In Progress',  dataProvider: doingDP },
 *         { id: 'done',  title: 'Done',         dataProvider: doneDP }
 *     ],
 *     cardFields: { title: 'name', subtitle: 'description', badge: 'priority' },
 *     draggable: true
 * })
 * board.appendTo($('#container'))
 * await board.init()
 *
 * board.on('transfer', (data) => console.log('Moved:', data))
 * board.on('select',   (data) => console.log('Selected:', data))
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

const DRAGULA_JS  = 'https://cdn.jsdelivr.net/npm/dragula@3.7.3/dist/dragula.min.js'
const DRAGULA_CSS = 'https://cdn.jsdelivr.net/npm/dragula@3.7.3/dist/dragula.min.css'

const template = `<div class="nui-kanban"></div>`

/**
 * @typedef {Object} KanbanColumnConfig
 * @property {string}       id           - Unique column identifier
 * @property {string}       title        - Display title
 * @property {DataProvider} dataProvider  - Data source for this column
 * @property {function(Object):string} [renderCard] - Per-column custom card renderer
 * @property {string}       [groupBy]    - Per-column groupBy override
 * @property {string[]}     [groupOrder] - Per-column groupOrder override
 */

/** @category Containers */
export class KanbanBoard extends Widget {

    /**
     * @param {Object} params
     * @param {KanbanColumnConfig[]} params.columns       - Column definitions
     * @param {Object}  [params.cardFields]               - Field mapping for default card rendering
     * @param {string}  [params.cardFields.title]          - Row field for card title
     * @param {string}  [params.cardFields.subtitle]       - Row field for subtitle
     * @param {string}  [params.cardFields.badge]          - Row field for badge text
     * @param {string}  [params.cardFields.icon]           - Row field for icon CSS class
     * @param {function(Object, KanbanColumnConfig):string} [params.renderCard] - Global custom card renderer
     * @param {boolean} [params.draggable=true]            - Enable drag-and-drop
     * @param {string}  [params.columnWidth]               - CSS width override (e.g. '300px')
     * @param {string}  [params.groupBy]                   - Field name to group cards by within each column
     * @param {string[]} [params.groupOrder]               - Explicit group display order (unlisted values appear at end)
     */
    constructor(params = {}) {
        super({ ...params, template, autoInit: false })

        this._columns = params.columns || []
        this._cardFields = params.cardFields || {}
        this._renderCard = params.renderCard || null
        this._draggable = params.draggable !== false
        this._groupBy = params.groupBy || null
        this._groupOrder = params.groupOrder || null

        /** @private  id -> { config, $body, rows, unsubscribes } */
        this._columnMap = {}
        /** @private  dragula instance */
        this._drake = null
        /** @private */
        this._selectedItem = null
        /** @private */
        this._selectedColumn = null
        /** @private  suppress auto-refresh during drop */
        this._dropping = false
    }

    // ── Lifecycle ───────────────────────────────────────────────

    async init() {
        // 1. Load styles
        await ResourceLoader.loadCss('../../css/widgets/containers/kanban-board.css', import.meta.url)

        // 2. Load dragula (JS + CSS in parallel)
        await Promise.all([
            ResourceLoader.loadScript(DRAGULA_JS),
            ResourceLoader.loadCss(DRAGULA_CSS)
        ])

        // 3. Build column map
        this._columns.forEach(col => {
            this._columnMap[col.id] = {
                config: col,
                $body: null,
                rows: [],
                unsubscribes: []
            }
        })

        // 4. Render columns and cards
        await this.render()

        // 5. Init dragula
        if (this._draggable) {
            this._initDragula()
        }

        // 6. Wire DataProvider listeners
        this._wireDataProviderListeners()

        // 7. Card click handler (delegated)
        this._attachCardClickHandlers()
    }

    async render() {
        const container = this.get()
        container.empty()

        if (this.params.columnWidth) {
            container.css('--nui-kanban-column-width', this.params.columnWidth)
        }

        for (const colConfig of this._columns) {
            const colInfo = this._columnMap[colConfig.id]

            // Fetch data
            const pageResult = await colConfig.dataProvider.getPage()
            colInfo.rows = pageResult.rows

            // Build column DOM
            const $column = $(`
                <div class="nui-kanban-column" data-column-id="${colConfig.id}">
                    <div class="nui-kanban-column-header">
                        <span class="nui-kanban-column-title">${colConfig.title}</span>
                        <span class="nui-kanban-column-count">${pageResult.totalRows}</span>
                    </div>
                    <div class="nui-kanban-column-body"></div>
                </div>
            `)

            const $body = $column.find('.nui-kanban-column-body')
            colInfo.$body = $body

            this._renderCards($body, pageResult.rows, colConfig)
            container.append($column)
        }
    }

    beforeDestroy() {
        if (this._drake) {
            this._drake.destroy()
            this._drake = null
        }

        Object.values(this._columnMap).forEach(colInfo => {
            colInfo.unsubscribes.forEach(fn => fn())
        })

        this.get().off('click', '.nui-kanban-card')
    }

    // ── Public API ──────────────────────────────────────────────

    /**
     * Refresh all columns by re-fetching from their DataProviders.
     * @returns {Promise<void>}
     */
    async refresh() {
        if (this._drake) {
            this._drake.destroy()
            this._drake = null
        }

        await this.render()

        if (this._draggable) {
            this._initDragula()
        }
    }

    /**
     * Refresh a single column by ID.
     * @param {string} columnId
     * @returns {Promise<void>}
     */
    async refreshColumn(columnId) {
        const colInfo = this._columnMap[columnId]
        if (!colInfo) return

        const pageResult = await colInfo.config.dataProvider.getPage()
        colInfo.rows = pageResult.rows

        this._renderCards(colInfo.$body, pageResult.rows, colInfo.config)
        this._updateColumnCount(columnId)

        // Rebuild dragula since DOM changed
        if (this._drake) {
            this._drake.destroy()
            this._initDragula()
        }
    }

    /**
     * Add a column dynamically.
     * @param {KanbanColumnConfig} colConfig
     * @returns {Promise<void>}
     */
    async addColumn(colConfig) {
        this._columns.push(colConfig)
        this._columnMap[colConfig.id] = {
            config: colConfig,
            $body: null,
            rows: [],
            unsubscribes: []
        }

        // Wire listener for the new column
        const unsub = colConfig.dataProvider.onDataChange(() => {
            this.refreshColumn(colConfig.id)
        })
        this._columnMap[colConfig.id].unsubscribes.push(unsub)

        await this.refresh()
    }

    /**
     * Remove a column by ID.
     * @param {string} columnId
     * @returns {Promise<void>}
     */
    async removeColumn(columnId) {
        this._columns = this._columns.filter(c => c.id !== columnId)

        const colInfo = this._columnMap[columnId]
        if (colInfo) {
            colInfo.unsubscribes.forEach(fn => fn())
        }
        delete this._columnMap[columnId]

        await this.refresh()
    }

    /**
     * Get the currently selected item.
     * @returns {{ item: Object, column: string } | null}
     */
    getSelected() {
        return this._selectedItem
            ? { item: this._selectedItem, column: this._selectedColumn }
            : null
    }

    /**
     * Clear selection.
     */
    clearSelection() {
        this.find('.nui-kanban-card').removeClass('nui-selected')
        this._selectedItem = null
        this._selectedColumn = null
    }

    /**
     * Get all column IDs.
     * @returns {string[]}
     */
    getColumnIds() {
        return this._columns.map(c => c.id)
    }

    // ── Private: Rendering ──────────────────────────────────────

    /** @private */
    _renderCards($body, rows, colConfig) {
        $body.empty()

        if (rows.length === 0) {
            $body.html('<div class="nui-kanban-column-empty">No items</div>')
            return
        }

        const groupByField = colConfig.groupBy || this._groupBy
        if (groupByField) {
            const groupOrder = colConfig.groupOrder || this._groupOrder
            const groups = this._groupRows(rows, groupByField, groupOrder)
            groups.forEach(group => {
                $body.append(
                    `<div class="nui-kanban-group-header">${group.label} <span class="nui-kanban-group-count">${group.rows.length}</span></div>`
                )
                group.rows.forEach(row => {
                    $body.append(this._buildCardHtml(row, colConfig.dataProvider.getKey(row), colConfig))
                })
            })
        } else {
            rows.forEach(row => {
                const key = colConfig.dataProvider.getKey(row)
                $body.append(this._buildCardHtml(row, key, colConfig))
            })
        }
    }

    /**
     * Group rows by a field value.
     * @param {Object[]} rows
     * @param {string}   field      - Field name to group by
     * @param {string[]} [order]    - Explicit group order
     * @returns {Array<{ label: string, rows: Object[] }>}
     * @private
     */
    _groupRows(rows, field, order) {
        const map = {}
        rows.forEach(row => {
            const val = row[field] ?? ''
            const label = String(val) || '(none)'
            if (!map[label]) map[label] = []
            map[label].push(row)
        })

        let labels = Object.keys(map)
        if (order) {
            labels.sort((a, b) => {
                const ia = order.indexOf(a)
                const ib = order.indexOf(b)
                if (ia === -1 && ib === -1) return a.localeCompare(b)
                if (ia === -1) return 1
                if (ib === -1) return -1
                return ia - ib
            })
        } else {
            labels.sort()
        }

        return labels.map(label => ({ label, rows: map[label] }))
    }

    /** @private */
    _buildCardHtml(row, key, colConfig) {
        const escapedKey = String(key).replace(/"/g, '&quot;')

        // Priority 1: per-column renderCard
        if (colConfig.renderCard) {
            return `<div class="nui-kanban-card" data-key="${escapedKey}">${colConfig.renderCard(row)}</div>`
        }

        // Priority 2: global renderCard
        if (this._renderCard) {
            return `<div class="nui-kanban-card" data-key="${escapedKey}">${this._renderCard(row, colConfig)}</div>`
        }

        // Priority 3: field mapping
        const fields = this._cardFields
        const title    = fields.title    ? (row[fields.title] ?? '')    : ''
        const subtitle = fields.subtitle ? (row[fields.subtitle] ?? '') : ''
        const badge    = fields.badge    ? (row[fields.badge] ?? '')    : ''
        const icon     = fields.icon     ? (row[fields.icon] ?? '')     : ''

        let html = `<div class="nui-kanban-card" data-key="${escapedKey}">`
        html += '<div class="nui-kanban-card-header">'

        if (icon)  html += `<span class="nui-kanban-card-icon"><i class="${icon}"></i></span>`
        if (title) html += `<span class="nui-kanban-card-title">${title}</span>`
        if (badge) html += `<span class="nui-kanban-card-badge">${badge}</span>`

        html += '</div>'

        if (subtitle) html += `<div class="nui-kanban-card-subtitle">${subtitle}</div>`

        html += '</div>'
        return html
    }

    /**
     * Try to detect the key field name from a DataProvider.
     * @private
     */
    _resolveKeyField(dataProvider) {
        if (dataProvider._keyField) return dataProvider._keyField
        // Fallback: check common field names
        return null
    }

    /** @private */
    _updateColumnCount(columnId) {
        const info = this._columnMap[columnId]
        this.find(`.nui-kanban-column[data-column-id="${columnId}"] .nui-kanban-column-count`)
            .text(info.rows.length)
    }

    // ── Private: Dragula ────────────────────────────────────────

    /** @private */
    _initDragula() {
        const containers = Object.values(this._columnMap)
            .filter(c => c.$body)
            .map(c => c.$body[0])

        this._drake = window.dragula(containers, {
            moves: (el) => {
                return el.classList.contains('nui-kanban-card') &&
                       !el.classList.contains('nui-no-drag')
            },
            accepts: (el, target) => {
                return target.classList.contains('nui-kanban-column-body')
            },
            direction: 'vertical'
        })

        this._drake.on('drop', (el, target, source, sibling) => {
            this._onDrop(el, target, source, sibling)
        })
    }

    /** @private */
    async _onDrop(el, target, source, sibling) {
        const $el = $(el)
        const key = String($el.data('key'))
        const fromColumnId = $(source).closest('.nui-kanban-column').data('column-id')
        const toColumnId   = $(target).closest('.nui-kanban-column').data('column-id')

        const toIndex = Array.from(target.children)
            .filter(c => c.classList.contains('nui-kanban-card'))
            .indexOf(el)

        const fromColumn = this._columnMap[fromColumnId]
        const toColumn   = this._columnMap[toColumnId]

        const item = fromColumn.rows.find(r =>
            String(fromColumn.config.dataProvider.getKey(r)) === key
        )

        if (!item) {
            console.warn('KanbanBoard: dropped item not found in source data')
            return
        }

        if (fromColumnId === toColumnId) {
            // Same-column reorder
            const fromIndex = fromColumn.rows.findIndex(r =>
                String(fromColumn.config.dataProvider.getKey(r)) === key
            )

            fromColumn.rows.splice(fromIndex, 1)
            fromColumn.rows.splice(toIndex, 0, item)

            this.emit('reorder', {
                item: { ...item },
                column: fromColumnId,
                fromIndex,
                toIndex
            })
        } else {
            // Build save payload — strip the source key so the target provider
            // creates a new record instead of trying to update a non-existent one
            const keyField = this._resolveKeyField(fromColumn.config.dataProvider)
            const saveData = { ...item }
            if (keyField) delete saveData[keyField]

            // Suppress auto-refresh from DataProvider listeners during transfer
            this._dropping = true
            try {
                await fromColumn.config.dataProvider.delete(key)
                await toColumn.config.dataProvider.save(saveData)
            } finally {
                this._dropping = false
            }

            // Update local caches
            const fromIdx = fromColumn.rows.findIndex(r =>
                String(fromColumn.config.dataProvider.getKey(r)) === key
            )
            if (fromIdx > -1) fromColumn.rows.splice(fromIdx, 1)
            toColumn.rows.splice(toIndex, 0, item)

            this._updateColumnCount(fromColumnId)
            this._updateColumnCount(toColumnId)

            this.emit('transfer', {
                item: { ...item },
                fromColumn: fromColumnId,
                toColumn: toColumnId,
                index: toIndex
            })
        }
    }

    // ── Private: Events ─────────────────────────────────────────

    /** @private */
    _attachCardClickHandlers() {
        this.get().on('click', '.nui-kanban-card', (e) => {
            const $card = $(e.currentTarget)
            const key = String($card.data('key'))
            const columnId = $card.closest('.nui-kanban-column').data('column-id')

            // Toggle selection
            this.find('.nui-kanban-card').removeClass('nui-selected')
            $card.addClass('nui-selected')

            const colInfo = this._columnMap[columnId]
            const item = colInfo.rows.find(r =>
                String(colInfo.config.dataProvider.getKey(r)) === key
            )

            this._selectedItem = item ? { ...item } : null
            this._selectedColumn = columnId

            this.emit('select', {
                item: item ? { ...item } : null,
                column: columnId
            })
        })
    }

    /** @private */
    _wireDataProviderListeners() {
        Object.entries(this._columnMap).forEach(([columnId, colInfo]) => {
            const unsub = colInfo.config.dataProvider.onDataChange(() => {
                if (!this._dropping) {
                    this.refreshColumn(columnId)
                }
            })
            colInfo.unsubscribes.push(unsub)
        })
    }
}
