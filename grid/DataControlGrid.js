import { Widget } from '../core/Widget.js'

/**
 * DataControlGrid — renders data as a table (grid), continuous form (list), or single-record form.
 *
 * This is the view renderer used by DataControl. It does not manage data or mode switching —
 * those are handled by the parent DataControl orchestrator.
 *
 * @extends Widget
 * @category Grid
 *
 * @fires DataControlGrid#rowClick     - { key, row } when a row is clicked
 * @fires DataControlGrid#sortChange   - { column, order } when a sort header is clicked
 * @fires DataControlGrid#selectChange - { selected } map of key → boolean
 */
export class DataControlGrid extends Widget {
    static template = `
        <div class="data-control-grid">
            <div class="data-section"></div>
        </div>`

    /**
     * @param {Object} params
     * @param {import('../data/DataProvider.js').DataProvider} params.dataProvider
     * @param {boolean} [params.selectable=false] - Show row checkboxes
     */
    constructor(params = {}) {
        super({ template: DataControlGrid.template, autoInit: false, ...params })
        this._dataProvider = params.dataProvider
        this._selectable = params.selectable || false
        this._selected = {}
        this._viewMode = 'grid'  // 'grid' | 'list' | 'form'
        this._sort = null
    }

    async init() {}

    /**
     * Render data in the specified view mode.
     * @param {'grid'|'list'|'form'} mode
     * @param {import('../data/DataProvider.js').PageResult} pageResult
     */
    renderView(mode, pageResult) {
        this._viewMode = mode
        const container = this.find('.data-section')
        container.empty()

        // Update CSS class
        container.removeClass('grid list form').addClass(mode)

        if (!pageResult || pageResult.rows.length === 0) {
            container.html('<div class="no-data">No records found.</div>')
            return
        }

        if (mode === 'grid') {
            this._renderTable(container, pageResult)
        } else {
            this._renderFormView(container, pageResult)
        }
    }

    // ─── Grid (Table) Rendering ──────────────────────────────────

    /** @private */
    _renderTable(container, pageResult) {
        const columns = this._dataProvider.getColumns()
        const visibleCols = columns.filter(c => c.visible !== false)

        let html = '<table class="table table-hover"><thead><tr>'

        // Header checkbox
        if (this._selectable) {
            html += '<th class="col-select"><input type="checkbox" class="select-all"></th>'
        }

        // Column headers
        visibleCols.forEach(col => {
            const title = col.title || col.name
            const sortable = col.sortable !== false
            const sortClass = this._getSortClass(col.name)
            const widthStyle = col.width ? ` style="width:${col.width}"` : ''

            if (sortable) {
                html += `<th class="sortable" data-column="${col.name}"${widthStyle}>${title} <i class="sort-icon ${sortClass}"></i></th>`
            } else {
                html += `<th${widthStyle}>${title}</th>`
            }
        })
        html += '</tr></thead><tbody>'

        // Rows
        pageResult.rows.forEach(row => {
            const key = this._dataProvider.getKey(row)
            const checked = this._selected[key] ? 'checked' : ''
            html += `<tr data-key="${key}">`

            if (this._selectable) {
                html += `<td class="col-select"><input type="checkbox" class="row-select" data-key="${key}" ${checked}></td>`
            }

            visibleCols.forEach(col => {
                const rawValue = row[col.name]
                const display = col.formatter ? col.formatter(rawValue, row) : (rawValue ?? '')
                html += `<td>${display}</td>`
            })

            html += '</tr>'
        })

        html += '</tbody></table>'
        container.html(html)
        this._attachTableEvents(container)
    }

