import { DataProvider } from './DataProvider.js'

/**
 * Scriptr.io data provider for ntelioUI2.
 *
 * Bridges the ntelioUI2 {@link DataProvider} interface to scriptr.io's
 * document store via the ntelioMiddleware OpenAPI REST gateway.
 *
 * API pattern:
 * ```
 * GET  {restApiBaseUrl}/core/v1/dataObject?storeName=X&query=schema="Y"&pageNumber=1&resultsPerPage=20
 * POST {restApiBaseUrl}/core/v1/dataObject          (create/update via FormData)
 * DELETE {restApiBaseUrl}/core/v1/dataObject/{key}?storeName=X
 * ```
 *
 * @extends DataProvider
 *
 * @example
 * import { ScriptrDataProvider } from './data/ScriptrDataProvider.js'
 * import { DataControl } from './grid/DataControl.js'
 *
 * const provider = new ScriptrDataProvider({
 *     authProvider: myScriptrAuth,   // ScriptrAuthProvider instance
 *     schema: 'contact',
 *     store: 'myAppStore',
 *     columns: [
 *         { name: 'firstName', title: 'First Name' },
 *         { name: 'lastName', title: 'Last Name' },
 *         { name: 'email', title: 'Email' }
 *     ]
 * })
 *
 * const grid = new DataControl({ dataProvider: provider })
 * grid.appendTo('#container')
 *
 * @category Data
 */
export class ScriptrDataProvider extends DataProvider {

    /** @type {import('./ScriptrAuthProvider.js').ScriptrAuthProvider} */
    _auth = null

    /** @type {string} scriptr.io document schema name */
    _schema = ''

    /** @type {string} scriptr.io store name */
    _store = ''

    /** @type {import('./DataProvider.js').ColumnDef[]} */
    _columns = []

    /** @type {string} Default sort expression */
    _defaultSort = 'creationDate<date:DESC>'

    /** @type {number} Total row count from last query */
    _totalRows = 0

    /** @type {number} Total page count from last query */
    _totalPages = 1

    /** @type {string[]} Metadata fields excluded from save operations */
    static RESTRICTED_FIELDS = [
        'schema', 'latest', 'creator', 'lastModifiedDate',
        'lastModifiedBy', 'workflowState', 'creationDate', 'versionNumber'
    ]

    /**
     * @param {Object} config
     * @param {import('./ScriptrAuthProvider.js').ScriptrAuthProvider} config.authProvider - Auth provider for tokens and base URL
     * @param {string} config.schema      - Document schema name (e.g. 'contact')
     * @param {string} config.store       - scriptr.io store name
     * @param {ColumnDef[]} [config.columns] - Column definitions for the grid
     * @param {number} [config.pageSize=20] - Rows per page
     * @param {string} [config.defaultSort] - Sort expression (e.g. 'creationDate<date:DESC>')
     */
    constructor(config = {}) {
        super(config)
        this._auth = config.authProvider
        this._schema = config.schema || ''
        this._store = config.store || ''
        this._columns = config.columns || []
        if (config.defaultSort) this._defaultSort = config.defaultSort
    }

    // ─── DataProvider Abstract Implementations ────────────────────

    /**
     * Fetch a page of documents from scriptr.io.
     * @returns {Promise<import('./DataProvider.js').PageResult>}
     */
    async getPage() {
        const params = new URLSearchParams({
            storeName: this._store,
            pageNumber: this._page,
            resultsPerPage: this.getEffectivePageSize(),
            'fields': '*'
        })

        // Schema filter
        if (this._schema) {
            params.set('query', `schema="${this._schema}"`)
        }

        // Search query — append to existing filter
        if (this._query) {
            const existing = params.get('query') || ''
            const search = this._buildSearchFilter(this._query)
            params.set('query', existing ? `${existing} and (${search})` : search)
        }

        // Sort
        const sort = this._sort
            ? `${this._sort.column}<${this._sort.order === 'desc' ? 'string:DESC' : 'string:ASC'}>`
            : this._defaultSort
        if (sort) params.set('sort', sort)

        const url = `${this._getApiUrl('dataObject')}?${params}`
        const res = await this._fetch('GET', url)

        // Parse scriptr.io / ntelioMiddleware OpenAPI response
        if (res.metadata?.status === 'success') {
            this._totalRows = parseInt(res.result?.count) || 0
            this._totalPages = parseInt(res.metadata.totalPages) || 1
            return {
                rows: res.result?.documents || [],
                page: this._page,
                totalPages: this._totalPages,
                totalRows: this._totalRows
            }
        }

        // Legacy format fallback
        const rows = res.documents || res.result || []
        this._totalRows = res.count || rows.length
        this._totalPages = Math.ceil(this._totalRows / this.getEffectivePageSize()) || 1
        return {
            rows,
            page: this._page,
            totalPages: this._totalPages,
            totalRows: this._totalRows
        }
    }

