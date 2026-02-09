/**
 * UIUtils - DOM helper utilities
 *
 * Requires jQuery to be loaded via <script> tag
 */
const $ = window.jQuery || window.$

/** @category Utilities */
export class UIUtils {
    /**
     * Disable all interactive elements within a container.
     * Adds the 'disabled' class to the container and sets the disabled attribute
     * on inputs, buttons, selects, textareas, and links.
     *
     * @param {HTMLElement|jQuery} node - Container element
     */
    static disable(node) {
        const $node = node instanceof jQuery ? node : $(node)
        $node.find('input, button, select, textarea, a').attr('disabled', true)
        $node.addClass('disabled')
    }

    /**
     * Enable all interactive elements within a container.
     * Removes the 'disabled' class and the disabled attribute from
     * inputs, buttons, selects, textareas, and links.
     *
     * @param {HTMLElement|jQuery} node - Container element
     */
    static enable(node) {
        const $node = node instanceof jQuery ? node : $(node)
        $node.find('input, button, select, textarea, a').removeAttr('disabled')
        $node.removeClass('disabled')
    }

    /**
     * Generate a unique ID string.
     * @param {string} [prefix='uid'] - Prefix for the generated ID
     * @returns {string} A unique identifier (e.g. 'uid-a1b2c3d4e')
     */
    static uniqueId(prefix = 'uid') {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Escape HTML entities in a string to prevent XSS.
     * @param {string} str - Raw string
     * @returns {string} HTML-safe string
     */
    static escapeHtml(str) {
        const div = document.createElement('div')
        div.textContent = str
        return div.innerHTML
    }

    /**
     * Debounce a function: delays invocation until `wait` ms after the last call.
     * @param {Function} func - Function to debounce
     * @param {number} wait - Delay in milliseconds
     * @returns {Function} Debounced wrapper function
     */
    static debounce(func, wait) {
        let timeout
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout)
                func(...args)
            }
            clearTimeout(timeout)
            timeout = setTimeout(later, wait)
        }
    }

    /**
     * Throttle a function: ensures at most one invocation per `limit` ms.
     * @param {Function} func - Function to throttle
     * @param {number} limit - Minimum interval in milliseconds
     * @returns {Function} Throttled wrapper function
     */
    static throttle(func, limit) {
        let inThrottle
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args)
                inThrottle = true
                setTimeout(() => inThrottle = false, limit)
            }
        }
    }
}
