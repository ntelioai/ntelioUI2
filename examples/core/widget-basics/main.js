/**
 * Widget Basics Example
 *
 * Demonstrates:
 * - Widget creation with templates
 * - Parent-child relationships
 * - Event system (on, emit, bubbling)
 * - Lifecycle hooks (init, beforeDestroy)
 * - Widget registry
 */
import { Widget } from '../../../core/Widget.js'

/**
 * Log an event entry to the on-screen event log.
 * @param {string} name - Event name
 * @param {*} data - Event data (serialized to JSON)
 */
function logEvent(name, data) {
    const log = document.getElementById('event-log')
    const entry = document.createElement('div')
    entry.className = 'event'
    entry.innerHTML = `<span class="event-name">${name}</span>: <span class="event-data">${JSON.stringify(data)}</span>`
    log.insertBefore(entry, log.firstChild)
}

/**
 * Update the on-screen widget count display from the global registry.
 */
function updateCount() {
    const count = Object.keys(Widget._allWidgets).length
    document.getElementById('widget-count').textContent = count
}

/**
 * A demo widget subclass that demonstrates lifecycle hooks, events,
 * and parent-child relationships.
 * @extends Widget
 */
class DemoWidget extends Widget {
    /**
     * @param {Object} params - Widget configuration
     * @param {string} [params.label='unnamed'] - Display label for this widget
     */
    constructor(params) {
        super({
            template: `
                <div class="demo-widget p-3 mb-2 bg-light border rounded">
                    <strong>Widget #{{widgetId}}</strong>
                    <span class="badge bg-secondary ms-2">{{label}}</span>
                    <div class="children mt-2"></div>
                </div>
            `,
            ...params
        })
        this.label = params.label || 'unnamed'
    }

    /**
     * Set up event listeners and log the init lifecycle event.
     * @returns {Promise<void>}
     */
    async init() {
        logEvent('init', { id: this.getId(), label: this.label })

        // Listen for custom events
        this.on('customEvent', (data) => {
            logEvent('customEvent received', { widget: this.getId(), data })
        })
    }

    /**
     * Log the beforeDestroy lifecycle event.
     */
    beforeDestroy() {
        logEvent('beforeDestroy', { id: this.getId() })
    }

    /**
     * Create and attach a child DemoWidget.
     * @param {string} label - Label for the child widget
     * @returns {DemoWidget} The newly created child
     */
    addChild(label) {
        const child = new DemoWidget({ label })
        child.appendTo(this.find('> .children'))
        this._widgets.push(child)
        child._parent = this
        return child
    }
}

// Create parent widget
let parentWidget = null
let childCount = 0

/**
 * Create and mount the parent DemoWidget in the container.
 */
function createParent() {
    parentWidget = new DemoWidget({
        label: 'Parent',
        node: document.getElementById('widget-container')
    })

    // Listen for events bubbling up from children
    parentWidget.on('childAction', (data) => {
        logEvent('bubbled to parent', data)
    })

    updateCount()
    logEvent('created', { id: parentWidget.getId(), label: 'Parent' })
}

// Initialize
createParent()

// Button handlers
document.getElementById('btn-add').addEventListener('click', () => {
    if (!parentWidget || parentWidget._destroyed) {
        logEvent('error', 'Parent widget is destroyed, recreating...')
        createParent()
    }
    childCount++
    const child = parentWidget.addChild(`Child ${childCount}`)
    updateCount()
    logEvent('created', { id: child.getId(), label: `Child ${childCount}` })
})

document.getElementById('btn-destroy-child').addEventListener('click', () => {
    if (!parentWidget || parentWidget._destroyed) {
        logEvent('info', 'No parent widget')
        return
    }
    const children = parentWidget.getWidgets()
    if (children.length > 0) {
        const last = children[children.length - 1]
        const label = last.label
        last.destroy()
        logEvent('destroyed child', { label, remainingChildren: parentWidget.getWidgets().length })
        updateCount()
    } else {
        logEvent('info', 'No children to destroy')
    }
})

document.getElementById('btn-destroy').addEventListener('click', () => {
    if (parentWidget && !parentWidget._destroyed) {
        parentWidget.destroy()
        logEvent('destroyed', { id: 'parent and all children' })
        updateCount()
    } else {
        logEvent('info', 'Parent already destroyed')
    }
})

document.getElementById('btn-emit').addEventListener('click', () => {
    if (parentWidget && !parentWidget._destroyed) {
        const children = parentWidget.getWidgets()
        if (children.length > 0) {
            // Emit from last child, will bubble to parent
            const lastChild = children[children.length - 1]
            lastChild.emit('childAction', {
                from: lastChild.getId(),
                message: 'Hello from child!'
            })
        } else {
            parentWidget.emit('customEvent', { message: 'Hello from parent!' })
        }
    }
})

document.getElementById('btn-refresh').addEventListener('click', updateCount)

// Expose for debugging
window.Widget = Widget
window.parentWidget = parentWidget
window.DemoWidget = DemoWidget

console.log('Widget Basics Example loaded. Check window.Widget and window.parentWidget for debugging.')
