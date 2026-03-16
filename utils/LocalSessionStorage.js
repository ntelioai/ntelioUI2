/**
 * LocalSessionStorage — key-value persistence backed by `localStorage`.
 *
 * All keys are automatically prefixed to avoid collisions with other
 * libraries.  Values are JSON-serialized so any serializable type can
 * be stored directly.
 *
 * Designed for subclassing: override the core methods (`setItem`,
 * `getItem`, `removeItem`, `clear`, `keys`) to swap in a server-side
 * backend while keeping the same public API.
 *
 * @category Utilities
 *
 * @example
 * // Store and retrieve a value
 * LocalSessionStorage.setItem('sidebar.collapsed', true)
 * LocalSessionStorage.getItem('sidebar.collapsed', false) // true
 *
 * @example
 * // Subclass with a different prefix
 * class AppStorage extends LocalSessionStorage {
 *     static prefix = 'myapp.'
 * }
 *
 * @example
 * // Subclass with a server backend
 * class ServerStorage extends LocalSessionStorage {
 *     static async setItem(key, value) {
 *         await fetch('/api/storage', {
 *             method: 'POST',
 *             body: JSON.stringify({ key: this.prefix + key, value })
 *         })
 *     }
 * }
 */
export class LocalSessionStorage {

    /**
     * Key prefix applied to every storage operation.
     * @type {string}
     */
    static prefix = 'ntelio.admin.'

    // ─── Write ───────────────────────────────────────────────────

    /**
     * Store a value under the given key.
     * The value is JSON-serialized before writing.
     *
     * @param {string} key   - Storage key (prefix is added automatically)
     * @param {*}      value - Any JSON-serializable value
     */
    static setItem(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value))
        } catch (error) {
            console.error('LocalSessionStorage.setItem:', error)
        }
    }

    // ─── Read ────────────────────────────────────────────────────

    /**
     * Retrieve a previously stored value.
     *
     * @param {string} key            - Storage key
     * @param {*}      [defaultValue] - Returned when the key does not exist
     * @returns {*} The deserialized value, or `defaultValue`
     */
    static getItem(key, defaultValue) {
        try {
            const raw = localStorage.getItem(this.prefix + key)
            return raw !== null ? JSON.parse(raw) : defaultValue
        } catch (error) {
            console.error('LocalSessionStorage.getItem:', error)
            return defaultValue
        }
    }

    /**
     * Check whether a key exists in storage.
     *
     * @param {string} key - Storage key
     * @returns {boolean}
     */
    static has(key) {
        return localStorage.getItem(this.prefix + key) !== null
    }

    // ─── Delete ──────────────────────────────────────────────────

    /**
     * Remove a single key from storage.
     *
     * @param {string} key - Storage key to remove
     */
    static removeItem(key) {
        try {
            localStorage.removeItem(this.prefix + key)
        } catch (error) {
            console.error('LocalSessionStorage.removeItem:', error)
        }
    }

    /**
     * Remove all keys that belong to this storage prefix.
     * Keys from other prefixes are left untouched.
     */
    static clear() {
        try {
            this.keys().forEach(key => localStorage.removeItem(this.prefix + key))
        } catch (error) {
            console.error('LocalSessionStorage.clear:', error)
        }
    }

    // ─── Enumeration ─────────────────────────────────────────────

    /**
     * List all keys stored under this prefix (without the prefix).
     *
     * @returns {string[]} Unprefixed key names
     */
    static keys() {
        const prefixLen = this.prefix.length
        return Object.keys(localStorage)
            .filter(k => k.startsWith(this.prefix))
            .map(k => k.slice(prefixLen))
    }
}
