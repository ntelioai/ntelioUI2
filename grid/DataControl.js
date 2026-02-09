import { Widget } from '../core/Widget.js'
import { Toolbar } from './Toolbar.js'
import { DataControlGrid } from './DataControlGrid.js'
import { PaginationControls } from './PaginationControls.js'

/**
 * DataControl — main orchestrator for data-aware grid/list/form views.
 *
 * Composes Toolbar, DataControlGrid, and PaginationControls into a single widget.
 * Manages view modes, CRUD flows, search, and sort via a pluggable DataProvider.
 *
 * @extends Widget
 * @category Grid
 *
 * @fires DataControl#modeChange  - { mode, previousMode }
 * @fires DataControl#rowClick    - { key, row }
 * @fires DataControl#save        - { data, isNew }
 * @fires DataControl#delete      - { keys }
 * @fires DataControl#dataRefresh - { pageResult }
 *
 * @example
 * const grid = new DataControl({
 *     dataProvider: new JsonDataProvider({ data: myData, keyField: 'id' }),
 *     selectable: true,
 *     showSearch: true
 * })
 * await grid.init()
 * grid.appendTo($('#container'))
 */
export class DataControl extends Widget {
    /** View mode constants */
    static modes = {
        GRID:     'grid',
        LIST:     'list',
        FORM:     'form',
        NEW:      'new',
        EDIT:     'edit',
        DELETE:   'delete'
    }

    /** Default toolbar button sets per mode */
    static modeButtons = {
        grid: [
            { action: 'new',    label: 'New',    icon: 'fas fa-plus',   cls: 'btn-primary' },
            { action: 'edit',   label: 'Edit',   icon: 'fas fa-pen',    disabled: true },
            { action: 'delete', label: 'Delete', icon: 'fas fa-trash',  cls: 'btn-outline-danger', disabled: true },
            { type: 'separator' },
            { action: 'grid',   label: 'Grid',   icon: 'fas fa-table',  disabled: true },
            { action: 'list',   label: 'List',   icon: 'fas fa-list' },
            { action: 'form',   label: 'Form',   icon: 'fas fa-file-alt' }
        ],
        list: [
            { action: 'new',    label: 'New',    icon: 'fas fa-plus',   cls: 'btn-primary' },
            { action: 'edit',   label: 'Edit',   icon: 'fas fa-pen',    disabled: true },
            { action: 'delete', label: 'Delete', icon: 'fas fa-trash',  cls: 'btn-outline-danger', disabled: true },
            { type: 'separator' },
            { action: 'grid',   label: 'Grid',   icon: 'fas fa-table' },
            { action: 'list',   label: 'List',   icon: 'fas fa-list',   disabled: true },
            { action: 'form',   label: 'Form',   icon: 'fas fa-file-alt' }
        ],
        form: [
            { action: 'new',    label: 'New',    icon: 'fas fa-plus',   cls: 'btn-primary' },
            { action: 'edit',   label: 'Edit',   icon: 'fas fa-pen' },
            { action: 'delete', label: 'Delete', icon: 'fas fa-trash',  cls: 'btn-outline-danger' },
            { type: 'separator' },
            { action: 'grid',   label: 'Grid',   icon: 'fas fa-table' },
            { action: 'list',   label: 'List',   icon: 'fas fa-list' },
            { action: 'form',   label: 'Form',   icon: 'fas fa-file-alt', disabled: true }
        ],
        edit: [
            { action: 'save',   label: 'Save',   icon: 'fas fa-save',   cls: 'btn-success' },
            { action: 'cancel', label: 'Cancel', icon: 'fas fa-times',  cls: 'btn-outline-secondary' }
        ]
    }

    static template = `
        <div class="data-control">
            <div class="data-control-header"></div>
            <div class="data-control-body"></div>
            <div class="data-control-footer"></div>
        </div>`

    /**
     * @param {Object} params
     * @param {import('../data/DataProvider.js').DataProvider} params.dataProvider
     * @param {boolean}  [params.selectable=false]   - Enable row checkboxes in grid mode
     * @param {boolean}  [params.showSearch=true]     - Show search input in toolbar
     * @param {string}   [params.initialMode='grid']  - Starting view mode
     * @param {function(Object, import('../data/DataProvider.js').ColumnDef[]):string} [params.formRenderer]
     *        - Custom function to render edit/new form HTML. Receives (record, columns).
     *          If not provided, uses built-in auto-form rendering.
     */
    constructor(params = {}) {
        super({ template: DataControl.template, autoInit: false, ...params })
        this._dataProvider = params.dataProvider
        this._selectable = params.selectable || false
        this._showSearch = params.showSearch !== false
        this._mode = params.initialMode || DataControl.modes.GRID
        this._formRenderer = params.formRenderer || null
        this._currentPageResult = null
        this._editKey = null
    }

