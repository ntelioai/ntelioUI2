/**
 * VerticalNavbar - Collapsible sidebar navigation widget
 *
 * Features:
 * - Hover-to-expand with icon-only collapsed state
 * - Main menu section + bottom section (for settings, profile, etc.)
 * - Theme switching (light/dark) with localStorage persistence
 * - Two built-in themes: navbar.css (transparent white) and navbar-dark.css (opaque dark)
 *
 * @example
 * const navbar = new VerticalNavbar({ title: 'My App' })
 * navbar.setMenuItems([{ icon: '<svg>…</svg>', label: 'Home', url: '/home' }])
 * navbar.setBottomItems([{ icon: '<svg>…</svg>', label: 'Settings', url: '/settings' }])
 */
import { Widget } from '../core/Widget.js'
import { ResourceLoader } from '../core/ResourceLoader.js'
import { PageRouter } from './PageRouter.js'

const $ = window.jQuery || window.$

/** @category Application */
export class VerticalNavbar extends Widget {
    /**
     * Create a new VerticalNavbar.
     *
     * @param {Object} params - Configuration object
     * @param {string} [params.title='App'] - Application title shown in the sidebar header
     */
    constructor(params = {}) {
        super({
            template: `
                <div class="vertical-navbar">
                    <div class="sidebar-header">
                        <span class="menu-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
                        </span>
                        <span class="menu-label ms-2">${params.title || 'App'}</span>
                    </div>
                    <div class="sidebar-menu"></div>
                    <div class="sidebar-bottom"></div>
                </div>
            `,
            autoInit: false,
            ...params
        })
        this._themeBaseUrl = new URL('../css/application/', import.meta.url).href
    }

    /**
     * Load the sidebar theme CSS and mark the body for sidebar layout.
     * @returns {Promise<void>}
     */
    async init() {
        const saved = localStorage.getItem('nui-sidebar-theme') || 'light'
        await this._loadThemeCss(saved)
        document.body.classList.add('with-sidebar')
    }

    /**
     * Switch sidebar theme and persist to localStorage.
     * @param {'light'|'dark'} theme
     */
    async setTheme(theme) {
        const oldTheme = theme === 'dark' ? 'light' : 'dark'
        const oldUrl = this._getThemeUrl(oldTheme)

        const oldLink = document.querySelector(`link[href="${oldUrl}"]`)
        if (oldLink) oldLink.remove()
        ResourceLoader._loadedResources.delete(oldUrl)

        await this._loadThemeCss(theme)
        localStorage.setItem('nui-sidebar-theme', theme)
    }

    /**
     * Set the main menu items (middle section).
     * @param {Array} items - { icon, label, url, customClickHandler, type }
     */
    setMenuItems(items) {
        this._renderItems(this.find('.sidebar-menu'), items)
    }

    /**
     * Set the bottom menu items (pinned to bottom).
     * @param {Array} items - { icon, label, url, customClickHandler, type }
     */
    setBottomItems(items) {
        this._renderItems(this.find('.sidebar-bottom'), items)
    }

    /** @deprecated Placeholder — not yet implemented. */
    setUserName() {}

    // ── Private ──────────────────────────────────────────────────────

    /**
     * Build the full theme CSS URL for the given theme name.
     * @param {'light'|'dark'} theme - Theme identifier
     * @returns {string} Absolute URL to the theme CSS file
     * @private
     */
    _getThemeUrl(theme) {
        return this._themeBaseUrl + (theme === 'dark' ? 'navbar-dark.css' : 'navbar.css')
    }

    /**
     * Load a theme's CSS stylesheet via ResourceLoader.
     * @param {'light'|'dark'} theme - Theme identifier
     * @returns {Promise<HTMLLinkElement>}
     * @private
     */
    async _loadThemeCss(theme) {
        await ResourceLoader.loadCss(this._getThemeUrl(theme))
    }

    /**
     * Render menu items into a container element.
     * @param {jQuery} container - Target container element
     * @param {Array<{icon?: string, label: string, url?: string, customClickHandler?: Function, type?: string}>} items - Menu item definitions
     * @private
     */
    _renderItems(container, items) {
        container.empty()
        items.forEach(item => {
            if (item.type === 'separator') {
                container.append('<hr class="menu-separator">')
                return
            }
            const el = $(`
                <div class="menu-item" data-url="${item.url || ''}">
                    <div class="menu-icon">${item.icon || ''}</div>
                    <div class="menu-label">${item.label}</div>
                </div>
            `)
            el.click(() => {
                this.find('.menu-item').removeClass('active')
                el.addClass('active')
                if (item.customClickHandler) return item.customClickHandler()
                if (item.url) PageRouter.navigate(item.url)
            })
            container.append(el)
        })
    }
}
