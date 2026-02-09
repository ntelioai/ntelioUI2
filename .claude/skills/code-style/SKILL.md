---
name: code-style
description: Enforce ntelioUI2 code style conventions. Use when writing or reviewing any JS, CSS, or HTML in this project — imports, naming, formatting, file structure, quotes, semicolons, etc.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Code Style Conventions

These rules apply to ALL code written in the ntelioUI2 project. Follow them exactly — no exceptions.

## JavaScript Formatting

| Rule | Convention |
|------|-----------|
| Semicolons | **None** — rely on ASI |
| Quotes | **Single quotes** for JS strings; double quotes only inside HTML template literals |
| Indentation | **4 spaces** — no tabs |
| Trailing commas | **None** |
| Braces | K&R style — opening brace on same line: `if (...) {` |
| Blank lines | One blank line between methods; two blank lines before a new section |
| Line length | ~100–120 chars soft max; break for readability |
| Equality | Strict `===`/`!==`; only `== null` for intentional null/undefined coalescing |
| Variables | `const` for everything; `let` only when reassignment is needed; **never `var`** |
| Arrow functions | Preferred for callbacks: `.on('click', () => ...)` |
| Template literals | For HTML templates and interpolated strings; single quotes for plain strings |

## Naming Conventions

| Category | Pattern | Examples |
|----------|---------|---------|
| Classes | PascalCase | `Widget`, `Toast`, `CollapsiblePane` |
| Files (classes) | PascalCase `.js` | `Widget.js`, `Toast.js`, `BreadCrumbs.js` |
| Files (examples) | lowercase | `main.js`, `index.html` |
| Public methods | camelCase | `appendTo()`, `getWidgets()`, `setState()` |
| Private methods | `_camelCase` | `_createStateProxy()`, `_scheduleRender()` |
| Private properties | `_camelCase` | `_widgets`, `_eventHandlers`, `_destroyed` |
| Static properties | camelCase / `_camelCase` | `static widgetId`, `static _allWidgets` |
| Module-level constants | UPPER_SNAKE_CASE | `const ICONS = { ... }` |
| CSS classes | `.nui-{widget}-{element}` | `.nui-toast-message`, `.nui-login-error` |
| CSS custom props | `--nui-{category}-{name}` | `--nui-primary`, `--nui-spacing-sm` |
| Events (widget) | camelCase verbs | `'confirm'`, `'close'`, `'pageChange'` |
| Events (bus) | `namespace:action` | `'theme:changed'`, `'app:ready'` |

## Import Rules

```javascript
// 1. jQuery guard — ALWAYS first line in files that use $
const $ = window.jQuery || window.$

// 2. ES6 named imports with .js extension (mandatory — no build step)
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

// 3. Relative paths only — no aliases, no bare specifiers
// 4. Always include .js extension — browser resolves directly
// 5. jQuery is NEVER an ES import — only window global
```

**Import order:**
1. jQuery guard (if needed)
2. Core imports (`Widget`, `ResourceLoader`, `EventBus`)
3. Other framework imports (widgets, utils)
4. Local/sibling imports

## Section Comments

Use box-drawing characters to divide major sections within a file:

```javascript
// ─── Static API ──────────────────────────────────────────────────────
// ─── Events ──────────────────────────────────────────────────────────
// ─── Private Methods ─────────────────────────────────────────────────
```

## File Structure for a Widget

```javascript
const $ = window.jQuery || window.$

import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

/**
 * MyWidget - Short description.
 * @extends Widget
 * @category Widgets
 */
export class MyWidget extends Widget {

    constructor(params = {}) {
        const template = `<div class="nui-my-widget">...</div>`
        super({ template, ...params })
        // field init only — no logic
    }

    async init() {
        await ResourceLoader.loadCss('../../css/widgets/category/my-widget.css', import.meta.url)
        // setup logic
    }

    render() {
        // DOM updates from state
    }

    beforeDestroy() {
        // cleanup event listeners, intervals, external references
    }
}
```

## Constructor Pattern

```javascript
constructor(params = {}) {
    const defaults = { size: 'md', closable: true }
    const config = { ...defaults, ...params }
    const template = `<div class="nui-widget">...</div>`

    super({ template, autoInit: config.autoInit ?? true, register: true })

    this._config = config
}
```

- Always accept `params = {}` with a default empty object
- Merge defaults with spread, never mutate params
- Pass `template` and lifecycle flags to `super()`
- Store config, never store template-building logic beyond constructor
