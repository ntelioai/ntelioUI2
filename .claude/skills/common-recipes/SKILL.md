---
name: common-recipes
description: Step-by-step recipes for common ntelioUI2 tasks. Use when creating new widgets, adding pages to an Application, creating new Autoform field types, or setting up examples. Each recipe is a complete checklist.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Common Recipes

Complete step-by-step instructions for frequent development tasks.

---

## Recipe 1: Create a New Widget

### Files to create:
1. `widgets/{category}/MyWidget.js` — widget class
2. `css/widgets/{category}/my-widget.css` — styles
3. `examples/widgets/{category}/my-widget/index.html` — demo page
4. `examples/widgets/{category}/my-widget/main.js` — demo script

### Steps:

**1. Create the widget class:**

```javascript
const $ = window.jQuery || window.$

import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

/**
 * MyWidget - Short description of what it does.
 *
 * @extends Widget
 * @category Widgets
 *
 * @example
 * import { MyWidget } from '../widgets/category/MyWidget.js'
 * const w = new MyWidget({ title: 'Hello' })
 * w.appendTo('#container')
 */
export class MyWidget extends Widget {

    constructor(params = {}) {
        const defaults = { title: 'Untitled' }
        const config = { ...defaults, ...params }

        const template = `
            <div class="nui-my-widget">
                <div class="nui-my-widget-header">${config.title}</div>
                <div class="nui-my-widget-body"></div>
            </div>
        `
        super({ template, ...params })
        this._config = config
    }

    async init() {
        await ResourceLoader.loadCss(
            '../../css/widgets/category/my-widget.css',
            import.meta.url
        )
        // bind events, set up children
    }

    render() {
        // update DOM from this.state
    }

    beforeDestroy() {
        // cleanup: remove listeners, null references
    }
}
```

**2. Create the CSS file** at `css/widgets/{category}/my-widget.css`

**3. Export from the category barrel** — add to `widgets/{category}/index.js`:
```javascript
export { MyWidget } from './MyWidget.js'
```

**4. Export from the top-level barrel** — if the category barrel is new, add to `widgets/index.js`:
```javascript
export * from './{category}/index.js'
```

**5. Create the example** — `index.html` + `main.js` in `examples/widgets/{category}/my-widget/`

**6. Add to examples index** — add a `<li>` entry in `examples/index.html` under the appropriate category section

**7. Add JSDoc** — class, constructor, public methods, `@category`, `@example`

**8. Write tests** — `tests/widgets/MyWidget.test.js`, register in `tests/index.html`

---

## Recipe 2: Add a Page to an Application

### In an existing Application subclass:

**1. Create the page module** — e.g., `pages/Settings.js`:

```javascript
import { Page } from '../../application/Page.js'

export default class Settings extends Page {
    constructor(params = {}) {
        const template = `
            <div class="container mt-4">
                <h1>Settings</h1>
                <!-- page content -->
            </div>
        `
        super({ template, ...params })
    }

    async init() {
        // page setup
    }
}
```

**2. Register the route** in the Application subclass:

```javascript
static routesMap = {
    '/': 'pages/Home',
    '/settings': 'pages/Settings'  // ← add this
}
```

**3. Add a menu entry:**

```javascript
static menu = [
    { icon: homeIcon, label: 'Home', path: '/' },
    { icon: gearIcon, label: 'Settings', path: '/settings' }  // ← add this
]
```

Pages are lazy-loaded by `ModuleManager` — the string in `routesMap` is a relative module path resolved from the Application's `classPath`.

---

## Recipe 3: Add a New Autoform Field Type

**1. Create a field renderer function:**

```javascript
function renderMyField(field, uid) {
    return `
        <div class="mb-3">
            <label for="${uid}" class="form-label">${field.label}</label>
            <input type="text" class="form-control"
                   id="${uid}" name="${field.name}"
                   data-custom="${field.customAttr || ''}">
        </div>
    `
}
```

**2. Register the field type:**

```javascript
import { Autoform } from '../forms/Autoform.js'

Autoform.registerFieldType('myfield', renderMyField)
```