    /** @returns {Promise<number>} */
    async getNumberOfPages() {
        return this._totalPages
    }

    /** @returns {ColumnDef[]} */
    getColumns() {
        return this._columns
    }

    /**
     * @param {Object} row
     * @returns {string}
     */
    getKey(row) {
        return row.key
    }

    /**
     * Load a single document by key.
     * @param {string} key
     * @returns {Promise<Object>}
     */
    async getDocument(key) {
        const params = new URLSearchParams({
            storeName: this._store,
            fields: '*',
            query: `key="${key}"`
        })
        const url = `${this._getApiUrl('dataObject')}?${params}`
        const res = await this._fetch('GET', url)

        const docs = res.result?.documents || res.documents || []
        return Array.isArray(docs) && docs.length > 0 ? docs[0] : res
    }

    /**
     * Create or update a document.
     * If `data.key` is present, it's an update; otherwise a create.
     * @param {Object} data - Document fields
     * @returns {Promise<Object>}
     */
    async save(data) {
        const formData = new FormData()

        // Add store and schema
        formData.append('storeName', this._store)
        if (this._schema) formData.append('meta.schema', this._schema)

        // Add data fields, excluding restricted metadata
        for (const [k, v] of Object.entries(data)) {
            if (!ScriptrDataProvider.RESTRICTED_FIELDS.includes(k) && v !== undefined && v !== null) {
                formData.append(k, v)
            }
        }

        const url = this._getApiUrl('dataObject')
        const res = await this._fetch('POST', url, formData)

        this._notifyDataChange(data.key ? 'update' : 'create', data)
        return res
    }

    /**
     * Delete a document by key.
     * @param {string} key
     * @returns {Promise<void>}
     */
    async delete(key) {
        const params = new URLSearchParams({ storeName: this._store })
        const url = `${this._getApiUrl('dataObject')}/${encodeURIComponent(key)}?${params}`
        await this._fetch('DELETE', url)
        this._notifyDataChange('delete', { key })
    }

    // ─── Internal Helpers ─────────────────────────────────────────

    /**
     * Build the full API URL for a resource path.
     * @param {string} path - e.g. 'dataObject'
     * @returns {string}
     * @private
     */
    _getApiUrl(path) {
        const base = this._auth?.getRestApiBaseUrl?.()
            || `${this._auth?.getApiBaseUrl?.() || ''}/ntelioMiddleware/server/api`
        return `${base}/core/v1/${path}`
    }

    /**
     * Execute an authenticated fetch request.
     * @param {string} method
     * @param {string} url
     * @param {FormData|string|null} [body]
     * @returns {Promise<Object>}
     * @private
     */
    async _fetch(method, url, body) {
        const headers = {}
        const token = this._auth?.getToken?.()
        if (token) headers['Authorization'] = `Bearer ${token}`

        // Don't set Content-Type for FormData — browser sets boundary automatically
        if (body && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json'
        }

        const opts = { method, headers, credentials: 'include' }
        if (body && method !== 'GET') opts.body = body

        const res = await fetch(url, opts)

        // Handle token expiration
        if (res.status === 401) {
            window.dispatchEvent(new CustomEvent('scriptrTokenExpired', {
                detail: { source: 'ScriptrDataProvider', url }
            }))
            throw new Error('Session expired. Please log in again.')
        }

        const json = await res.json()

        // Unwrap scriptr.io response envelope if present
        if (json.response) return json.response
        return json
    }

    /**
     * Build a text search filter for scriptr.io query syntax.
     * Searches across all visible text columns.
     * @param {string} text
     * @returns {string}
     * @private
     */
    _buildSearchFilter(text) {
        const searchable = this._columns
            .filter(c => c.visible !== false && c.name !== 'key')
            .map(c => c.name)

        if (searchable.length === 0) return `key like "${text}"`

        return searchable
            .map(col => `${col} like "${text}"`)
            .join(' or ')
    }
}
