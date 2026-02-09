/**
 * @typedef {Object} PageResult
 * @property {Object[]} rows       - Array of row objects for the current page
 * @property {number}   page       - Current page number (1-based)
 * @property {number}   totalPages - Total number of pages
 * @property {number}   totalRows  - Total number of rows across all pages
 */

/**
 * @typedef {Object} SortConfig
 * @property {string} column - Column name to sort by
 * @property {'asc'|'desc'|'none'} order - Sort direction
 */

/**
 * @typedef {Object} ColumnDef
 * @property {string}   name       - Field name in row objects
 * @property {string}   [title]    - Display header (defaults to name)
 * @property {function(*, Object):string} [formatter] - Value formatter (value, row) => display string
 * @property {boolean}  [sortable=true] - Whether column supports sorting
 * @property {boolean}  [visible=true]  - Whether column is shown
 * @property {string}   [width]    - CSS width (e.g. '150px', '20%')
 */

/**
 * DataProvider — abstract base class for grid data sources.
 *
 * Subclasses must implement the abstract methods marked with `throw`.
 * All data methods return Promises for consistent async usage.
 *
 * @category Data
 * @abstract
 */
export class DataProvider {
    _page = 1
    _pageSize = 20
    _singleRowMode = false
    _query = ''
    _sort = null
    _listeners = { pageChange: [], dataChange: [] }

    /**
     * @param {Object} [config]
     * @param {number} [config.pageSize=20] - Rows per page
     */
    constructor(config = {}) {
        this._pageSize = config.pageSize || 20
    }

    // ─── Page Navigation ─────────────────────────────────────────

    /** @returns {Promise<PageResult>} */
    async getPage() {
        throw new Error('DataProvider.getPage() must be implemented by subclass')
    }

    /** @returns {number} */
    getPageNumber() { return this._page }

    /** @returns {Promise<number>} */
    async getNumberOfPages() {
        throw new Error('DataProvider.getNumberOfPages() must be implemented by subclass')
    }

    /** Navigate to first page and fire change. @returns {Promise<PageResult>} */
    async firstPage() {
        this._page = 1
        return this._notifyAndFetch()
    }

    /** Navigate to previous page. @returns {Promise<PageResult>} */
    async previousPage() {
        if (this._page > 1) this._page--
        return this._notifyAndFetch()
    }

    /** Navigate to next page. @returns {Promise<PageResult>} */
    async nextPage() {
        const total = await this.getNumberOfPages()
        if (this._page < total) this._page++
        return this._notifyAndFetch()
    }

    /** Navigate to last page. @returns {Promise<PageResult>} */
    async lastPage() {
        this._page = await this.getNumberOfPages()
        return this._notifyAndFetch()
    }

    /** Go to a specific page number. @returns {Promise<PageResult>} */
    async goToPage(page) {
        const total = await this.getNumberOfPages()
        this._page = Math.max(1, Math.min(page, total))
        return this._notifyAndFetch()
    }

    /**
     * Toggle single-row mode (one record per page for form view).
     * @param {boolean} enabled
     */
    setSingleRowMode(enabled) {
        this._singleRowMode = enabled
        this._page = 1
    }

    /** @returns {number} Effective page size (1 in single-row mode) */
    getEffectivePageSize() {
        return this._singleRowMode ? 1 : this._pageSize
    }

    // ─── Columns ─────────────────────────────────────────────────

    /** @returns {ColumnDef[]} */
    getColumns() {
        throw new Error('DataProvider.getColumns() must be implemented by subclass')
    }

    // ─── Data Access ─────────────────────────────────────────────

    /**
     * Extract unique key from a row object.
     * @param {Object} row
     * @returns {string}
     */
    getKey(row) {
        throw new Error('DataProvider.getKey() must be implemented by subclass')
    }

    /**
     * Load a single document by key.
     * @param {string} key
     * @returns {Promise<Object>}
     */
    async getDocument(key) {
        throw new Error('DataProvider.getDocument() must be implemented by subclass')
    }

    /**
     * Save a new or updated record.
     * @param {Object} data - Record data. If `key` property is present, it's an update.
     * @returns {Promise<Object>} Saved record
     */
    async save(data) {
        throw new Error('DataProvider.save() must be implemented by subclass')
    }

    /**
     * Delete a record by key.
     * @param {string} key
     * @returns {Promise<void>}
     */
    async delete(key) {
        throw new Error('DataProvider.delete() must be implemented by subclass')
    }

    // ─── Query & Sort ────────────────────────────────────────────

    /**
     * Apply a filter/search query string.
     * @param {string} query
     */
    setQuery(query) {
        this._query = query
        this._page = 1
    }

    /** @returns {string} Current query string */
    getQuery() { return this._query }

    /**
     * Apply sort configuration.
     * @param {SortConfig} sort
     */
    setSort(sort) {
        this._sort = sort
        this._page = 1
    }

    /** @returns {SortConfig|null} */
    getSort() { return this._sort }

    // ─── Events ──────────────────────────────────────────────────

    /**
     * Register a listener for page changes.
     * @param {function(PageResult):void} handler
     * @returns {function():void} Unsubscribe function
     */
    onPageChange(handler) {
        this._listeners.pageChange.push(handler)
        return () => {
            this._listeners.pageChange = this._listeners.pageChange.filter(h => h !== handler)
        }
    }

    /**
     * Register a listener for data mutations (save/delete).
     * @param {function(string, Object):void} handler - Receives (action, data)
     * @returns {function():void} Unsubscribe function
     */
    onDataChange(handler) {
        this._listeners.dataChange.push(handler)
        return () => {
            this._listeners.dataChange = this._listeners.dataChange.filter(h => h !== handler)
        }
    }

    /** @private */
    async _notifyAndFetch() {
        const result = await this.getPage()
        this._listeners.pageChange.forEach(h => {
            try { h(result) } catch (e) { console.error('pageChange handler error:', e) }
        })
        return result
    }

    /** @private */
    _notifyDataChange(action, data) {
        this._listeners.dataChange.forEach(h => {
            try { h(action, data) } catch (e) { console.error('dataChange handler error:', e) }
        })
    }
}
