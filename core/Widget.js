/**
 * Widget - Base class for all ntelioUI2 widgets
 *
 * @see /plans/widget-modernization-spec.md for full specification
 *
 * IMPORTANT: jQuery must be loaded via <script> tag before using ntelioUI2:
 *   <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
 */
const $ = window.jQuery || window.$
if (!$) {
    throw new Error('ntelioUI2 requires jQuery. Include jQuery via <script> tag before loading ntelioUI2 modules.')
}

import { UIUtils } from '../utils/UIUtils.js'
import { ResourceLoader } from './ResourceLoader.js'

/** @category Core */
export class Widget {
    /** Auto-incrementing counter used to assign unique IDs to widget instances */
    static widgetId = 0

    /** Global registry mapping widgetId → Widget instance. Enables lookup by ID and tracks all live widgets */
    static _allWidgets = {}

    /**
     * Load a CSS stylesheet with deduplication. Convenience wrapper around ResourceLoader.
     * @param {string} url - CSS file path (relative to componentPath)
     * @param {string} componentPath - import.meta.url of the calling module
     * @returns {Promise<HTMLLinkElement>}
     */
    static loadCss(url, componentPath) {
        return ResourceLoader.loadCss(url, componentPath)
    }

    /**
     * Load a JavaScript file with deduplication. Convenience wrapper around ResourceLoader.
     * @param {string} url - JS file URL (CDN or relative path)
     * @param {string} [type] - Script type (e.g., 'module')
     * @returns {Promise<HTMLScriptElement>}
     */
    static loadScript(url, type) {
        return ResourceLoader.loadScript(url, type)
    }

    /** Default HTML template for the loading spinner overlay, used by showLoading() */
    static loadingOverlayTemplate = `
        <div class="widget-loading-overlay">
            <div class="widget-loading-pinwheel"></div>
        </div>
    `

    _widgets = []        // Child widget instances owned by this widget
    _eventHandlers = {}  // Map of event name → array of handler functions
    _parent = null       // Reference to the parent widget (null for root widgets)
    _destroyed = false   // Guard flag to prevent operations on destroyed widgets
    _registered = true   // Whether this widget is tracked in the global _allWidgets registry
    _renderScheduled = false  // Dedup flag for batched state-driven renders

