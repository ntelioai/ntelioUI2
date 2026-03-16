---
name: framework-guide
description: Semantic guide to ntelioUI2 widgets, patterns, and architecture. Use when deciding which widgets to use, how to compose them, or understanding framework capabilities.
allowed-tools: Glob, Grep, Read
---

# ntelioUI2 Framework Guide

## 1. Framework Overview

ntelioUI2 is a vanilla ES6 widget framework for building SPAs and data-driven UIs. Key characteristics:

- **DOM**: jQuery for DOM manipulation, Bootstrap 5 for styling and utility classes
- **Modules**: Native ES6 modules (`import`/`export`), no bundler required
- **Base class**: All widgets extend `Widget` — provides lifecycle, reactive state, events, and DOM management
- **CSS**: Each widget loads its own CSS lazily via `ResourceLoader.loadCss()` in `init()` — no global stylesheet needed beyond `ntelioUI.css`
- **Routing**: Hash-based (`#/path`) via `PageRouter` — `Application` auto-wires navbar + breadcrumbs + page swapping
- **Data**: Pluggable `DataProvider` abstraction — swap backends without changing widgets
- **Events**: Widget-local `on/emit` with parent bubbling, plus global `EventBus` singleton for cross-widget messaging
- **State**: Reactive state proxy on Widget — property writes trigger debounced `render()` via `requestAnimationFrame`
- **Themes**: CSS custom properties in `:root` (default.css), overridable by scoped themes (liquid-glass.css uses `body[data-nui-theme="glass"]`)
- **Icons**: `Icons.get('name', size)` — 57 built-in Feather-style SVG icons, extensible via `register()`

### Widget Lifecycle
```
constructor(params)  →  init()  →  render()  →  [state changes → render()]  →  beforeDestroy()  →  destroy()
```
- `init()` — async setup: load CSS, fetch data, create child widgets
- `render()` — sync DOM update from state
- `beforeDestroy()` — cleanup: destroy children, remove external listeners
- `destroy()` — recursive teardown, DOM removal, deregistration (auto-called)

---

## 2. Widget Selection Guide

### "I need X" → Use Y

| Requirement | Widget(s) | Notes |
|-------------|-----------|-------|
| **Multi-page SPA** with sidebar nav, routing, breadcrumbs | `Application` + `VerticalNavbar` + `Page` subclasses | Pass `pathMap` (route→Page map), `menu` (sidebar items), `NavbarCls: VerticalNavbar` |
| **Login / authentication flow** | `LoginDialog` + `AuthProvider` subclass | `LoginDialog.open({ authProvider })` returns Promise<profile>. Subclass `AuthProvider` for your backend |
| **CRUD data grid** with search, sort, pagination, inline edit | `DataControl` + `DataProvider` | Composes Toolbar + Grid + Pagination. Modes: grid, list, form, new, edit, delete |
| **Drag-and-drop column board** (Kanban) | `KanbanBoard` | One `DataProvider` per column. Supports groupBy, card selection, drag transfer/reorder |
| **Categorized drag-to-assign board** | `SourceAssignmentBoard` | Source categories on left, assignment lanes on right, trash zone. Takes raw data array (no DataProvider) |
| **Resizable multi-pane layout** | `CollapsiblePane` ×3 (LEFT + CENTER + RIGHT) | Place in a flex row. LEFT/RIGHT are resizable+collapsible, CENTER fills remaining space |
| **Config-driven form** (15 field types, validation) | `Autoform` | Pass `fields[]` with type, label, required, pattern, options. Emits `submit` with validated data |
| **Modal dialog** | `Modal` (custom), `ConfirmDialog` (yes/no), `AlertDialog` (ok) | `body` accepts string, jQuery, or Widget. Emits `confirm`/`close` |
| **Toast notifications** | `Toast` | `Toast.success('Saved!')`, `Toast.error('Failed')`. Auto-dismiss with configurable duration |
| **Breadcrumb navigation** | `BreadCrumbs` | Auto-managed by `Application`. Standalone: `set([{label, url}])` |
| **Sub-navigation sidebar** (settings, categories) | `Sidebar` | Grouped items with active-state highlighting. Emits `select` with URL |
| **Internationalization** | `I18n` | `await I18n.load(basePath)` loads JSON translations. `I18n.t('key', {param})` with interpolation |
| **SVG icons** | `Icons` | `Icons.get('dashboard', 20)` returns SVG string. 57 built-in Feather icons |
| **Cross-widget communication** | `EventBus` | Global pub/sub singleton. Use for unrelated widgets that need to talk |
| **Client-side persistence** | `LocalSessionStorage` | JSON-serialized key-value store backed by localStorage. Namespaced with `ntelio.admin.` prefix |
| **Dynamic module loading** | `ModuleManager` | `loadWidget(basePath, 'path/Widget.js')` for lazy-loaded pages |