    async init() {
        Widget.loadCss('../css/grid/data-control.css', import.meta.url)

        // Create sub-widgets
        this._toolbar = new Toolbar({
            buttons: DataControl.modeButtons[this._mode] || DataControl.modeButtons.grid,
            showSearch: this._showSearch,
            autoInit: false
        })

        this._grid = new DataControlGrid({
            dataProvider: this._dataProvider,
            selectable: this._selectable,
            autoInit: false
        })

        this._pagination = new PaginationControls({ autoInit: false })

        // Init sub-widgets
        await this._toolbar.init()
        await this._grid.init()
        await this._pagination.init()

        // Mount sub-widgets
        this.add(this._toolbar)
        this._toolbar.appendTo(this.find('.data-control-header'))

        this.add(this._grid)
        this._grid.appendTo(this.find('.data-control-body'))

        this.add(this._pagination)
        this._pagination.appendTo(this.find('.data-control-footer'))

        // Wire events
        this._toolbar.on('action', (data) => this._onToolbarAction(data.action))
        this._toolbar.on('search', (data) => this._onSearch(data.query))
        this._grid.on('rowClick', (data) => this._onRowClick(data))
        this._grid.on('sortChange', (data) => this._onSortChange(data))
        this._grid.on('selectChange', (data) => this._onSelectionChange(data))
        this._pagination.on('navigate', (data) => this._onPaginate(data.action))

        // Listen for data changes (save/delete from external code)
        this._dataProvider.onDataChange(() => this.refresh())

        // Initial render
        await this.refresh()
    }

    // ─── Public API ──────────────────────────────────────────────

    /**
     * Refresh the current view with fresh data.
     * @returns {Promise<void>}
     */
    async refresh() {
        if (this._mode === DataControl.modes.NEW || this._mode === DataControl.modes.EDIT) return

        const pageResult = await this._dataProvider.getPage()
        this._currentPageResult = pageResult
        this._grid.setPageResult(pageResult)

        const viewMode = this._mode === DataControl.modes.FORM ? 'form'
            : this._mode === DataControl.modes.LIST ? 'list' : 'grid'
        this._grid.renderView(viewMode, pageResult)
        this._pagination.update(pageResult.page, pageResult.totalPages)

        this.emit('dataRefresh', { pageResult })
    }

    /**
     * Switch to a different view mode.
     * @param {string} mode - One of DataControl.modes
     */
    async changeMode(mode) {
        const prev = this._mode
        this._mode = mode

        // Update single-row mode for form view
        this._dataProvider.setSingleRowMode(mode === DataControl.modes.FORM)

        // Update toolbar buttons
        const buttonSet = DataControl.modeButtons[mode] || DataControl.modeButtons.grid
        this._toolbar.setButtons(buttonSet)

        if (mode === DataControl.modes.NEW) {
            this._showNewForm()
        } else if (mode === DataControl.modes.EDIT) {
            // Edit handled via _onRowClick → _showEditForm
        } else {
            this._pagination.show()
            await this.refresh()
        }

        this.emit('modeChange', { mode, previousMode: prev })
    }

    /** @returns {string} Current mode */
    getMode() { return this._mode }

    /** @returns {import('../data/DataProvider.js').DataProvider} */
    getDataProvider() { return this._dataProvider }

    // ─── Toolbar Actions ─────────────────────────────────────────

    /** @private */
    async _onToolbarAction(action) {
        switch (action) {
            case 'grid':
                await this.changeMode(DataControl.modes.GRID)
                break
            case 'list':
                await this.changeMode(DataControl.modes.LIST)
                break
            case 'form':
                await this.changeMode(DataControl.modes.FORM)
                break
            case 'new':
                await this.changeMode(DataControl.modes.NEW)
                break
            case 'edit': {
                const keys = this._grid.getSelectedKeys()
                if (keys.length === 1) {
                    this._editKey = keys[0]
                    await this._showEditForm(keys[0])
                }
                break
            }
            case 'delete':
                await this._handleDelete()
                break
            case 'save':
                this._handleFormSave()
                break
            case 'cancel':
                await this._handleCancel()
                break
        }
    }

