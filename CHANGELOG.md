# Changelog

All notable changes to ntelioUI2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-09

### Initial Release

ntelioUI2 is a complete rewrite of the original ntelioUI framework, built on jQuery + Bootstrap 5.3 + native ES6 modules with zero build tools.

### Added

#### Core
- **Widget** - Base class with lifecycle hooks, parent-child tree, event system with bubbling, and reactive state proxy
- **ResourceLoader** - Dynamic CSS/JS loading with automatic deduplication
- **EventBus** - Global pub/sub for cross-widget communication

#### Application Framework
- **Application** - Multi-page SPA shell with hash-based routing and sidebar navigation
- **Page** - Base class for routable page components
- **PageRouter** - Hash-based client-side routing with longest-prefix matching
- **PageNotFound** - Styled 404 error page
- **VerticalNavbar** - Collapsible sidebar with light/dark themes and localStorage persistence
- **LoginDialog** - Modal login form with pluggable authentication providers

#### Widgets
- **Navigation**
  - BreadCrumbs - Arrow-shaped breadcrumb trail with slide-in animation
  - Sidebar - Categorical sub-navigation widget for content sections
- **Dialogs**
  - Modal - Bootstrap 5 modal wrapper with promise-based API
  - ConfirmDialog - Simple yes/no confirmation dialog
  - AlertDialog - Single-button alert dialog
- **Feedback**
  - Toast - Ephemeral notification toasts with 4 severity levels
- **Containers**
  - CollapsiblePane - Resizable, collapsible panes for multi-pane layouts

#### Forms
- **Autoform** - Declarative form builder supporting 15 field types with validation, custom renderers, and automatic HTML generation

#### Data & Grid
- **DataProvider** - Abstract base class for grid data sources
- **JsonDataProvider** - In-memory JSON data provider with localStorage persistence, pagination, sorting, and text search
- **AuthProvider** - Abstract authentication provider for pluggable auth backends
- **DataControl** - Complete CRUD grid orchestrator with toolbar, pagination, and multi-view modes (grid/list/form)
- **DataControlGrid** - Responsive data table renderer with sorting and selection
- **Toolbar** - Configurable action button bar with search
- **PaginationControls** - Navigation controls with boundary detection

#### Utilities
- **I18n** - Internationalization with JSON translation files and parameter interpolation
- **ModuleManager** - Dynamic ES6 module loader for lazy page/widget loading
- **UIUtils** - DOM helpers (disable/enable, debounce, throttle, uniqueId, escapeHtml)

#### Examples
- 15+ interactive demo pages covering all widgets and features
- Bootstrap integration reference (ActivityMonitor widget)
- Reactive state counter example
- Complete SPA application example with routing

#### Documentation
- Comprehensive JSDoc comments on all public APIs
- Better-docs template with category organization
- 7 Claude AI skills for project conventions
- Architecture documentation (CLAUDE.md)
- Contributing guide with commit conventions
- Code of Conduct (Contributor Covenant v2.0)
- Security policy with private vulnerability reporting

#### Developer Experience
- Zero build step - native ES6 modules load directly in browser
- Flat project structure with short import paths
- Hot-reload dev server (serve.sh)
- Browser-based test runner (TestRunner)
- CSS custom properties for theming

### Philosophy

- **No build tools** - Write → Deploy
- **Web standards first** - ES6 modules, CSS custom properties, native DOM
- **jQuery + Bootstrap 5.3** - Leverage proven, stable libraries
- **Simple is debuggable** - Source maps not needed when there's no build
- **AI-friendly** - No framework magic, just JavaScript

---

## License

MIT

[2.0.0]: https://github.com/ntelioai/ntelioUI2/releases/tag/v2.0.0