### When NOT to Use

- **Don't wrap Bootstrap primitives** in widgets — use Bootstrap classes directly for buttons, badges, alerts, form inputs
- **Don't use `DataControl`** for static content — it's for dynamic data with CRUD. Use plain HTML for static tables
- **Don't use `Application`** for a single-page widget demo — mount widgets directly with `appendTo()` + `init()`
- **Don't use `EventBus`** when parent-child `emit()` suffices — events already bubble up the widget tree
- **Don't use `Autoform`** for a single input field — it's for multi-field forms with validation

---

## 3. Composition Recipes

### Recipe A: SPA with Auth

Full single-page application with login, sidebar navigation, and multiple pages.

```javascript
import { Application, Page, PageRouter, VerticalNavbar, LoginDialog } from 'ntelioUI2'
import { AuthProvider } from 'ntelioUI2'
import { I18n } from 'ntelioUI2'
import { Icons } from 'ntelioUI2'

class MyAuth extends AuthProvider {
    async login({ username, password }) { /* call API, _notifyLogin(profile) */ }
    async logout() { /* clear session, _notifyLogout() */ }
    isAuthenticated() { return !!this._token }
    getToken() { return this._token }
    getUserProfile() { return this._profile }
    async restoreSession() { return false }
}

class DashboardPage extends Page {
    constructor(p) { super({ template: '<div class="page p-4"><h2>Dashboard</h2></div>', ...p }) }
}

class MyApp extends Application {
    constructor(auth) {
        super({
            pathMap: { '/': DashboardPage, '/dashboard': DashboardPage },
            labelsMap: { '/dashboard': 'Dashboard' },
            menu: [
                { icon: Icons.get('dashboard'), label: 'Dashboard', path: '/dashboard' }
            ],
            bottomMenu: [
                { icon: Icons.get('logout'), label: 'Logout', onClick: () => this._logout() }
            ],
            title: 'My App',
            NavbarCls: VerticalNavbar
        })
        this._auth = auth
    }
}

// Bootstrap
const auth = new MyAuth()
await LoginDialog.open({ authProvider: auth, title: 'Login' })
const app = new MyApp(auth)
app.appendTo('body')
app.init()
```

### Recipe B: Data Dashboard Page (CRUD Grid)

Page with a DataControl for viewing/editing records.

```javascript
class UsersPage extends Page {
    constructor(p) {
        super({ template: '<div class="page p-4"><div class="grid-mount"></div></div>', ...p })
    }

    async init() {
        this._dp = new JsonDataProvider({
            data: [...],
            keyField: 'id',
            columns: [
                { name: 'name', title: 'Name', sortable: true },
                { name: 'email', title: 'Email', sortable: true }
            ],
            pageSize: 15
        })

        this._grid = new DataControl({ dataProvider: this._dp, selectable: true, showSearch: true })
        this._grid.appendTo(this.find('.grid-mount'))
        await this._grid.init()

        this._grid.on('save', ({ data }) => Toast.success('Saved'))
        this._grid.on('delete', ({ keys }) => Toast.success(`Deleted ${keys.length} record(s)`))
    }

    beforeDestroy() { this._grid?.destroy() }
}
```

### Recipe C: Kanban Workflow Page

Drag-and-drop board with columns backed by DataProviders.

