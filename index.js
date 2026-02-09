/**
 * ntelioUI2 - Main Entry Point
 *
 * Import everything from here for convenience:
 *   import * as ntelioUI from 'ntelioUI2/index.js'
 *
 * Or import specific modules:
 *   import { Widget } from 'ntelioUI2/core/Widget.js'
 */

// Core
export { Widget } from './core/Widget.js'
export { ResourceLoader } from './core/ResourceLoader.js'
export { EventBus } from './core/EventBus.js'

// Utils
export { UIUtils } from './utils/UIUtils.js'
export { I18n } from './utils/I18n.js'

// Widgets - re-export from category indexes
export * from './widgets/index.js'

// Forms
export * from './forms/index.js'

// Application
export * from './application/index.js'