    /** @private */
    _attachTableEvents(container) {
        // Sort
        container.find('th.sortable').on('click', (e) => {
            const column = $(e.currentTarget).data('column')
            this._toggleSort(column)
        })

        // Row click
        container.find('tbody tr').on('click', (e) => {
            // Ignore clicks on checkboxes
            if ($(e.target).is('input[type="checkbox"]')) return

            const key = $(e.currentTarget).data('key')
            const row = this._findRow(key)
            this.emit('rowClick', { key: String(key), row })
        })

        // Row checkboxes
        if (this._selectable) {
            container.find('.row-select').on('change', (e) => {
                const key = $(e.target).data('key')
                this._selected[String(key)] = e.target.checked
                this._updateSelectAllState(container)
                this.emit('selectChange', { selected: { ...this._selected } })
            })

            container.find('.select-all').on('change', (e) => {
                const checked = e.target.checked
                container.find('.row-select').each((_, el) => {
                    el.checked = checked
                    this._selected[String($(el).data('key'))] = checked
                })
                this.emit('selectChange', { selected: { ...this._selected } })
            })
        }
    }

    // ─── List / Form Rendering ───────────────────────────────────

    /** @private */
    _renderFormView(container, pageResult) {
        const columns = this._dataProvider.getColumns()
        const visibleCols = columns.filter(c => c.visible !== false)

        let html = ''
        pageResult.rows.forEach(row => {
            const key = this._dataProvider.getKey(row)
            html += `<div class="form-record" data-key="${key}">`

            visibleCols.forEach(col => {
                const title = col.title || col.name
                const rawValue = row[col.name]
                const display = col.formatter ? col.formatter(rawValue, row) : (rawValue ?? '')
                html += `
                    <div class="form-field">
                        <label>${title}</label>
                        <span class="field-value">${display}</span>
                    </div>`
            })

            html += '</div>'
        })

        container.html(html)

        // Row click in form view
        container.find('.form-record').on('click', (e) => {
            const key = $(e.currentTarget).data('key')
            const row = this._findRow(key)
            this.emit('rowClick', { key: String(key), row })
        })
    }

    // ─── Sort ────────────────────────────────────────────────────

    /** @private */
    _toggleSort(column) {
        if (this._sort && this._sort.column === column) {
            // Cycle: asc → desc → none
            const next = this._sort.order === 'asc' ? 'desc' : this._sort.order === 'desc' ? 'none' : 'asc'
            this._sort = next === 'none' ? null : { column, order: next }
        } else {
            this._sort = { column, order: 'asc' }
        }
        this.emit('sortChange', this._sort || { column, order: 'none' })
    }

    /** @private */
    _getSortClass(column) {
        if (!this._sort || this._sort.column !== column) return 'fas fa-sort'
        return this._sort.order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'
    }

    // ─── Selection ───────────────────────────────────────────────

    /** @returns {string[]} Array of selected keys */
    getSelectedKeys() {
        return Object.entries(this._selected)
            .filter(([_, v]) => v)
            .map(([k]) => k)
    }

    /** Clear all selections */
    clearSelection() {
        this._selected = {}
        this.find('.row-select, .select-all').prop('checked', false)
    }

    /** @private */
    _updateSelectAllState(container) {
        const checkboxes = container.find('.row-select')
        const checkedCount = checkboxes.filter(':checked').length
        const selectAll = container.find('.select-all')[0]
        if (!selectAll) return

        if (checkedCount === 0) {
            selectAll.checked = false
            selectAll.indeterminate = false
        } else if (checkedCount === checkboxes.length) {
            selectAll.checked = true
            selectAll.indeterminate = false
        } else {
            selectAll.checked = false
            selectAll.indeterminate = true
        }
    }

    /** @private */
    _findRow(key) {
        // This is a simple lookup — the parent DataControl typically has the pageResult cached
        return null
    }

    /**
     * Provide the current page result so _findRow can look up rows.
     * Called by DataControl after each render.
     * @param {import('../data/DataProvider.js').PageResult} pageResult
     */
    setPageResult(pageResult) {
        this._pageResult = pageResult
    }

    /** @private - override with page result lookup */
    _findRow(key) {
        if (!this._pageResult) return null
        return this._pageResult.rows.find(r =>
            String(this._dataProvider.getKey(r)) === String(key)
        ) || null
    }
}