```javascript
class TasksPage extends Page {
    constructor(p) {
        super({
            template: '<div class="page" style="display:flex;flex-direction:column;height:100%;padding:0;overflow:hidden;"><div class="board-mount" style="flex:1;overflow:hidden;padding:0.75rem;"></div></div>',
            ...p
        })
    }

    async init() {
        this._board = new KanbanBoard({
            columns: [
                { id: 'todo', title: 'To Do', dataProvider: new JsonDataProvider({ data: [...], keyField: 'id', pageSize: 100 }) },
                { id: 'doing', title: 'In Progress', dataProvider: new JsonDataProvider({ data: [...], keyField: 'id', pageSize: 100 }) },
                { id: 'done', title: 'Done', dataProvider: new JsonDataProvider({ data: [...], keyField: 'id', pageSize: 100 }) }
            ],
            cardFields: { title: 'name', subtitle: 'description', badge: 'priority' },
            groupBy: 'priority',
            groupOrder: ['High', 'Medium', 'Low'],
            draggable: true
        })
        this._board.appendTo(this.find('.board-mount'))
        await this._board.init()

        this._board.on('transfer', ({ item, fromColumn, toColumn }) => { /* save to backend */ })
    }

    beforeDestroy() { this._board?.destroy() }
}
```

**Important**: KanbanBoard and SourceAssignmentBoard need a full-height container. Use `display:flex;flex-direction:column;height:100%;overflow:hidden` on the page template, and `flex:1;overflow:hidden` on the mount div.

### Recipe D: Multi-Pane Editor

Three-pane layout with resizable, collapsible side panels.

```javascript
class EditorPage extends Page {
    constructor(p) {
        super({
            template: '<div class="page" style="display:flex;flex-direction:column;height:100%;padding:0;overflow:hidden;"><div class="pane-layout" style="flex:1;display:flex;overflow:hidden;padding:0.75rem;"></div></div>',
            ...p
        })
    }

    async init() {
        const $layout = this.find('.pane-layout')

        this._left = new CollapsiblePane({ title: 'Explorer', dir: CollapsiblePane.LEFT, width: 220, minWidth: 140, maxWidth: 400 })
        this._center = new CollapsiblePane({ title: 'Editor', dir: CollapsiblePane.CENTER })
        this._right = new CollapsiblePane({ title: 'Properties', dir: CollapsiblePane.RIGHT, width: 260, minWidth: 160, maxWidth: 400 })

        this._left.appendTo($layout)
        this._center.appendTo($layout)
        this._right.appendTo($layout)
        await Promise.all([this._left.init(), this._center.init(), this._right.init()])

        this._left.setContent('<ul>...file tree...</ul>')
        this._center.setContent('<div>...editor content...</div>')
        this._right.setContent('<div>...properties panel...</div>')
    }

    beforeDestroy() {
        this._left?.destroy()
        this._center?.destroy()
        this._right?.destroy()
    }
}
```

### Recipe E: Assignment / Categorization UI

Source items organized in categories, drag into assignment lanes.

```javascript
class AssignPage extends Page {
    async init() {
        this._board = new SourceAssignmentBoard({
            sources: [
                { category: 'Group A', items: [{ name: 'Item 1', type: 'X' }, { name: 'Item 2', type: 'Y' }] },
                { category: 'Group B', items: [...] }
            ],
            lanes: [
                { id: 'active', title: 'Active' },
                { id: 'archive', title: 'Archive' }
            ],
            cardFields: { title: 'name', subtitle: 'type', badge: 'type' },
            sourceTitle: 'All Items',
            expandAll: false
        })
        this._board.appendTo(this.find('.mount'))
        await this._board.init()

        this._board.on('assign', ({ item, lane }) => { /* item assigned to lane */ })
        this._board.on('unassign', ({ item, fromLane }) => { /* item returned to source */ })
    }

    beforeDestroy() { this._board?.destroy() }
}
```

### Recipe F: Settings Page with Sub-Navigation

Sidebar categories with swappable content panels.

```javascript
class SettingsPage extends Page {
    async init() {
        this._sidebar = new Sidebar({
            autoInit: false,
            items: [
                { label: 'General', items: [{ label: 'App Name', url: '#general' }, { label: 'Theme', url: '#theme' }] },
                { label: 'Account', items: [{ label: 'Profile', url: '#profile' }] }
            ]
        })
        this._sidebar.appendTo(this.find('.sidebar-slot'))
        await this._sidebar.init()
        this._sidebar.setActive('#general')

        this._sidebar.on('select', (url) => this._showSection(url.replace('#', '')))
        this._showSection('general')
    }

    _showSection(section) {
        const content = this.find('.content-slot')
        if (section === 'general') content.html('<h5>App Name</h5><input class="form-control" value="My App">')
        else if (section === 'theme') content.html('<h5>Theme</h5><select class="form-select">...</select>')
    }
}
```

