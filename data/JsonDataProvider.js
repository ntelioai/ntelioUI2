import { DataProvider } from './DataProvider.js'

/**
 * In-browser JSON data provider for demos and prototyping.
 *
 * Stores data in memory (optionally backed by localStorage).
 * Supports pagination, sorting, text search across all fields,
 * and full CRUD with auto-generated keys.
 *
 * @extends DataProvider
 * @category Data
 *
 * @example
 * const dp = new JsonDataProvider({
 *     data: [
 *         { id: '1', name: 'Alice', email: 'alice@example.com' },
 *         { id: '2', name: 'Bob',   email: 'bob@example.com' }
 *     ],
 *     keyField: 'id',
 *     columns: [
 *         { name: 'name',  title: 'Full Name' },
 *         { name: 'email', title: 'Email Address' }
 *     ],
 *     pageSize: 10
 * })
 */
export class JsonDataProvider extends DataProvider {
    /**
     * @param {Object} config
     * @param {Object[]}    config.data       - Initial array of row objects
     * @param {string}      [config.keyField='key'] - Field name used as unique key
     * @param {ColumnDef[]} [config.columns]  - Column definitions (auto-derived if omitted)
     * @param {number}      [config.pageSize=20]
     * @param {string}      [config.storageKey] - localStorage key for persistence (optional)
     */
    constructor(config = {}) {
        super(config)
        this._keyField = config.keyField || 'key'
        this._columns = config.columns || null
        this._storageKey = config.storageKey || null

        // Load data from localStorage or use provided data
        if (this._storageKey) {
            const stored = localStorage.getItem(this._storageKey)
            this._data = stored ? JSON.parse(stored) : [...(config.data || [])]
        } else {
            this._data = [...(config.data || [])]
        }

        this._nextId = this._data.length + 1
    }

    // ─── Columns ─────────────────────────────────────────────────

    /** @returns {import('./DataProvider.js').ColumnDef[]} */
    getColumns() {
        if (this._columns) return this._columns

        // Auto-derive from first row
        if (this._data.length === 0) return []
        return Object.keys(this._data[0])
            .filter(k => k !== this._keyField)
            .map(name => ({ name, title: name, sortable: true, visible: true }))
    }

    // ─── Data Access ─────────────────────────────────────────────

    getKey(row) {
        return String(row[this._keyField])
    }

    async getDocument(key) {
        const row = this._data.find(r => String(r[this._keyField]) === String(key))
        if (!row) throw new Error(`Record not found: ${key}`)
        return { ...row }
    }

    async save(data) {
        const key = data[this._keyField]

        if (key) {
            // Update existing
            const idx = this._data.findIndex(r => String(r[this._keyField]) === String(key))
            if (idx === -1) throw new Error(`Record not found: ${key}`)
            this._data[idx] = { ...this._data[idx], ...data }
            this._persist()
            this._notifyDataChange('update', this._data[idx])
            return { ...this._data[idx] }
        } else {
            // Create new
            const newRecord = { ...data, [this._keyField]: String(this._nextId++) }
            this._data.push(newRecord)
            this._persist()
            this._notifyDataChange('create', newRecord)
            return { ...newRecord }
        }
    }

    async delete(key) {
        const idx = this._data.findIndex(r => String(r[this._keyField]) === String(key))
        if (idx === -1) throw new Error(`Record not found: ${key}`)
        const removed = this._data.splice(idx, 1)[0]
        this._persist()
        this._notifyDataChange('delete', removed)
    }

    // ─── Pagination ──────────────────────────────────────────────

    async getNumberOfPages() {
        const filtered = this._getFilteredData()
        const size = this.getEffectivePageSize()
        return Math.max(1, Math.ceil(filtered.length / size))
    }

    /** @returns {Promise<import('./DataProvider.js').PageResult>} */
    async getPage() {
        const filtered = this._getFilteredData()
        const sorted = this._applySorting(filtered)
        const size = this.getEffectivePageSize()
        const totalPages = Math.max(1, Math.ceil(sorted.length / size))

        // Clamp page
        if (this._page > totalPages) this._page = totalPages

        const start = (this._page - 1) * size
        const rows = sorted.slice(start, start + size)

        return {
            rows,
            page: this._page,
            totalPages,
            totalRows: sorted.length
        }
    }

    // ─── Internal ────────────────────────────────────────────────

    /** @private */
    _getFilteredData() {
        if (!this._query) return [...this._data]

        const q = this._query.toLowerCase()
        return this._data.filter(row =>
            Object.values(row).some(val =>
                val != null && String(val).toLowerCase().includes(q)
            )
        )
    }

    /** @private */
    _applySorting(data) {
        if (!this._sort || this._sort.order === 'none') return data

        const { column, order } = this._sort
        const dir = order === 'desc' ? -1 : 1

        return [...data].sort((a, b) => {
            const va = a[column] ?? ''
            const vb = b[column] ?? ''

            // Numeric comparison if both are numbers
            if (typeof va === 'number' && typeof vb === 'number') {
                return (va - vb) * dir
            }

            return String(va).localeCompare(String(vb)) * dir
        })
    }

    /** @private */
    _persist() {
        if (this._storageKey) {
            localStorage.setItem(this._storageKey, JSON.stringify(this._data))
        }
    }

    // ─── Utility ─────────────────────────────────────────────────

    /** Get total record count (unfiltered). @returns {number} */
    getTotalCount() {
        return this._data.length
    }

    /** Replace all data. @param {Object[]} data */
    setData(data) {
        this._data = [...data]
        this._page = 1
        this._persist()
    }
}
