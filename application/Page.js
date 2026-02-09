import { Widget } from '../core/Widget.js'

/**
 * Page - Base class for application pages
 *
 * Provides a default template that subclasses override to define
 * page-specific content. Used with {@link Application} and {@link PageRouter}
 * for hash-based SPA routing.
 *
 * @extends Widget
 * @category Application
 */
export class Page extends Widget {
    /** @type {string} Default HTML template shown when a page subclass has no custom template */
    static defaultTemplate = `
        <div class="page">
            <h1>This page hasn't been implemented yet!</h1>
        </div>`

    /**
     * Create a new Page instance.
     *
     * @param {Object} params - Configuration object
     * @param {string} [params.template] - Custom HTML template (falls back to defaultTemplate)
     * @param {string} [params.subPath] - Extra path segments after the matched route
     */
    constructor(params = {}) {
        super({
            template: params.template || Page.defaultTemplate,
            ...params
        })
    }
}