### Recipe G: Standalone Widget (No SPA)

Mount a widget directly on a plain HTML page — no Application shell needed.

```html
<!-- index.html -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="../../css/ntelioUI.css" rel="stylesheet">
<div id="my-widget"></div>
<script type="module" src="./main.js"></script>
```

```javascript
// main.js
import { KanbanBoard } from '../../widgets/containers/KanbanBoard.js'
import { JsonDataProvider } from '../../data/JsonDataProvider.js'

const board = new KanbanBoard({ columns: [...], cardFields: {...}, draggable: true })
board.appendTo($('#my-widget'))
await board.init()
```

---

## 4. DataProvider Strategy

### Which Provider to Use

| Provider | Backend | Best For |
|----------|---------|----------|
| `JsonDataProvider` | In-memory array, optional localStorage | Demos, prototypes, small datasets (<1000 rows), offline apps |
| `ScriptrDataProvider` | Scriptr.io document store via REST API | Production apps on Scriptr.io platform |
| Custom `DataProvider` subclass | Any REST/GraphQL/Firebase/etc. | Any other backend — override abstract methods |

### Provider ↔ Widget Integration

| Widget | Uses DataProvider? | How |
|--------|-------------------|-----|
| `DataControl` | Yes — primary consumer | `new DataControl({ dataProvider: dp })` — handles grid, list, form, CRUD |
| `KanbanBoard` | Yes — one per column | `columns: [{ id, title, dataProvider }]` — each column has its own provider |
| `SourceAssignmentBoard` | **No** | Takes raw `sources: [{ category, items[] }]` — all client-side |
| `Autoform` | **No** | Takes `fields[]` config, emits `submit` with form data — wire to provider manually |

### Creating a Custom DataProvider

Extend `DataProvider` and implement these methods:

```javascript
import { DataProvider } from '../data/DataProvider.js'

export class MyApiProvider extends DataProvider {
    constructor(params) {
        super(params)  // sets this._pageSize
        this._apiUrl = params.apiUrl
    }

    async getPage() {
        const resp = await fetch(`${this._apiUrl}?page=${this._currentPage}&size=${this._pageSize}&q=${this._query || ''}&sort=${this._sort?.column || ''}`)
        const json = await resp.json()
        return { rows: json.data, page: json.page, totalPages: json.totalPages, totalRows: json.total }
    }

    getColumns() {
        return [
            { name: 'id', title: 'ID', sortable: true },
            { name: 'name', title: 'Name', sortable: true }
        ]
    }

    getKey(row) { return row.id }

    async getDocument(key) {
        const resp = await fetch(`${this._apiUrl}/${key}`)
        return resp.json()
    }

    async save(data) {
        const method = data.id ? 'PUT' : 'POST'
        const resp = await fetch(this._apiUrl, { method, body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } })
        const saved = await resp.json()
        this._notifyDataChange()
        return saved
    }

    async delete(key) {
        await fetch(`${this._apiUrl}/${key}`, { method: 'DELETE' })
        this._notifyDataChange()
    }

    async getNumberOfPages() {
        const result = await this.getPage()
        return result.totalPages
    }
}
```

### JsonDataProvider Options

```javascript
new JsonDataProvider({
    data: [{ id: '1', name: 'Alice' }],  // Initial data array
    keyField: 'id',                        // Unique key field (default: 'key')
    columns: [                             // Optional — auto-derived from data if omitted
        { name: 'name', title: 'Full Name', sortable: true, width: '200px' }
    ],
    pageSize: 20,                          // Rows per page (default: 20)
    storageKey: 'my-data'                  // Optional: persist to localStorage
})
```

---

## 5. Full API Quick-Reference

### Core

**Widget** | `core/Widget.js` | Base class for all widgets
```
Constructor: { template, templateName, templateNode, node, state, autoInit=true, register=true, onDestroy, onRender }
Methods:     init(), render(), beforeDestroy(), destroy(), appendTo(node), replaceNode(node),
             add(widget), getWidgets(), clear(), find(selector), get(), getNode(), getId(),
             show(duration, handler), hide(duration, handler), disable(), enable(), focus(),
             showLoading(), hideLoading(), setState(partial), getState(),
             on(event, handler), off(event, handler), emit(event, data), once(event, handler)
Static:      loadCss(url, base), loadScript(url, type), parseParams(str, values),
             isWidget(node), getWidgetById(id), getByNode(node)
```

