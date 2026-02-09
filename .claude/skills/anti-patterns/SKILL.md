---
name: anti-patterns
description: Things to NEVER do in ntelioUI2. Use when writing, reviewing, or fixing code — prevents the most common mistakes with jQuery, Widget lifecycle, imports, CSS, and Bootstrap integration.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Anti-Patterns — Never Do These

These are the most common mistakes when writing code in ntelioUI2. Every item here has caused real bugs.

## 1. Never Import jQuery

jQuery is loaded globally via `<script>` tag. **Never** use an ES import.

```javascript
// ❌ WRONG
import $ from 'jquery'
import jQuery from 'jquery'

// ✅ CORRECT
const $ = window.jQuery || window.$
```

## 2. Never Omit the `.js` Extension

There is no build step. The browser resolves modules directly — it needs the full path.

```javascript
// ❌ WRONG
import { Widget } from '../../core/Widget'

// ✅ CORRECT
import { Widget } from '../../core/Widget.js'
```

## 3. Never Use `document.querySelector` Inside a Widget

Widgets scope DOM queries to their own subtree via `this.find()`. Using `document.querySelector` can grab elements from other widgets or the page.

```javascript
// ❌ WRONG
document.querySelector('.nui-toast-message').textContent = msg

// ✅ CORRECT
this.find('.nui-toast-message').text(msg)
```

## 4. Never Load CSS with `fetch()` or `<link>` Tags

Use `ResourceLoader.loadCss()` — it deduplicates, resolves paths relative to the calling module, and tracks loaded stylesheets.

```javascript
// ❌ WRONG
const link = document.createElement('link')
link.href = '../../css/widgets/feedback/toast.css'
document.head.appendChild(link)

// ✅ CORRECT
await ResourceLoader.loadCss('../../css/widgets/feedback/toast.css', import.meta.url)
```

## 5. Never Use Absolute Paths in Imports

All imports use relative paths from the current file. No aliases, no path mapping, no bare specifiers.

```javascript
// ❌ WRONG
import { Widget } from '/ntelioUI2/core/Widget.js'
import { Widget } from '@core/Widget.js'

// ✅ CORRECT
import { Widget } from '../../core/Widget.js'
```

## 6. Never `find()` Without Considering Child Widgets

`this.find('.class')` searches the entire widget subtree, including nested child widgets. If your widget contains child widgets, use the direct-child combinator.

```javascript
// ❌ Matches buttons inside child widgets too
this.find('.btn-save')

// ✅ Matches only direct child buttons
this.find('> .btn-save')

// ✅ Or scope to a known container
this.find('.nui-my-header > .btn-save')
```

## 7. Never Wrap Bootstrap Primitives in Widgets

Bootstrap 5.3 is loaded globally. Buttons, badges, alerts, spinners, cards, form inputs — use them directly in templates. **Only create a Widget when you need:** lifecycle, internal state, custom events, or a public API.

```javascript
// ❌ WRONG — Don't create ButtonWidget, BadgeWidget, SpinnerWidget
export class ButtonWidget extends Widget {
    constructor(params) {
        super({ template: `<button class="btn btn-primary">${params.label}</button>` })
    }
}

// ✅ CORRECT — Just use Bootstrap classes in your template
const template = `
    <div class="nui-toolbar">
        <button class="btn btn-primary">Save</button>
        <span class="badge bg-success">Active</span>
    </div>
`
```

## 8. Never Forget `register: false` for Ephemeral Widgets

Widgets that self-destruct after use (Toast, LoginDialog) must opt out of the global registry to avoid leaking memory.

```javascript
// ❌ WRONG — Toast stays in Widget._allWidgets forever
super({ template })

// ✅ CORRECT
super({ template, register: false })
```

## 9. Never Call `init()` on Auto-Init Widgets

Widgets created with default `autoInit: true` will have `init()` called automatically. Calling it manually runs initialization twice.

```javascript
// ❌ WRONG — double init
const toast = new Toast({ message: 'Hi' })
await toast.init()  // init() already ran in constructor

// ✅ CORRECT — let autoInit handle it
const toast = new Toast({ message: 'Hi' })

// ✅ OR explicitly control it
const toast = new Toast({ message: 'Hi', autoInit: false })
await toast.init()  // you own the timing
```

## 10. Never Mutate `_widgets` During Iteration

The parent-child array changes during `destroy()`. Always spread-copy.

```javascript
// ❌ WRONG — array mutates as children are destroyed
this._widgets.forEach(child => child.destroy())

// ✅ CORRECT
;[...this._widgets].forEach(child => child.destroy())
```

## 11. Never Use Wrong `import.meta.url` Base for CSS

The second argument to `ResourceLoader.loadCss()` MUST be `import.meta.url` of the **calling module**, not a different module. Wrong base = silent 404.

```javascript
// ❌ WRONG — base URL is some other module
await ResourceLoader.loadCss('../../css/dialogs/modal.css', someOtherUrl)

// ✅ CORRECT
await ResourceLoader.loadCss('../../css/dialogs/modal.css', import.meta.url)
```

## 12. Never Pre-Create Empty Folders

Don't create placeholder directories for future widgets. Create the folder when the first file goes in.

## 13. Never Use `var`

Always `const`, or `let` when reassignment is needed.

## 14. Never Add Semicolons

The project uses ASI (Automatic Semicolon Insertion) consistently. Adding semicolons breaks style consistency.

## 15. Never Confuse Modal Events

`confirm` fires when the user clicks the confirm button. `close` fires when the user dismisses (X, backdrop, escape, or close button). They are mutually exclusive for a given interaction.

```javascript
// ❌ WRONG — treating close as "confirmed and then closed"
modal.on('close', () => saveData())

// ✅ CORRECT
modal.on('confirm', () => saveData())
modal.on('close', () => discardChanges())
```
