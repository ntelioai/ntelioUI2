/**
 * Application - Multi-page SPA shell with sidebar navigation and page routing
 *
 * Provides:
 * - Hash-based page routing via PageRouter
 * - Configurable sidebar navigation (VerticalNavbar or custom)
 * - Dynamic page loading via ModuleManager
 * - Footer customization
 * - Optional auth integration (injected, not built-in)
 *
 * @example
 * class MyApp extends Application {
 *     static routesMap = {
 *         '/': 'pages/Dashboard',
 *         '/users': 'pages/Users'
 *     }
 *     static menu = [
 *         { icon: '<svg>...</svg>', label: 'Dashboard', path: '/dashboard' },
 *         { icon: '<svg>...</svg>', label: 'Users', path: '/users' }
 *     ]
 *     static application = {
 *         classPath: new URL('.', import.meta.url).href,
 *         pathMap: MyApp.routesMap,
 *         menu: MyApp.menu,
 *         title: 'My App'
 *     }
 *     constructor() { super(MyApp.application) }
 *     static load() { super.load(MyApp, 'body') }
 * }
 * MyApp.load()
 */
import { Widget } from '../core/Widget.js'
import { ResourceLoader } from '../core/ResourceLoader.js'
import { PageRouter } from './PageRouter.js'
import { PageNotFound } from './PageNotFound.js'
import { ModuleManager } from '../utils/ModuleManager.js'
import { BreadCrumbs } from '../widgets/navigation/BreadCrumbs.js'

const $ = window.jQuery || window.$

/** @category Application */
export class Application extends Widget {
    static currentPage = null

    static template = `
        <div id="page-container" class="ntelioApp">
            <div id="navbar"></div>
            <div id="breadcrumbs"></div>
            <div id="content-wrapper"></div>
            <div id="footer">
                <footer>
                    <div class="container h-100 d-flex align-items-center justify-content-center">
                        <p class="mb-0"></p>
                    </div>
                </footer>
            </div>
        </div>
        <div class="toast-container position-fixed bottom-0 end-0 p-3" id="toast-container"></div>
    `

    /**
     * @param {Object} attrs - Configuration
     * @param {string} attrs.title - Application title
     * @param {Object} attrs.pathMap - Route map { path: className }
     * @param {Object} [attrs.labelsMap] - Breadcrumb labels { path: label }
     * @param {Array}  [attrs.menu] - Sidebar menu items
     * @param {string} [attrs.classPath] - Base URL for dynamic page loading
     * @param {string} [attrs.footer] - Footer HTML
     * @param {Function} [attrs.NavbarCls] - Custom navbar class (default: simple sidebar)
     * @param {string} [attrs.cssClass] - Additional CSS class for the app container
     */
    constructor(attrs = {}) {
        super({ template: Application.template, autoInit: false, ...attrs })

        this.title = attrs.title
        this.menu = attrs.menu || []
        this.bottomMenu = attrs.bottomMenu || []
        this.footer = attrs.footer || '<div class="footer-text">Powered by <a href="https://ntelio.ai" target="_blank">ntelio.ai</a></div>'
        this.classPath = attrs.classPath || ''
        this.NavbarCls = attrs.NavbarCls || null
        this.PageErrorCls = attrs.PageErrorCls || PageNotFound

        if (attrs.pathMap) PageRouter.registerRoutes(attrs.pathMap, attrs.labelsMap)

        if (attrs.cssClass) {
            this.get().addClass(attrs.cssClass)
        }
    }

    /**
     * Initialize the application shell: load CSS, build navbar, breadcrumbs,
     * footer, and start the page router.
     * @returns {Promise<void>}
     */
    async init() {
        await ResourceLoader.loadCss('../css/application/app.css', import.meta.url)

        // Build the navbar if a class was provided
        if (this.NavbarCls) {
            this.navbar = new this.NavbarCls({ title: this.title })
            this.navbar.appendTo(this.find('#navbar'))
            if (this.navbar.init) this.navbar.init()
            if (this.navbar.setMenuItems) {
                this._buildNavbarMenu()
            }
            if (this.bottomMenu.length && this.navbar.setBottomItems) {
                this._buildNavbarMenu(this.bottomMenu, this.navbar.setBottomItems.bind(this.navbar))
            }
        }

        // Build breadcrumbs
        this.breadcrumbs = new BreadCrumbs({ homeUrl: '#/' })
        this.breadcrumbs.appendTo(this.find('#breadcrumbs'))
        await this.breadcrumbs.init()

        // Set footer
        this.setFooterHtml(this.footer)

        // Start page routing
        this._initPageListener()
    }