**EventBus** | `core/EventBus.js` | Global pub/sub singleton
```
Methods: on(event, handler)→unsub, off(event, handler?), once(event, handler), emit(event, data), clear()
Usage:   import { EventBus } from '../core/EventBus.js'
```

**ResourceLoader** | `core/ResourceLoader.js` | CSS/JS loading with deduplication
```
Static:  loadCss(url, componentPath)→Promise, loadScript(url, type)→Promise,
         injectCSS(cssString, {id, overwrite})→HTMLStyleElement, isLoaded(url)→boolean
```

### Utilities

**I18n** | `utils/I18n.js` | Internationalization
```
Static: setLocale(locale), getLocale(), loadTranslations(locale, obj), load(basePath, locale)→Promise,
        t(key, params), translate(key, params)
```

**UIUtils** | `utils/UIUtils.js` | DOM helpers
```
Static: disable(node), enable(node), uniqueId(prefix), escapeHtml(str), debounce(fn, wait), throttle(fn, limit)
```

**Icons** | `utils/Icons.js` | SVG icon registry (57 built-in)
```
Static: get(name, size=20)→svgString, register(name, svg), registerAll(map), has(name)→bool, names()→string[]
```

**ModuleManager** | `utils/ModuleManager.js` | Dynamic ES6 module loader
```
Static: loadModule(basePath, modulePath)→Promise, loadWidget(basePath, classPath)→Promise<Function>
```

**LocalSessionStorage** | `utils/LocalSessionStorage.js` | localStorage wrapper
```
Static: setItem(key, value), getItem(key, default), has(key), removeItem(key), clear(), keys()
```

### Application

**Application** | `application/Application.js` | extends Widget | SPA shell
```
Constructor: { title, pathMap, labelsMap, menu, bottomMenu, classPath, footer, NavbarCls, PageErrorCls, cssClass }
Methods:     init(), changePage(pageRef, subPath), setMenu(items), setFooterHtml(html)
Static:      load(cls, nodeSelector)
Properties:  currentPage, navbar, breadcrumbs
```

**Page** | `application/Page.js` | extends Widget | Base page class
```
Constructor: { template, subPath }
```

**PageRouter** | `application/PageRouter.js` | Hash-based router
```
Static: navigate(path, parent?, reload?), registerRoute(path, cls, label), registerRoutes(pathMap, labelsMap),
        getRoute()→{className, subPath, error}, onPageChange(handler), getPathComponents(),
        getLabel(path), getCurrentPath(), getCurrentClassName(), isRoot(), disable(), enable()
```

**VerticalNavbar** | `application/VerticalNavbar.js` | extends Widget | Sidebar nav
```
Constructor: { title }
Methods:     init(), setTheme('light'|'dark'|'glass'), setMenuItems(items), setBottomItems(items)
MenuItem:    { icon, label, url, customClickHandler, type:'separator' }
```

**LoginDialog** | `application/LoginDialog.js` | extends Widget | Auth dialog
```
Constructor: { authProvider, authenticate, title, termsUrl, termsTitle, showRememberMe }
Static:      open(options)→Promise<UserProfile>
```

**PageNotFound** | `application/PageNotFound.js` | extends Widget | 404 page
```
Constructor: { message }
```

### Data

**AuthProvider** | `data/AuthProvider.js` | Abstract auth base
```
Abstract: login(credentials)→Promise, logout()→Promise, isAuthenticated()→bool,
          getToken()→string, getUserProfile()→object, restoreSession()→Promise<bool>
Methods:  onLogin(handler)→unsub, onLogout(handler)→unsub, _notifyLogin(profile), _notifyLogout()
```

**DataProvider** | `data/DataProvider.js` | Abstract data source
```
Constructor: { pageSize=20 }
Abstract:    getPage()→Promise<PageResult>, getNumberOfPages(), getColumns(), getKey(row),
             getDocument(key)→Promise, save(data)→Promise, delete(key)→Promise
Methods:     firstPage(), previousPage(), nextPage(), lastPage(), goToPage(n),
             setQuery(q), getQuery(), setSort({column, order}), getSort(),
             setSingleRowMode(bool), getEffectivePageSize(),
             onPageChange(handler), onDataChange(handler)
PageResult:  { rows, page, totalPages, totalRows }
```

