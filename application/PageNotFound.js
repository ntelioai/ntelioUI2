import { Widget } from '../core/Widget.js'
import { ResourceLoader } from '../core/ResourceLoader.js'

/**
 * PageNotFound - 404 error page widget
 *
 * Displays a styled 404 page with an optional custom error message
 * and a link back to the home route. Used by {@link Application}
 * when no route matches the current hash.
 *
 * @extends Widget
 * @category Application
 */
export class PageNotFound extends Widget {
    /**
     * Create a PageNotFound instance.
     *
     * @param {Object} params - Configuration object
     * @param {string} [params.message] - Custom error message (logged to console)
     */
    constructor(params = {}) {
        const template = `
            <div class="page-not-found">
                <h1>404</h1>
                <h2>Oops! You've wandered off the map.</h2>
                <p>${params.message || "The page you're looking for doesn't exist."}</p>
                <a href="#/"><i class="fa fa-home" aria-hidden="true"></i> Go Home</a>
            </div>
        `
        super({ template, ...params })

        if (params.message) {
            console.error('PageNotFound:', params.message)
        }
    }

    /**
     * Load the page-not-found CSS stylesheet.
     * @returns {Promise<void>}
     */
    async init() {
        await ResourceLoader.loadCss('../css/application/page-not-found.css', import.meta.url)
    }
}