    // ─── Search & Sort ───────────────────────────────────────────

    /** @private */
    async _onSearch(query) {
        this._dataProvider.setQuery(query)
        await this._dataProvider.firstPage()
        await this.refresh()
    }

    /** @private */
    async _onSortChange(sort) {
        this._dataProvider.setSort(sort.order === 'none' ? null : sort)
        await this._dataProvider.firstPage()
        await this.refresh()
    }

    // ─── Row Events ──────────────────────────────────────────────

    /** @private */
    async _onRowClick(data) {
        this.emit('rowClick', data)

        // In form mode, clicking a row opens edit
        if (this._mode === DataControl.modes.FORM) {
            this._editKey = data.key
            await this._showEditForm(data.key)
        }
    }

    /** @private */
    _onSelectionChange(data) {
        const selectedCount = Object.values(data.selected).filter(Boolean).length
        this._toolbar.setEnabled('edit', selectedCount === 1)
        this._toolbar.setEnabled('delete', selectedCount > 0)
    }

    // ─── Pagination ──────────────────────────────────────────────

    /** @private */
    async _onPaginate(action) {
        switch (action) {
            case 'first': await this._dataProvider.firstPage(); break
            case 'prev':  await this._dataProvider.previousPage(); break
            case 'next':  await this._dataProvider.nextPage(); break
            case 'last':  await this._dataProvider.lastPage(); break
        }
        await this.refresh()
    }

    // ─── Form Views ──────────────────────────────────────────────

    /** @private */
    _showNewForm() {
        this._editKey = null
        this._toolbar.setButtons(DataControl.modeButtons.edit)
        this._pagination.hide()

        const columns = this._dataProvider.getColumns()
        const body = this.find('.data-control-body')
        body.empty()

        if (this._formRenderer) {
            body.html(this._formRenderer({}, columns))
        } else {
            body.html(this._buildAutoForm({}, columns))
        }
    }

    /** @private */
    async _showEditForm(key) {
        this._mode = DataControl.modes.EDIT
        this._editKey = key
        this._toolbar.setButtons(DataControl.modeButtons.edit)
        this._pagination.hide()

        const record = await this._dataProvider.getDocument(key)
        const columns = this._dataProvider.getColumns()
        const body = this.find('.data-control-body')
        body.empty()

        if (this._formRenderer) {
            body.html(this._formRenderer(record, columns))
        } else {
            body.html(this._buildAutoForm(record, columns))
        }
    }

    /** @private */
    _buildAutoForm(record, columns) {
        const visibleCols = columns.filter(c => c.visible !== false)
        let html = '<div class="data-control-form"><form>'

        visibleCols.forEach(col => {
            const label = col.title || col.name
            const value = record[col.name] ?? ''
            const escaped = String(value).replace(/"/g, '&quot;')

            html += `
                <div class="mb-3">
                    <label for="field-${col.name}" class="form-label">${label}</label>
                    <input type="text" class="form-control" id="field-${col.name}"
                           name="${col.name}" value="${escaped}">
                </div>`
        })

        html += '</form></div>'
        return html
    }

    /** @private */
    _handleFormSave() {
        const form = this.find('.data-control-form form')
        if (!form.length) return

        const data = {}
        form.find('input, select, textarea').each((_, el) => {
            if (el.name) data[el.name] = $(el).val()
        })

        if (this._editKey) {
            const keyField = this._dataProvider._keyField || 'key'
            data[keyField] = this._editKey
        }

        this._dataProvider.save(data).then(saved => {
            this.emit('save', { data: saved, isNew: !this._editKey })
            this._handleCancel()
        }).catch(err => {
            console.error('Save failed:', err)
        })
    }

    /** @private */
    async _handleCancel() {
        this._editKey = null
        // Restore previous data view
        const body = this.find('.data-control-body')
        body.empty()
        this._grid.appendTo(body)

        await this.changeMode(DataControl.modes.GRID)
        this._grid.clearSelection()
    }

    // ─── Delete ──────────────────────────────────────────────────

    /** @private */
    async _handleDelete() {
        const keys = this._grid.getSelectedKeys()
        if (keys.length === 0) return

        const confirmed = confirm(`Delete ${keys.length} record(s)?`)
        if (!confirmed) return

        for (const key of keys) {
            await this._dataProvider.delete(key)
        }

        this._grid.clearSelection()
        this.emit('delete', { keys })
        await this.refresh()
    }
}