**JsonDataProvider** | `data/JsonDataProvider.js` | extends DataProvider | In-memory
```
Constructor: { data, keyField='key', columns?, pageSize=20, storageKey? }
Methods:     (all DataProvider methods) + getTotalCount(), setData(data)
```

**ScriptrAuthProvider** | `data/ScriptrAuthProvider.js` | extends AuthProvider | Scriptr.io auth
```
Constructor: { serverUrl, anonymousToken, multiTenant=false }
Methods:     (all AuthProvider methods) + getApiBaseUrl(), getRestApiBaseUrl()
```

**ScriptrDataProvider** | `data/ScriptrDataProvider.js` | extends DataProvider | Scriptr.io store
```
Constructor: { authProvider, schema, store, columns, pageSize=20, defaultSort? }
```

### Grid

**DataControl** | `grid/DataControl.js` | extends Widget | CRUD orchestrator
```
Constructor: { dataProvider, selectable=false, showSearch=true, initialMode='grid', formRenderer? }
Methods:     init(), refresh(), changeMode(mode), getMode(), getDataProvider()
Events:      modeChange→{mode, previousMode}, rowClick→{key, row}, save→{data, isNew},
             delete→{keys}, dataRefresh→{pageResult}
Modes:       'grid', 'list', 'form', 'new', 'edit', 'delete'
```

**DataControlGrid** | `grid/DataControlGrid.js` | extends Widget | View renderer
```
Constructor: { dataProvider, selectable=false }
Methods:     renderView(mode, pageResult), getSelectedKeys(), clearSelection(), setPageResult(pr)
Events:      rowClick→{key, row}, sortChange→{column, order}, selectChange→{selected}
```

**PaginationControls** | `grid/PaginationControls.js` | extends Widget
```
Methods: update(page, totalPages)
Events:  navigate→{action, page}
```

**Toolbar** | `grid/Toolbar.js` | extends Widget
```
Constructor: { buttons, showSearch=true }
Methods:     setEnabled(action, enabled), setButtons(buttons)
Events:      action→{action}, search→{query}
```

### Widgets — Dialogs

**Modal** | `widgets/dialogs/Modal.js` | extends Widget
```
Constructor: { title='Dialog', body, confirmLabel, closeLabel, showConfirm=true, showClose=true,
              size=''|'sm'|'lg'|'xl', centered=true, backdrop=true, keyboard=true,
              closeOnConfirm=true, destroyOnClose=true }
Methods:     init(), open(), close(), setTitle(t), setBody(content), showBodyLoading()
Static:      showContent(url, title, options)
Events:      confirm, close, shown, hidden, open
```

**ConfirmDialog** | `widgets/dialogs/Modal.js` | extends Modal | Yes/No dialog
**AlertDialog** | `widgets/dialogs/Modal.js` | extends Modal | OK dialog

### Widgets — Feedback

**Toast** | `widgets/feedback/Toast.js` | extends Widget
```
Constructor: { message, type='info', duration=5000, closable=true }
Methods:     dismiss()
Static:      show(msg, opts), success(msg, opts), error(msg, opts), warning(msg, opts), info(msg, opts)
Events:      show
```

### Widgets — Navigation

**BreadCrumbs** | `widgets/navigation/BreadCrumbs.js` | extends Widget
```
Constructor: { homeUrl?, breadcrumbs? }
Methods:     init(), set(breadcrumbs), add(breadcrumb), clear()
Item:        { label, url }
```

**Sidebar** | `widgets/navigation/Sidebar.js` | extends Widget
```
Constructor: { items, onClick? }
Methods:     init(), setItems(items), setActive(url)
Events:      select→url
Item:        { label, icon?, items: [{ label, url, icon?, disabled? }] }
```

### Widgets — Containers

**CollapsiblePane** | `widgets/containers/CollapsiblePane.js` | extends Widget
```
Constructor: { title, dir=CENTER, width=200, minWidth=100, maxWidth=600, collapsible=true, resizable=true }
Methods:     init(), collapse(force?), isCollapsed(), width(w?), add(widget), setContent(html), clear()
Events:      collapse→{collapsed, width}, expand→{width}, resize→{width}
Constants:   CollapsiblePane.LEFT=1, CENTER=2, RIGHT=3
```