    /**
     * Replace {{key}} placeholders in a string with corresponding values from an object.
     * Used internally for template variable substitution.
     *
     * @param {string} str - Template string containing {{key}} placeholders
     * @param {Object} values - Key-value map of replacements
     * @returns {string} String with placeholders replaced
     */
    static parseParams(str, values) {
        return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => values[key])
    }

    /**
     * Normalize any DOM reference (HTMLElement, jQuery object, or CSS selector string)
     * into a jQuery object. Returns null for null/undefined input.
     * Used internally to accept flexible DOM arguments across the API.
     *
     * @param {HTMLElement|jQuery|string|null} node - DOM reference in any form
     * @returns {jQuery|null} jQuery-wrapped element
     */
    static _$(node) {
        if (node == null) return null
        if (node instanceof jQuery) return node
        if (node instanceof HTMLElement) return $(node)
        if (typeof node === 'string') return $(node)
        return $(node)
    }

    /**
     * Check whether a DOM node is a widget by looking for the widgetId attribute.
     *
     * @param {HTMLElement|jQuery|string} node - DOM reference to check
     * @returns {string|null} The widgetId attribute value, or null if not a widget
     */
    static isWidget(node) {
        const $node = Widget._$(node)
        return $node ? $node.attr('widgetId') : null
    }

    /**
     * Look up a widget instance by its numeric ID from the global registry.
     *
     * @param {number|string} widgetId - The widget's unique ID
     * @returns {Widget|null} The widget instance, or null if not found/unregistered
     */
    static getWidgetById(widgetId) {
        return Widget._allWidgets[widgetId] || null
    }

    /**
     * Find the DOM node for a widget by its ID using a CSS attribute selector.
     * Useful when you have the ID but not the instance.
     *
     * @param {number|string} id - The widget's unique ID
     * @returns {jQuery} jQuery object (may be empty if not in DOM)
     */
    static findWidgetNodeById(id) {
        return $(`[widgetid="${id}"]`)
    }

    /**
     * Get the Widget instance that owns a given DOM node.
     * Reads the widgetId attribute from the node and looks it up in the registry.
     *
     * @param {HTMLElement|jQuery|string} node - A DOM node that may be a widget's root
     * @returns {Widget|null} The owning Widget instance, or null
     */
    static getByNode(node) {
        const widgetId = Widget.isWidget(node)
        return widgetId ? Widget.getWidgetById(widgetId) : null
    }

    /**
     * Construct a new Widget. Handles template parsing, DOM node creation,
     * registry registration, and optional auto-initialization.
     *
     * @param {Object} params - Configuration object
     * @param {string}  [params.template]      - HTML template string with {{key}} placeholders
     * @param {string}  [params.templateName]   - ID of a template element inside #templates container
     * @param {*}       [params.templateNode]   - Existing DOM node to wrap as the widget's root
     * @param {jQuery}  [params.node]           - jQuery object to use as root, OR a plain DOM element to appendTo
     * @param {*}       [params.replaceNode]    - DOM element this widget should replace in the document
     * @param {number}  [params.widgetId]       - Explicit widget ID (auto-assigned if omitted)
     * @param {boolean} [params.register=true]  - Set false to exclude from global registry
     * @param {boolean} [params.autoInit=true]  - Set false to skip automatic init() + render() calls
     * @param {Object}   [params.state]          - Initial reactive state. Writes to this.state trigger debounced render()
     * @param {Function} [params.onDestroy]     - Callback invoked after destroy completes
     * @param {Function} [params.onRender]      - Callback invoked when render() is called
     */
    constructor(params = {}) {
        const template = '<div>ntelioUI2.Widget</div>'
        this.params = params

        // Create the widget's root DOM node from one of several sources (priority order):
        // 1. templateName: clone from a #templates container in the page
        // 2. template: parse an HTML string with {{variable}} substitution
        // 3. templateNode: wrap an existing DOM node
        // 4. node (jQuery): use a jQuery object directly as the root
        // 5. fallback: use a default placeholder div
        if (params.templateName) {
            this.node = $('#templates').find('#' + params.templateName).clone()
        } else if (params.template) {
            const values = { widgetId: Widget.widgetId, ...params }
            delete values.template
            const parsedTemplate = params.template.trim().replace(/\{\{([^}]+)\}\}/g, (match, key) => values[key])
            this._parsedTemplate = parsedTemplate
            this.node = $(parsedTemplate)
        } else if (params.templateNode) {
            this.node = $(params.templateNode)
        } else if (params.node instanceof jQuery) {
            this.node = params.node
        } else {
            this.node = $(template)
        }

        // Assign a unique widget ID and stamp it as a DOM attribute for CSS/lookup
        this._widgetId = params.widgetId || Widget.widgetId++
        this.node.attr('widgetId', this._widgetId)

        // Register in the global widget registry (opt out with register: false)
        this._registered = params.register !== false
        if (this._registered) {
            Widget._allWidgets[this._widgetId] = this
        }

        // Place the widget's DOM node into the document if a target was specified
        if (params.replaceNode) {
            this.replaceNode(params.replaceNode)
        }
        if (params.node && !(params.node instanceof jQuery)) {
            this.appendTo(params.node)
        }

        // Store optional lifecycle callbacks passed via params
        if (params.onDestroy) this.onDestroy = params.onDestroy
        if (params.onRender) this._onRenderCallback = params.onRender

        // Reactive state: wrap in Proxy so writes trigger debounced render()
        if (params.state) {
            this._rawState = { ...params.state }
            this.state = this._createStateProxy(this._rawState)
        }

        // Auto-init: call init() then render() asynchronously unless deferred.
        // Subclasses that need manual control pass autoInit: false and call init() themselves.
        if (params.autoInit !== false) {
            Promise.resolve(this.init()).then(() => {
                this.render()
            })
        }
    }

    // ─── Lifecycle Hooks ───────────────────────────────────────────────

    /**
     * Async initialization hook. Override in subclasses to load data, CSS,
     * or set up state before the widget renders. Called automatically unless
     * autoInit is false.
     */
    async init() {
        // Base implementation does nothing
    }

    /**
     * Render hook. Override in subclasses to populate the widget's DOM after
     * init() completes. Called automatically after init() unless autoInit is false.
     */
    render() {
        if (this._onRenderCallback) this._onRenderCallback(this)
    }

    /**
     * Pre-destroy hook. Override in subclasses to clean up external resources
     * (e.g. dispose Bootstrap components, remove global listeners, cancel timers).
     * Called at the start of destroy() before children are destroyed.
     */
    beforeDestroy() {
        // Base implementation does nothing
    }

    // ─── DOM Methods ───────────────────────────────────────────────────

    /**
     * Append this widget's root node as a child of the given container.
     *
     * @param {HTMLElement|jQuery|string} node - Target container
     */
    appendTo(node) {
        Widget._$(node).append(this.node)
    }

    /**
     * Replace an existing DOM element with this widget's root node.
     *
     * @param {HTMLElement|jQuery|string} node - Element to replace
     */
    replaceNode(node) {
        Widget._$(node).replaceWith(this.node)
    }

    /**
     * Add a child widget: sets parent relationship, appends to DOM, and
     * tracks in the _widgets array for lifecycle management.
     *
     * @param {Widget} widget - Child widget to adopt
     * @returns {Widget} The added child (for chaining)
     */
    add(widget) {
        widget._parent = this
        this.node.append(widget.get())
        this._widgets.push(widget)
        return widget
    }

    /**
     * Return the array of child widget instances owned by this widget.
     *
     * @returns {Widget[]} Direct child widgets
     */
    getWidgets() {
        return this._widgets
    }

    /**
     * Return this widget's root jQuery node. Used when appending to another widget.
     *
     * @returns {jQuery} The widget's root DOM element (jQuery-wrapped)
     */
    get() {
        return this.node
    }

    /**
     * Alias for get(). Returns this widget's root jQuery node.
     *
     * @returns {jQuery} The widget's root DOM element (jQuery-wrapped)
     */
    getNode() {
        return this.node
    }

    /**
     * Return this widget's unique numeric ID.
     *
     * @returns {number} The widget ID
     */
    getId() {
        return this._widgetId
    }

    /**
     * Run a jQuery selector scoped to this widget's root node.
     * IMPORTANT: Use '> .class' (direct child) to avoid matching inside nested child widgets.
     *
     * @param {string} selector - CSS selector
     * @returns {jQuery} Matched elements within this widget's DOM subtree
     */
    find(selector) {
        return this.node.find(selector)
    }

    /**
     * Destroy all child widgets and empty the children array.
     * Does not destroy this widget itself.
     */
    clear() {
        this._widgets.forEach(w => w.destroy())
        this._widgets = []
    }

    /**
     * Hide this widget's root node with an optional jQuery animation.
     *
     * @param {number} [duration] - Animation duration in ms
     * @param {Function} [handler] - Callback when animation completes
     * @returns {Widget} this (for chaining)
     */
    hide(duration, handler) {
        if (handler) this.node.hide(duration, 'swing', handler)
        else this.node.hide(duration, 'swing')
        return this
    }

    /**
     * Show this widget's root node with an optional jQuery animation.
     *
     * @param {number} [duration] - Animation duration in ms
     * @param {Function} [handler] - Callback when animation completes
     * @returns {Widget} this (for chaining)
     */
    show(duration, handler) {
        if (handler) this.node.show(duration, 'swing', handler)
        else this.node.show(duration, 'swing')
        return this
    }

    /**
     * Disable all interactive elements (inputs, buttons, links) within this widget.
     *
     * @returns {Widget} this (for chaining)
     */
    disable() {
        UIUtils.disable(this.node)
        return this
    }

    /**
     * Re-enable all interactive elements within this widget.
     *
     * @returns {Widget} this (for chaining)
     */
    enable() {
        UIUtils.enable(this.node)
        return this
    }

    /**
     * Give keyboard focus to this widget's root node.
     *
     * @returns {Widget} this (for chaining)
     */
    focus() {
        this.node.focus()
        return this
    }

    // ─── Destroy ───────────────────────────────────────────────────────

    /**
     * Guard check: logs a warning and returns true if this widget has been destroyed.
     * Call at the start of methods that should not operate on dead widgets.
     *
     * @returns {boolean} true if destroyed
     */
    _checkDestroyed() {
        if (this._destroyed) {
            console.warn('Attempted operation on destroyed widget:', this._widgetId)
            return true
        }
        return false
    }

    /**
     * Tear down this widget and all its children. Execution order:
     *   1. beforeDestroy() — subclass cleanup hook
     *   2. Clear all event handlers
     *   3. Recursively destroy child widgets (iterates a copy to avoid mutation bugs)
     *   4. Remove self from parent's _widgets array
     *   5. Unregister from the global widget registry
     *   6. Remove the DOM node
     *   7. Fire the onDestroy callback
     *   8. Set the _destroyed flag
     *
     * Safe to call multiple times (no-ops after first call).
     */
    destroy() {
        if (this._destroyed) return

        // 1. Call beforeDestroy hook
        this.beforeDestroy()

        // 2. Clear event handlers
        this._eventHandlers = {}

        // 3. Recursively destroy child widgets (copy array - children splice themselves out during destroy)
        const children = [...this._widgets]
        children.forEach(w => w.destroy())
        this._widgets = []

        // 4. Remove from parent's _widgets array
        if (this._parent) {
            const idx = this._parent._widgets.indexOf(this)
            if (idx > -1) this._parent._widgets.splice(idx, 1)
            this._parent = null
        }

        // 5. Remove from registry
        if (this._registered) {
            delete Widget._allWidgets[this._widgetId]
        }

        // 6. Remove DOM node
        this.node.remove()
        this.node = null

        // 7. Call onDestroy callback
        if (this.onDestroy) this.onDestroy()

        // 8. Mark as destroyed
        this._destroyed = true
    }

    // ─── Reactive State ─────────────────────────────────────────────────

    /**
     * Wrap a plain object in a Proxy that triggers a debounced render()
     * on every property write. Shallow — only top-level props are observed.
     *
     * @param {Object} target - The raw state object
     * @returns {Proxy} Observed state object
     * @private
     */
    _createStateProxy(target) {
        return new Proxy(target, {
            set: (obj, prop, value) => {
                if (obj[prop] !== value) {
                    obj[prop] = value
                    this._scheduleRender()
                }
                return true
            },
            get: (obj, prop) => obj[prop]
        })
    }

    /**
     * Schedule a render() call on the next animation frame.
     * Multiple calls within the same frame are batched into one render.
     * @private
     */
    _scheduleRender() {
        if (this._renderScheduled || this._destroyed) return
        this._renderScheduled = true
        requestAnimationFrame(() => {
            this._renderScheduled = false
            if (!this._destroyed) this.render()
        })
    }

    /**
     * Merge partial state updates and trigger a single render.
     * Use instead of multiple `this.state.x = ...` assignments when
     * you want an explicit batch update.
     *
     * @param {Object} partial - Key-value pairs to merge into state
     */
    setState(partial) {
        if (!this._rawState) return
        Object.assign(this._rawState, partial)
        this._scheduleRender()
    }

    /**
     * Read the current raw state (un-proxied copy).
     * Useful for serialization or passing state to child widgets.
     *
     * @returns {Object|undefined} Shallow copy of state, or undefined if no state
     */
    getState() {
        return this._rawState ? { ...this._rawState } : undefined
    }

    // ─── Event System ──────────────────────────────────────────────────

    /**
     * Subscribe to a widget event. Multiple handlers per event are supported.
     *
     * @param {string} event - Event name (e.g. 'confirm', 'change', 'customEvent')
     * @param {Function} handler - Callback receiving (data, widget)
     * @returns {Function} Unsubscribe function — call it to remove this handler
     */
    on(event, handler) {
        if (!this._eventHandlers[event]) {
            this._eventHandlers[event] = []
        }
        this._eventHandlers[event].push(handler)

        // Return unsubscribe function
        return () => this.off(event, handler)
    }

    /**
     * Remove event handler(s). If handler is provided, removes that specific handler.
     * If handler is omitted, removes ALL handlers for the given event.
     *
     * @param {string} event - Event name
     * @param {Function} [handler] - Specific handler to remove (omit to remove all)
     */
    off(event, handler) {
        if (!this._eventHandlers[event]) return
        if (handler) {
            this._eventHandlers[event] = this._eventHandlers[event].filter(h => h !== handler)
        } else {
            delete this._eventHandlers[event]
        }
    }

    /**
     * Dispatch an event to all registered handlers, then bubble up to the parent widget.
     * Handlers receive (data, emittingWidget). Errors in handlers are caught and logged
     * to prevent one bad handler from breaking others.
     *
     * Bubbling can be stopped by setting data.bubbles = false.
     *
     * @param {string} event - Event name
     * @param {*} [data] - Payload passed to handlers
     */
    emit(event, data) {
        if (this._checkDestroyed()) return

        const handlers = this._eventHandlers[event]
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data, this)
                } catch (e) {
                    console.error(`Error in event handler for "${event}":`, e)
                }
            })
        }

        // Bubble to parent if not stopped
        if (this._parent && data?.bubbles !== false) {
            this._parent.emit(event, data)
        }
    }

    /**
     * Subscribe to an event for a single firing only. The handler automatically
     * unsubscribes after its first invocation.
     *
     * @param {string} event - Event name
     * @param {Function} handler - One-time callback receiving (data, widget)
     * @returns {Function} Unsubscribe function (can cancel before the event fires)
     */
    once(event, handler) {
        const unsubscribe = this.on(event, (data, widget) => {
            unsubscribe()
            handler(data, widget)
        })
        return unsubscribe
    }

    // ─── Loading Overlay ───────────────────────────────────────────────

    /**
     * Show a loading spinner overlay on top of this widget (or a specific child node).
     * Disables interactive elements while loading. Call hideLoading() to dismiss.
     *
     * @param {jQuery} [node] - Target node for the overlay (defaults to this.node)
     * @returns {Widget} this (for chaining)
     */
    showLoading(node) {
        const n = node || this.node
        ResourceLoader.loadCss('css/core/loading.css', import.meta.url)

        if (!this.loadingOverlay) {
            const template = this.loadingOverlayTemplate || Widget.loadingOverlayTemplate
            this.loadingOverlay = $(template)
            n.append(this.loadingOverlay)
        }

        this.loadingOverlay.show()
        this.disable()
        return this
    }

    /**
     * Remove the loading spinner overlay and re-enable interactive elements.
     *
     * @returns {Widget} this (for chaining)
     */
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.hide()
            this.loadingOverlay.remove()
            this.loadingOverlay = null
        }
        this.enable()
        return this
    }
}
