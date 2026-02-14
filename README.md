# ntelioUI2

A no-nonsense, lightweight, fast SPA and widget framework. No build, no package. Write &rarr; Deploy.

Built on **jQuery**, **Bootstrap 5**, and **native ES6 modules**. Zero dependencies. Zero build tools. Just JavaScript that runs in the browser exactly as written.

## Quick Start

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="path/to/ntelioUI2/css/ntelioUI.css" rel="stylesheet">
</head>
<body>
    <div id="app"></div>
    <script type="module">
        import { Widget } from './ntelioUI2/core/Widget.js'

        class HelloWidget extends Widget {
            constructor() {
                super({
                    template: `<div class="p-4"><h1>{{title}}</h1><p>It works.</p></div>`,
                    title: 'Hello ntelioUI2'
                })
            }
        }

        new HelloWidget().appendTo('#app')
    </script>
</body>
</html>
```

That's it. No `npm install`. No `webpack.config.js`. No waiting.

## Why This Exists

Most UI frameworks demand you learn a curriculum before you can change a button color. ntelioUI2 takes a different approach: the browser already has a DOM, ES6 modules are a web standard, and jQuery + Bootstrap solve 80% of the UI surface area. So we built on that instead of abstracting it away.

New developers build widgets on day one. Production features ship in a week. See [the full story](docs/posts/why-i-built-a-ui-framework-in-2023.md).

## Project Structure

```
ntelioUI2/
├── core/               Widget, ResourceLoader, EventBus
├── widgets/            Reusable components by category
│   ├── basic/          Buttons, badges, labels
│   ├── inputs/         Form inputs (text, select, etc.)
│   ├── containers/     Tabs, panels, accordions
│   ├── complex/        Tree, data grid
│   ├── feedback/       Alerts, toasts, progress
│   └── navigation/     Menus, breadcrumbs, sidebar
├── dialogs/            Modal, ConfirmDialog, AlertDialog
├── forms/              Form builder, validation
├── application/        SPA shell (routing, sidebar, pages)
├── utils/              UIUtils, I18n
├── css/                Stylesheets (mirrors JS structure)
│   ├── core/           widget.css, loading.css
│   └── themes/         default.css (CSS custom properties)
├── examples/           Interactive demos
├── tests/              Browser-based test runner
└── index.js            Main entry point
```

No `src/` wrapper. Import paths are short and obvious.

## Core Concepts

### Widget Lifecycle

```
constructor → init() → render() → [live] → beforeDestroy() → destroy()
```

Every widget is a plain JavaScript class. Override `init()` for async setup, `render()` to populate the DOM, and `beforeDestroy()` for cleanup.

```javascript
import { Widget } from '../core/Widget.js'

class ProductCard extends Widget {
    constructor(params = {}) {
        super({
            template: `
                <div class="card">
                    <div class="card-body">
                        <h5>{{name}}</h5>
                        <p>{{price}}</p>
                        <button class="btn btn-primary add-to-cart">Add to Cart</button>
                    </div>
                </div>
            `,
            ...params
        })
    }

    async init() {
        Widget.loadCss('../css/widgets/product-card.css', import.meta.url)
        this.find('.add-to-cart').on('click', () => {
            this.emit('addToCart', { productId: this.params.productId })
        })
    }
}
```

### Parent-Child Tree

```javascript
const page = new PageWidget()
const card = new ProductCard({ name: 'Widget Pro', price: '$9.99' })
page.add(card)  // Sets parent, appends to DOM, tracks for lifecycle

page.destroy()  // Recursively destroys all children
```

### Events

```javascript
// Local events with bubbling
widget.on('change', (data, emitter) => { ... })
widget.emit('change', { value: 42 })  // Bubbles to parent

// Global events (cross-widget communication)
import { EventBus } from '../core/EventBus.js'
EventBus.on('theme:changed', (data) => { ... })
EventBus.emit('theme:changed', { theme: 'dark' })
```

### Resource Loading

Widgets load their own CSS and external scripts. Deduplication is built in.

```javascript
async init() {
    // Load widget CSS (resolved relative to this module)
    Widget.loadCss('../css/widgets/my-widget.css', import.meta.url)

    // Load an external jQuery plugin
    await Widget.loadScript('https://cdn.example.com/plugin.min.js')
}
```

### SPA Routing

```javascript
import { Application } from './application/Application.js'

class MyApp extends Application {
    static routesMap = {
        '/': 'pages/Home',
        '/products': 'pages/Products',
        '/settings': 'pages/Settings'
    }

    static menu = [
        { icon: '...', label: 'Home', path: '/' },
        { icon: '...', label: 'Products', path: '/products' },
        { icon: '...', label: 'Settings', path: '/settings' }
    ]

    // ...
}
```

Hash-based routing, lazy page loading, sidebar navigation — all built in.

## Theming

All visual properties are CSS custom properties in `css/themes/default.css`:

```css
:root {
    --nui-primary: #0d6efd;
    --nui-border-radius: 0.375rem;
    --nui-font-family: inherit;
    --nui-shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
}
```

Override them to theme the entire framework. No runtime cost, no JavaScript, just CSS.

## Dev Server

```bash
./serve.sh              # Serve on port 8765
./serve.sh /path 9000   # Custom root and port
```

Then open `http://localhost:8765/ntelioUI2/examples/` in your browser.

## Testing

Open `tests/index.html` in a browser:

```javascript
import { TestRunner } from './runner/TestRunner.js'
const { describe, it } = TestRunner

describe('ProductCard', () => {
    it('emits addToCart on button click', () => {
        const card = new ProductCard({ name: 'Test', price: '$1' })
        let fired = false
        card.on('addToCart', () => { fired = true })
        card.find('.add-to-cart').click()
        assert.ok(fired)
    })
})
```

## Bundling

You don't need to bundle for development. HTTP/2 multiplexes module files over a single connection, and the browser caches each file individually.

If you need a single file for distribution:

```bash
esbuild index.js --bundle --format=iife --global-name=ntelioUI --minify --outfile=dist/ntelioUI2.min.js
```

See [Bundling Is a Non-Issue](docs/posts/bundling-is-a-non-issue.md) for the full rationale.

## AI Assistant Support

This project includes 7 Claude AI skills in `.claude/skills/` that help AI coding assistants understand project conventions. These cover code style, JSDoc, anti-patterns, testing, reactive state, CSS conventions, and common recipes. See [CONTRIBUTING.md](CONTRIBUTING.md#claude-ai-skills) for details.

## Philosophy

- **The browser is the platform.** We work with the DOM, not around it.
- **Web standards don't break.** ES6 modules, CSS custom properties, and the DOM aren't going anywhere.
- **Simple code is debuggable code.** Open DevTools, see your source, set a breakpoint. Done.
- **Simple code is AI-friendly code.** No framework magic to hallucinate about.
- **A `<script>` tag is your entire toolchain.**

## Sponsor

This project is sponsored by [ntelio.ai](https://ntelio.ai).

## Maintainers

- [@rabih-nassar](https://github.com/rabih-nassar) — Lead co-maintainer
- [@legatoloco](https://github.com/legatoloco) — Lead co-maintainer
- [@carof](https://github.com/carof) — Lead co-maintainer

All lead maintainers review pull requests and manage releases.

## License

MIT