**KanbanBoard** | `widgets/containers/KanbanBoard.js` | extends Widget
```
Constructor: { columns: [{id, title, dataProvider}], cardFields: {title, subtitle, badge},
              groupBy?, groupOrder?, draggable=true }
Methods:     init(), refresh()
Events:      transfer→{item, fromColumn, toColumn}, reorder→{item, column, fromIndex, toIndex},
             select→{item, column}
```

**SourceAssignmentBoard** | `widgets/containers/SourceAssignmentBoard.js` | extends Widget
```
Constructor: { sources: [{category, items[]}], lanes: [{id, title}], cardFields: {title, subtitle, badge},
              sourceTitle?, expandAll=true }
Methods:     init(), getAssignments(), expandAll(), collapseAll()
Events:      assign→{item, lane}, unassign→{item, fromLane}, transfer→{item, fromLane, toLane},
             reorder→{item, lane, fromIndex, toIndex}, trash→{item, fromLane}, search→{query, matchCount}
```

### Widgets — Forms

**Autoform** | `forms/Autoform.js` | extends Widget
```
Constructor: { title, fields: FieldDef[], submitLabel='Submit', secondaryLabel?, secondaryAction='reset',
              showSecondary=true }
Methods:     init(), validate()→errors, reset(), getData()→object, getFormData()→FormData, stringify()→html
Events:      submit→{data, stringified}, skip→{stringified}, reset
Hooks:       onBeforeSubmit(data)→bool, onValidationError(errors)
FieldTypes:  text, password, number, email, textarea, checkbox, rating, select, dropDown,
             range, file, multiDropdown, multiValue, calendar, date
FieldDef:    { name, type, label, value, defaultValue, placeholder, required, disabled,
              minLength, maxLength, pattern, patternMessage, min, max, step,
              options/enum, rows, size, multiple, dateFormat, yearRange, customValidator }
```

---

## 6. Architecture Decisions

| Question | Guidance |
|----------|----------|
| **Application** vs standalone widget? | Use `Application` when you need multi-page routing, sidebar nav, breadcrumbs. Use standalone `appendTo()` + `init()` for single-widget demos or embedding in existing pages |
| **Page subclass** vs inline template? | Always subclass `Page` for routed pages in an Application. Use inline HTML only for static content that never needs lifecycle hooks |
| **`autoInit: false`** vs default? | Use `autoInit: false` only when you need to call `appendTo()` before `init()` (e.g., Sidebar inside a Page). Default `true` is correct for Application's page swapping |
| **`register: false`** when? | For ephemeral/temporary widgets (tests, throwaway modals). Always `register: true` (default) for persistent widgets |
| **Reactive `state`** vs plain `_props`? | Use `state` when value changes should update DOM (counters, flags, lists). Use `_prefixed` properties for config, references, caches that don't drive rendering |
| **`EventBus`** vs widget `emit()`? | Use `emit()` for parent-child communication (it bubbles). Use `EventBus` only for unrelated widgets that can't reach each other via the widget tree |
| **`ResourceLoader.loadCss()`** vs `<link>`? | Use `<link>` in HTML for global styles (ntelioUI.css, Bootstrap). Use `ResourceLoader.loadCss()` in `init()` for widget-specific CSS (ensures deduplication and lazy loading) |
| **Full-height containers**? | Wrap in `display:flex;flex-direction:column;height:100%;overflow:hidden` page template. Give mount div `flex:1;overflow:hidden`. Required for KanbanBoard, SourceAssignmentBoard, CollapsiblePane |

---

## 7. Cross-References

| Skill | Use When |
|-------|----------|
| `anti-patterns` | Writing or reviewing widget code — 15 rules on what NOT to do |
| `code-style` | Naming, formatting, import order, file structure conventions |
| `css-conventions` | CSS class naming (`.nui-*`), custom properties, file locations, loading |
| `common-recipes` | Step-by-step checklists for creating widgets, adding pages, field types |
| `reactive-state` | Deep dive on state proxy, `setState()`, render batching, gotchas |
| `testing-patterns` | Writing browser-based tests with TestRunner and assertions |
| `client-debug` | Playwright debugging workflow for visual/console error checking |
| `jsdoc-conventions` | JSDoc standards, @category values, @example blocks |
