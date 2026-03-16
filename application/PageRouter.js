/**
 * PageRouter - Hash-based client-side routing
 *
 * Manages URL navigation (#/path), route registration, route-change callbacks,
 * path component parsing, and breadcrumb label mapping.
 *
 * @example
 * PageRouter.registerRoutes({ '/': 'Home', '/about': 'About' })
 * PageRouter.onPageChange((className, subPath) => { ... })
 * PageRouter.navigate('/about')
 * @category Application
 */
export class PageRouter {
    static pathsMap = {}
    static labelsMap = {}
    static currentPath = ''
    static ERR_NOROUTE = 'NoRoute'
    static enabled = true
    static history = []

    /**
     * Navigate to a path. Sets location.hash which triggers popstate/hashchange.
     *
     * @param {string} path - Route path (e.g. '/about', './sub', 'child')
     * @param {string} [parent] - Optional parent context
     * @param {boolean} [reload=true] - If false, updates URL without triggering route handler
     */
    static navigate(path, parent, reload) {
        this.parent = parent

        if (reload === false) {
            history.pushState(null, '', '#/' + parent + '/' + path)
            PageRouter.currentPath = parent + '/' + path
            return
        }

        PageRouter.history.push({ path, parent })

        if (path.startsWith('/')) {
            location.hash = path
        } else if (path.startsWith('./')) {
            const parts = location.hash.split('#')[1].split('/').slice(0, -1)
            const newPath = parts.join('/') + path.substring(1)
            location.hash = newPath
        } else {
            location.hash = location.hash.split('#')[1] + '/' + path
        }
    }

    /**
     * Register a single route.
     * @param {string} path - URL path (e.g. '/about')
     * @param {string} clsName - Class name or action identifier
     * @param {string} [label] - Breadcrumb label for this path
     */
    static registerRoute(path, clsName, label) {
        PageRouter.pathsMap[path] = clsName
        PageRouter.labelsMap[path] = label
    }

    /**
     * Register multiple routes at once.
     * @param {Object} pathMap - { path: className } map
     * @param {Object} [labelsMap] - { path: label } map
     */
    static registerRoutes(pathMap, labelsMap) {
        for (const k in pathMap) {
            PageRouter.registerRoute(k, pathMap[k], labelsMap?.[k] ?? null)
        }
    }

    /**
     * @returns {boolean} True if at root (no hash)
     */
    static isRoot() {
        return location.hash === ''
    }

    /**
     * Resolve the current URL hash to a route. Uses longest-prefix matching.
     *
     * @returns {{ className: string, subPath?: string, error?: string }}
     */
    static getRoute() {
        let path
        const url = location.href
        const hashIndex = url.indexOf('#')

        if (hashIndex === -1) {
            path = '/'
        } else {
            path = url.slice(hashIndex + 1) || '/'
        }

        const pathComponents = path.split('/').filter(Boolean)

        // Special handling for root path
        if (path === '/' && '/' in PageRouter.pathsMap) {
            return { className: PageRouter.pathsMap['/'], path: '/' }
        }

        let bestMatch = ''
        let bestMatchComponents = []

        for (const [mapPath, className] of Object.entries(PageRouter.pathsMap)) {
            const mapComponents = mapPath.split('/').filter(Boolean)

            if (PageRouter._isPathMatch(pathComponents, mapComponents) &&
                mapComponents.length > bestMatchComponents.length) {
                bestMatch = mapPath
                bestMatchComponents = mapComponents
            }
        }

        if (bestMatch) {
            const result = { className: PageRouter.pathsMap[bestMatch], path: bestMatch }
            if (pathComponents.length > bestMatchComponents.length) {
                result.subPath = '/' + pathComponents.slice(bestMatchComponents.length).join('/')
            }
            return result
        }

        return {
            error: PageRouter.ERR_NOROUTE,
            className: null,
            subPath: path
        }
    }

    /**
     * Check if path components match a route pattern (prefix matching).
     * @private
     */
    static _isPathMatch(pathComponents, mapComponents) {
        if (mapComponents.length === 0) return true
        return mapComponents.every((component, index) => component === pathComponents[index])
    }

    /**
     * Get the current path as an array of components.
     * @returns {string[]}
     */
    static getPathComponents() {
        let _path = []
        if (location.hash) _path = location.hash.substring(2).split('/')
        if (this.parent) _path.unshift(this.parent)
        return _path
    }

    /**
     * @private
     */
    static _callHandler(handler) {
        const route = PageRouter.getRoute()
        if (PageRouter.enabled && handler) {
            handler(route.className, route.subPath)
        }
    }

    /**
     * Register a callback for route changes. Fires immediately with current route,
     * then on every subsequent hash change.
     *
     * @param {Function} handler - Callback receiving (className, subPath)
     */
    static onPageChange(handler) {
        PageRouter._callHandler(handler)
        window.addEventListener('popstate', () => {
            PageRouter._callHandler(handler)
        })
    }

    /**
     * Get the label for a given path (as registered via labelsMap).
     * @param {string} path
     * @returns {string|null}
     */
    static getLabel(path) {
        return PageRouter.labelsMap[path] || null
    }

    /**
     * Get the current path string.
     * @returns {string} The current route path
     */
    static getCurrentPath() {
        return PageRouter.currentPath
    }

    /**
     * Get the class name mapped to the current path.
     * @returns {string|undefined} The class name for the current route
     */
    static getCurrentClassName() {
        return PageRouter.pathsMap[PageRouter.currentPath]
    }

    /**
     * Disable route handling. Hash changes will be ignored until {@link enable} is called.
     */
    static disable() {
        PageRouter.enabled = false
    }

    /**
     * Re-enable route handling after a previous {@link disable} call.
     */
    static enable() {
        PageRouter.enabled = true
    }
}
