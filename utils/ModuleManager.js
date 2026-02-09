/**
 * Dynamic ES6 module loader for lazy widget/page loading.
 *
 * Resolves string paths like `"pages/Dashboard"` to ES6 modules via
 * native `import()`, and extracts the named export matching the last
 * path segment. The browser's module loader handles caching automatically.
 *
 * Used internally by Application.js to lazy-load page components from
 * route definitions. Also useful for any container that swaps widgets
 * dynamically at runtime.
 *
 * @example
 * import { ModuleManager } from '../utils/ModuleManager.js'
 *
 * const Dashboard = await ModuleManager.loadWidget(basePath, 'pages/Dashboard')
 * const page = new Dashboard({ title: 'Home' })
 * page.appendTo($('#content'))
 *
 * @example
 * // Dynamic widget map
 * const widgetMap = { chart: 'widgets/ChartWidget', table: 'widgets/TableWidget' }
 * const WidgetClass = await ModuleManager.loadWidget(basePath, widgetMap[type])
 * new WidgetClass().appendTo(container)
 *
 * @category Utilities
 */
export class ModuleManager {

    /**
     * Import an ES6 module by base path and module path.
     *
     * Returns the full module namespace object so the caller can pick
     * any named export.
     *
     * @param {string} basePath - Base URL (typically `Application.classPath` or
     *   `new URL('.', import.meta.url).href`)
     * @param {string} modulePath - Relative module path without `.js` extension
     *   (e.g. `'pages/Dashboard'`, `'lib/helpers'`)
     * @returns {Promise<object>} The module namespace (all named exports)
     * @throws {Error} If the module cannot be fetched or evaluated
     *
     * @example
     * const mod = await ModuleManager.loadModule(basePath, 'pages/Dashboard')
     * // mod.Dashboard is the class, mod.default is the default export (if any)
     */
    static async loadModule(basePath, modulePath) {
        return import(basePath + modulePath + '.js')
    }

    /**
     * Load a widget/page class by path (recommended).
     *
     * Imports the module at `basePath + classPath + '.js'` and returns
     * the named export whose name matches the last segment of `classPath`.
     * For example, `loadWidget(base, 'pages/Dashboard')` returns
     * `module.Dashboard`.
     *
     * @param {string} basePath - Base URL for module resolution
     * @param {string} classPath - Slash-separated path where the last segment
     *   is the class name (e.g. `'pages/Dashboard'`, `'widgets/ChartWidget'`)
     * @returns {Promise<Function>} The widget/page constructor (class)
     * @throws {Error} If the module cannot be loaded or the named export is
     *   not found
     *
     * @example
     * async function showPage(name) {
     *     if (currentPage) currentPage.destroy()
     *     const PageClass = await ModuleManager.loadWidget(basePath, `pages/${name}`)
     *     currentPage = new PageClass({ subPath })
     *     currentPage.appendTo($('#content'))
     * }
     */
    static async loadWidget(basePath, classPath) {
        const module = await ModuleManager.loadModule(basePath, classPath)

        const parts = classPath.split('/')
        const className = parts[parts.length - 1]

        if (!module[className]) {
            throw new Error(
                `ModuleManager: module "${classPath}.js" does not export "${className}". ` +
                `Available exports: ${Object.keys(module).join(', ')}`
            )
        }

        return module[className]
    }

    /**
     * Legacy callback-style loader (backward-compatible with ntelioUI).
     *
     * Prefer {@link ModuleManager.loadModule} or {@link ModuleManager.loadWidget}
     * for new code. Retained so Application.js can use its existing call pattern.
     *
     * @param {string} path - Base path (e.g. `Application.classPath`)
     * @param {string} className - Module path (e.g. `'pages/Dashboard'`)
     * @param {Object} [attrs] - Callback handlers
     * @param {function(object):void} [attrs.onload] - Called with the module
     *   namespace on success
     * @param {function(Error):void} [attrs.onerror] - Called with the error
     *   on failure
     *
     * @example
     * ModuleManager.load(classPath, 'pages/Settings', {
     *     onload: (mod) => new mod.Settings().appendTo($('#app')),
     *     onerror: (err) => console.error(err)
     * })
     */
    static async load(path, className, attrs) {
        try {
            const module = await ModuleManager.loadModule(path, className)
            if (attrs?.onload) attrs.onload(module)
        } catch (e) {
            if (attrs?.onerror) attrs.onerror(e)
        }
    }
}
