/**
 * EventBus - Global pub/sub for cross-widget communication
 *
 * @example
 * import { EventBus } from './core/EventBus.js'
 *
 * // Subscribe
 * EventBus.on('theme:changed', (data) => console.log(data))
 *
 * // Publish
 * EventBus.emit('theme:changed', { theme: 'dark' })
 *
 * // Unsubscribe
 * EventBus.off('theme:changed', handler)
 * @category Core
 */

class EventBusClass {
    /**
     * Create a new EventBus instance with an empty handler registry.
     */
    constructor() {
        /** @type {Object<string, Function[]>} Map of event name to handler arrays */
        this._handlers = {}
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function} handler - Callback function
     * @returns {function} Unsubscribe function
     */
    on(event, handler) {
        if (!this._handlers[event]) {
            this._handlers[event] = []
        }
        this._handlers[event].push(handler)

        // Return unsubscribe function
        return () => this.off(event, handler)
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {function} handler - Callback function
     * @returns {function} Unsubscribe function
     */
    once(event, handler) {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe()
            handler(data)
        })
        return unsubscribe
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {function} handler - Specific handler to remove, or omit to remove all
     */
    off(event, handler) {
        if (!this._handlers[event]) return

        if (handler) {
            this._handlers[event] = this._handlers[event].filter(h => h !== handler)
        } else {
            delete this._handlers[event]
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {any} data - Data to pass to handlers
     */
    emit(event, data) {
        const handlers = this._handlers[event]
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data)
                } catch (e) {
                    console.error(`Error in EventBus handler for "${event}":`, e)
                }
            })
        }
    }

    /**
     * Clear all event handlers
     */
    clear() {
        this._handlers = {}
    }
}

// Export singleton instance
export const EventBus = new EventBusClass()
