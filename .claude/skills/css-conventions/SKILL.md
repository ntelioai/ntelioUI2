---
name: css-conventions
description: CSS naming, structure, and custom properties for ntelioUI2. Use when creating or editing stylesheets — class naming, file locations, theme variables, responsive patterns, and how CSS is loaded.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# CSS Conventions

ntelioUI2 uses hand-written CSS with BEM-like naming, CSS custom properties for theming, and dynamic loading via `ResourceLoader`.

## File Structure

CSS mirrors the JS structure exactly:

```
css/
├── ntelioUI.css                    # Main bundle — @import's everything
├── themes/default.css              # CSS custom properties (--nui-*)
├── core/
│   ├── widget.css                  # Base [widgetid] styles
│   └── loading.css                 # Loading overlay/spinner
├── application/
│   ├── app.css                     # Application shell
│   ├── navbar.css                  # VerticalNavbar
│   ├── navbar-dark.css             # Dark theme variant
│   └── page-not-found.css          # 404 page
├── dialogs/
│   └── modal.css                   # Modal, ConfirmDialog, AlertDialog
├── widgets/
│   ├── navigation/
│   │   ├── breadcrumbs.css         # BreadCrumbs
│   │   └── sidebar.css             # Sidebar
│   ├── feedback/
│   │   └── toast.css               # Toast
│   └── containers/
│       └── collapsible-pane.css    # CollapsiblePane
├── forms/
│   └── autoform.css                # Autoform
└── specialized/auth/
    └── login-dialog.css            # LoginDialog
```

**Rule:** When creating a new widget, create its CSS file in the matching `css/` subfolder.

## Class Naming

Use `.nui-{widget}-{element}` — flat hierarchy with `nui-` prefix:

```css
/* Widget root */
.nui-toast { }

/* Elements within the widget */
.nui-toast-container { }
.nui-toast-icon { }
.nui-toast-message { }
.nui-toast-close { }

/* State modifiers — append to root or element */
.nui-toast-visible { }
.nui-toast-hiding { }
.nui-toast-success { }
.nui-toast-error { }
.nui-toast-warning { }
.nui-toast-info { }
```

**Naming rules:**
- Always prefix with `nui-`
- Widget name in lowercase-hyphenated: `nui-collapsible-pane`, `nui-login`
- Elements separated by single hyphen: `nui-toast-message`
- State modifiers appended: `nui-toast-visible`, `nui-sidebar-active`
- No deep nesting like BEM `__` or `--` — keep it flat

**Do NOT use:**
- Generic class names without `nui-` prefix
- Bootstrap class names as custom selectors
- ID selectors for styling

## CSS Custom Properties (Theme Variables)

All theme values live in `css/themes/default.css` under `:root`. Namespaced with `--nui-`:

```css
:root {
    /* Colors */
    --nui-primary: #0d6efd;
    --nui-secondary: #6c757d;
    --nui-success: #198754;
    --nui-danger: #dc3545;
    --nui-warning: #ffc107;
    --nui-cerulean: #007ba7;

    /* Text */
    --nui-text-primary: #212529;
    --nui-text-secondary: #495057;
    --nui-text-muted: #6c757d;

    /* Backgrounds */
    --nui-bg-primary: #ffffff;
    --nui-bg-secondary: #f8f9fa;
    --nui-bg-tertiary: #e9ecef;

    /* Layout */
    --nui-border-color: #dee2e6;
    --nui-border-radius: 0.375rem;
    --nui-shadow-sm: 0 1px 2px rgba(0,0,0,.05);

    /* Spacing */
    --nui-spacing-xs: 0.25rem;
    --nui-spacing-sm: 0.5rem;
    --nui-spacing-md: 1rem;
    --nui-spacing-lg: 1.5rem;
    --nui-spacing-xl: 3rem;

    /* Typography */
    --nui-font-family: system-ui, -apple-system, sans-serif;
    --nui-font-size-base: 1rem;

    /* Transitions */
    --nui-transition-fast: 150ms ease;
    --nui-transition-normal: 300ms ease;
}
```

### Using Theme Variables

**Always provide a fallback:**

```css
.nui-sidebar {
    background: var(--nui-bg-secondary, #f8f9fa);
    color: var(--nui-text-primary, #212529);
    border-radius: var(--nui-border-radius, 0.375rem);
    transition: opacity var(--nui-transition-fast, 150ms ease);
}
```

### Adding New Variables

Add to `css/themes/default.css` under the appropriate category comment. Follow the naming pattern:
- Colors: `--nui-{name}`
- Text: `--nui-text-{name}`
- Backgrounds: `--nui-bg-{name}`
- Spacing: `--nui-spacing-{size}`

## Loading CSS

CSS is loaded dynamically in `init()` via `ResourceLoader`:

```javascript
async init() {
    await ResourceLoader.loadCss('../../css/widgets/feedback/toast.css', import.meta.url)
}
```

**Critical:** The second argument MUST be `import.meta.url` of the calling module. `ResourceLoader` resolves the relative path against this base URL.

**Global styles** (`ntelioUI.css`) are loaded via `<link>` in the HTML — that file `@import`s themes, core, and application CSS. Individual widget CSS is loaded on-demand.

## The `[widgetid]` Attribute

Every widget gets a unique `widgetid` attribute. Base styles in `core/widget.css`:

```css
[widgetid] {
    position: relative;
}
```

**Gotcha:** `position: relative` on all widgets can break modals and fixed-position elements. Override when necessary:

```css
.nui-modal {
    position: fixed;
}
```

## Responsive Patterns

Use Bootstrap breakpoint utilities where possible. For widget-specific responsive styles, use standard media queries:

```css
.nui-sidebar {
    width: 250px;
}

@media (max-width: 768px) {
    .nui-sidebar {
        width: 100%;
        position: fixed;
    }
}
```

## CSS File Template

```css
/* ─── MyWidget ─────────────────────────────────────────────────── */

.nui-my-widget {
    /* layout */
    display: flex;
    padding: var(--nui-spacing-md, 1rem);

    /* appearance */
    background: var(--nui-bg-primary, #fff);
    border: 1px solid var(--nui-border-color, #dee2e6);
    border-radius: var(--nui-border-radius, 0.375rem);
}

.nui-my-widget-header {
    font-weight: 600;
    color: var(--nui-text-primary, #212529);
}

.nui-my-widget-body {
    flex: 1;
}

/* ─── States ───────────────────────────────────────────────────── */

.nui-my-widget-active {
    border-color: var(--nui-primary, #0d6efd);
}

.nui-my-widget-disabled {
    opacity: 0.5;
    pointer-events: none;
}
```

## Checklist for New Widget CSS

1. Create file in matching `css/` subfolder
2. Use `.nui-{widget}` prefix for all classes
3. Use CSS custom properties with fallbacks
4. Add `@import` to `ntelioUI.css` if it should be globally available
5. Load dynamically via `ResourceLoader.loadCss()` in `init()` if widget-specific
6. Test in Chrome and Firefox at minimum
