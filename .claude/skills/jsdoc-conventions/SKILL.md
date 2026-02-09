---
name: jsdoc-conventions
description: JSDoc documentation standards for ntelioUI2. Use when adding, editing, or reviewing JSDoc comments — class docs, method signatures, @category tags, @example blocks, and generating docs.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# JSDoc Conventions

ntelioUI2 uses JSDoc with the `better-docs` template and the `category` plugin. All public API must be documented.

## Tooling

- **Config**: `jsdoc.json` at project root
- **Template**: `better-docs` (v2.7.3)
- **Plugin**: `node_modules/better-docs/category`
- **Generate**: `npm run docs` → outputs to `docs/api/`
- **Source includes**: `core`, `application`, `widgets`, `forms`, `utils`, `grid`

## Required Tags by Context

### Class

```javascript
/**
 * Toast - Ephemeral notification messages.
 *
 * @extends Widget
 * @category Widgets
 *
 * @example
 * Toast.success('Saved!')
 * Toast.error('Failed', { duration: 8000 })
 */
export class Toast extends Widget {
```

- First line: `ClassName - Short description.` (dash separator)
- `@extends` for Widget subclasses
- `@category` — one of: **Core**, **Application**, **Widgets**, **Dialogs**, **Forms**, **Utilities**, **Grid**
- `@example` for primary usage pattern

### Constructor

```javascript
/**
 * Create a new Toast instance.
 * @param {Object} params - Configuration options
 * @param {string} params.message - Text to display
 * @param {string} [params.type='info'] - One of 'success', 'error', 'warning', 'info'
 * @param {number} [params.duration=4000] - Auto-dismiss time in ms (0 = permanent)
 */
constructor(params = {}) {
```

- Document all params with `@param {Type} name - Description`
- Optional params: `@param {Type} [name=default]`
- Nested params: `@param {Type} params.key`

### Public Methods

```javascript
/**
 * Dismiss the toast with a fade-out animation.
 * @returns {void}
 */
dismiss() {
```

- Always include `@returns`
- For async methods: `@returns {Promise<Type>}`
- For chainable: `@returns {Widget} this`

### Private Methods

```javascript
/**
 * Schedule a render pass via requestAnimationFrame.
 * @private
 */
_scheduleRender() {
```

- Short description + `@private` — no `@param`/`@returns` needed unless complex

### Static Methods

```javascript
/**
 * Show a success toast.
 * @param {string} message - Text to display
 * @param {Object} [options] - Override defaults
 * @returns {Toast} The created toast instance
 */
static success(message, options = {}) {
```

### Events

```javascript
/**
 * Fired when the modal confirm button is clicked.
 * @event Modal#confirm
 */

/**
 * Open the modal dialog.
 * @fires Modal#confirm
 * @fires Modal#close
 */
open() {
```

## @category Values

Use exactly these values (they map to better-docs sidebar groups):

| Category | Used For |
|----------|----------|
| `Core` | Widget, ResourceLoader, EventBus |
| `Application` | Application, Page, PageRouter, PageNotFound, VerticalNavbar, LoginDialog |
| `Widgets` | BreadCrumbs, Sidebar, CollapsiblePane, Toast |
| `Dialogs` | Modal, ConfirmDialog, AlertDialog |
| `Forms` | Autoform |
| `Utilities` | UIUtils, I18n, ModuleManager |
| `Grid` | DataControl and related grid classes |

## @example Blocks

- Use fenced code style (no `<caption>` tags)
- Show the most common usage, not edge cases
- Include the import statement in the example

```javascript
/**
 * @example
 * import { Toast } from '../widgets/feedback/Toast.js'
 *
 * Toast.success('Item saved')
 * Toast.error('Network failure', { duration: 0 })
 */
```

## What NOT to Document

- Internal helper functions at module scope (not exported)
- Obvious getters/setters (document only if they have side effects)
- Individual HTML elements in templates

## Generating Docs

```bash
npm run docs        # Generate to docs/api/
open docs/api/index.html
```

When adding a new class:
1. Add JSDoc with `@category` to the class
2. Add `@param` to constructor and all public methods
3. Add at least one `@example`
4. Run `npm run docs` to verify it appears in the right category