    /**
     * Build the navbar menu from this.menu config.
     * Can be called again to refresh menu items (e.g. after auth changes).
     */
    _buildNavbarMenu(menuItems, setter) {
        const items = menuItems || this.menu
        const navItems = items.map(item => {
            if (item.type === 'separator') return { type: 'separator' }
            return {
                icon: item.icon,
                label: item.label,
                url: item.path,
                customClickHandler: item.onClick || (() => {
                    PageRouter.navigate(item.path)
                    return false
                })
            }
        })
        const fn = setter || this.navbar.setMenuItems.bind(this.navbar)
        fn(navItems)
    }

    /**
     * Update the sidebar menu items at runtime.
     * @param {Array} items - New menu items array
     */
    setMenu(items) {
        this.menu = items
        if (this.navbar?.setMenuItems) {
            this._buildNavbarMenu(items)
        }
    }

    /**
     * Set footer content.
     * @param {string} html - Footer HTML
     */
    setFooterHtml(html) {
        this.find('#footer .container p').html(html)
    }

    /**
     * Start listening for hash-based route changes.
     * @private
     */
    _initPageListener() {
        PageRouter.onPageChange((className, subPath) => {
            this.changePage(className, subPath)
            this._updateBreadcrumbs()
        })
    }

    /**
     * Update breadcrumbs based on the current hash path and labelsMap.
     * @private
     */
    _updateBreadcrumbs() {
        if (!this.breadcrumbs) return

        const components = PageRouter.getPathComponents()
        const crumbs = []
        let builtPath = ''

        for (const segment of components) {
            if (!segment) continue
            builtPath += '/' + segment
            const label = PageRouter.getLabel(builtPath) || segment.charAt(0).toUpperCase() + segment.slice(1)
            crumbs.push({ label, url: '#' + builtPath })
        }

        this.breadcrumbs.set(crumbs)
    }

    /**
     * Insert a page widget into the content area.
     * @param {Widget} page
     * @private
     */
    _insertPageInDOM(page) {
        page.appendTo(this.find('#content-wrapper'))
    }

    /**
     * Route to a new page. Destroys the current page and loads the next one.
     *
     * The route map value can be:
     * - A class reference (e.g. DashboardPage) → instantiated directly
     * - A string path (e.g. 'pages/Dashboard') → loaded via ModuleManager
     *
     * @param {Function|string|null} pageRef - Page class or module path from the route map
     * @param {string} [subPath] - Extra path components after the matched route
     */
    changePage(pageRef, subPath) {
        if (this.currentPage) {
            this.currentPage.destroy()
            this.currentPage = null
        }

        if (pageRef === null) {
            this.currentPage = new this.PageErrorCls({
                message: `No route found for the current path`
            })
            this._insertPageInDOM(this.currentPage)
            return
        }

        // Class reference — use directly
        if (typeof pageRef === 'function') {
            try {
                this.currentPage = new pageRef({ subPath })
                this._insertPageInDOM(this.currentPage)
                // init() is called automatically by Widget's autoInit (default: true).
                // Do NOT call init() here — it would double-init pages that create child widgets.
            } catch (e) {
                console.error('Application: Error creating page', pageRef.name, e)
                this.currentPage = new this.PageErrorCls({ message: `${e}` })
                this._insertPageInDOM(this.currentPage)
            }
            return
        }

        // String path — load via ModuleManager
        ModuleManager.load(this.classPath, pageRef, {
            onload: (module) => {
                try {
                    const classParts = pageRef.split('/')
                    const classKey = classParts[classParts.length - 1]
                    this.currentPage = new module[classKey]({ subPath })
                    this._insertPageInDOM(this.currentPage)
                } catch (e) {
                    console.error('Application: Error loading page', pageRef, e)
                    this.currentPage = new this.PageErrorCls({ message: `${e}` })
                    this._insertPageInDOM(this.currentPage)
                }
            },
            onerror: (err) => {
                console.error('Application: Module load error', pageRef, err)
                this.currentPage = new this.PageErrorCls({ message: `${err}` })
                this._insertPageInDOM(this.currentPage)
            }
        })
    }

    /**
     * Bootstrap the application. Call from your Main.js entry point.
     *
     * @param {Function} cls - Application subclass constructor
     * @param {string} nodeSelector - CSS selector to mount on (e.g. 'body')
     */
    static load(cls, nodeSelector) {
        $(document).ready(function() {
            const app = new cls()
            app.appendTo(nodeSelector)
            app.init()
        })
    }
}