**3. Use in a form definition:**

```javascript
const form = new Autoform({
    fields: [
        { name: 'custom', type: 'myfield', label: 'Custom Field', customAttr: 'value' }
    ]
})
```

---

## Recipe 4: Create a Widget with Child Widgets

```javascript
export class Dashboard extends Widget {

    constructor(params = {}) {
        const template = `
            <div class="nui-dashboard">
                <div class="nui-dashboard-sidebar"></div>
                <div class="nui-dashboard-main"></div>
            </div>
        `
        super({ template, ...params })
    }

    async init() {
        await ResourceLoader.loadCss('../../css/widgets/dashboard.css', import.meta.url)

        // Create child widgets — they auto-register as children via appendTo
        this._sidebar = new Sidebar({ items: this._config.navItems })
        this._sidebar.appendTo(this.find('.nui-dashboard-sidebar'))

        this._breadcrumbs = new BreadCrumbs({ items: ['Home'] })
        this._breadcrumbs.appendTo(this.find('.nui-dashboard-main'))
    }

    beforeDestroy() {
        // Children are auto-destroyed when parent is destroyed
        // But null references for GC
        this._sidebar = null
        this._breadcrumbs = null
    }
}
```

**Key points:**
- `appendTo()` on a child auto-sets the parent relationship
- `destroy()` on the parent cascades to all children
- Access children via `this.getWidgets()` or keep named references

---

## Recipe 5: Create an Example Page

### `examples/{category}/my-example/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyWidget Examples - ntelioUI2</title>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="../../../css/ntelioUI.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-4">
        <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="../../index.html">Examples</a></li>
                <li class="breadcrumb-item"><a href="#">Category</a></li>
                <li class="breadcrumb-item active">MyWidget</li>
            </ol>
        </nav>
        <h1>MyWidget Examples</h1>
        <p class="lead">Description of what this example demonstrates.</p>
        <hr>

        <div class="demo-section">
            <h4>1. Basic Usage</h4>
            <div id="demo-container"></div>
        </div>
    </div>
    <script type="module" src="./main.js"></script>
</body>
</html>
```

### `examples/{category}/my-example/main.js`:

```javascript
import { MyWidget } from '../../../widgets/category/MyWidget.js'

const widget = new MyWidget({ title: 'Demo' })
widget.appendTo('#demo-container')
```

### Register in `examples/index.html`:

Add a `<li>` under the appropriate `<div class="category">` section.

---

## Recipe 6: Use EventBus for Cross-Widget Communication

```javascript
import { EventBus } from '../../core/EventBus.js'

// Widget A — publisher
export class ThemeSwitcher extends Widget {
    async init() {
        this.find('.btn-dark').on('click', () => {
            EventBus.emit('theme:changed', { theme: 'dark' })
        })
    }
}

// Widget B — subscriber
export class Header extends Widget {
    async init() {
        this._unsub = EventBus.on('theme:changed', (data) => {
            this.node.toggleClass('dark-mode', data.theme === 'dark')
        })
    }

    beforeDestroy() {
        this._unsub()  // always unsubscribe
    }
}
```

**Always unsubscribe in `beforeDestroy()`** to prevent memory leaks.

---

## Recipe 7: Static Convenience API Pattern

For widgets used as one-shot utilities (dialogs, notifications):

```javascript
export class ConfirmDialog extends Widget {

    /**
     * Show a confirmation dialog and return the user's choice.
     * @param {Object} options
     * @param {string} options.title
     * @param {string} options.message
     * @returns {Promise<boolean>} true if confirmed
     */
    static show(options) {
        return new Promise((resolve) => {
            const dialog = new ConfirmDialog({ ...options, register: false })
            dialog.on('confirm', () => resolve(true))
            dialog.on('close', () => resolve(false))
            dialog.open()
        })
    }
}

// Usage:
const yes = await ConfirmDialog.show({ title: 'Delete?', message: 'Sure?' })
```

Pattern: static method creates instance, wires events to a Promise, returns the Promise.
