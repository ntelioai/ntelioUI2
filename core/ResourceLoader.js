/**
 * ResourceLoader - Dynamic CSS/JS loading with deduplication
 *
 * @see /plans/widget-modernization-spec.md for full specification
 * @category Core
 */

export class ResourceLoader {
    static _loadedResources = new Set()

    /**
     * Check if a resource URL has already been loaded.
     * @param {string} url - Absolute URL of the resource to check
     * @returns {boolean} True if the resource has been loaded
     */
    static isLoaded(url) {
        return ResourceLoader._loadedResources.has(url)
    }

    /**
     * Load a CSS stylesheet
     * @param {string} url - CSS file path
     * @param {string} componentPath - import.meta.url of calling module (for relative resolution)
     * @returns {Promise<HTMLLinkElement>}
     */
    static async loadCss(url, componentPath) {
        // Resolve relative URL if componentPath provided
        if (componentPath) {
            url = new URL(url, componentPath).href
        }

        // Skip if already loaded
        if (ResourceLoader._loadedResources.has(url)) {
            return Promise.resolve(document.querySelector(`link[href="${url}"]`))
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = url

            link.onload = () => {
                ResourceLoader._loadedResources.add(url)
                // Ensure styles are applied before resolving
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        resolve(link)
                    })
                })
            }

            link.onerror = () => {
                link.remove()
                reject(new Error(`Failed to load CSS: ${url}`))
            }

            document.head.appendChild(link)
        })
    }

    /**
     * Load a JavaScript file
     * @param {string} url - JS file path
     * @param {string} type - Script type (e.g., 'module')
     * @returns {Promise<HTMLScriptElement>}
     */
    static async loadScript(url, type = null) {
        // Skip if already loaded
        if (ResourceLoader._loadedResources.has(url)) {
            return Promise.resolve(document.querySelector(`script[src="${url}"]`))
        }

        const script = document.createElement('script')
        script.src = url

        if (type) {
            script.type = type
        }

        try {
            await new Promise((resolve, reject) => {
                script.onload = () => {
                    ResourceLoader._loadedResources.add(url)
                    resolve()
                }
                script.onerror = () => reject(new Error(`Failed to load script: ${url}`))
                document.head.appendChild(script)
            })
            return script
        } catch (error) {
            script.remove()
            throw error
        }
    }

    /**
     * Inject inline CSS into the document
     * @param {string} cssDefinition - CSS rules as string
     * @param {object} options - { id: string, overwrite: boolean }
     * @returns {HTMLStyleElement|null}
     */
    static injectCSS(cssDefinition, options = {}) {
        const defaults = {
            id: 'dynamic-styles-' + Math.random().toString(36).substr(2, 9),
            overwrite: true
        }
        const settings = { ...defaults, ...options }

        try {
            let styleElement = document.getElementById(settings.id)

            if (styleElement && !settings.overwrite) {
                console.warn('Style element already exists and overwrite is false')
                return null
            }

            if (!styleElement) {
                styleElement = document.createElement('style')
                styleElement.id = settings.id
                document.head.appendChild(styleElement)
            }

            // Clean and validate CSS
            const cleanCSS = cssDefinition
                .trim()
                .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove comments
                .replace(/[\n\r]+/g, ' ')           // Remove newlines
                .replace(/\s+/g, ' ')               // Normalize spaces
                .trim()

            // Validate basic CSS structure
            const openBraces = (cleanCSS.match(/{/g) || []).length
            const closeBraces = (cleanCSS.match(/}/g) || []).length

            if (openBraces !== closeBraces) {
                throw new Error('Invalid CSS: Mismatched braces')
            }

            styleElement.textContent = cleanCSS
            return styleElement

        } catch (error) {
            console.error('Error injecting CSS:', error)
            return null
        }
    }
}
