---
title: "ntelioUI2: A UI Widget Framework That Doesn't Need a Build Step"
published: false
description: "jQuery + Bootstrap 5.3 + ES6 modules. No webpack, no transpiler. Just JavaScript the browser runs directly."
tags: javascript, opensource, webdev, bootstrap
# canonical_url: https://...  # Set to your LinkedIn article or blog URL
---

# ntelioUI2: A UI Widget Framework That Doesn't Need a Build Step

In 2022, I started building a product and needed a UI framework. After years of enterprise projects cycling through Dojo, Angular, and React — each with its own onboarding cliff and toolchain overhead — I made an unconventional choice: I built one from scratch using jQuery, Bootstrap, and native ES6 modules.

Today I'm open-sourcing the modernized version: **ntelioUI2**.

## What Is It

A lightweight widget framework for building web applications. The core idea: use web standards that already work, don't add abstraction layers that don't earn their keep.

- **jQuery + Bootstrap 5.3 + ES6 modules** — loaded via `<script>` and CDN links
- **No build step** — no webpack, no Vite, no babel. `<script type="module">` is the toolchain
- **Widget base class** — lifecycle hooks, parent-child tree, event system with bubbling
- **Bootstrap IS the component library** — don't wrap buttons in Widget subclasses. Only create a Widget when you need lifecycle management, internal state, or custom events
- **Dynamic CSS loading** — widgets load their own styles via `ResourceLoader`, with deduplication
- **SPA framework** — Application shell, hash-based routing, lazy page loading, collapsible navbar

## What's Included

| Category | Widgets |
|----------|---------|
| Core | Widget (with reactive state), ResourceLoader, EventBus |
| Application | Application (SPA shell), Page, PageRouter, VerticalNavbar, LoginDialog |
| Dialogs | Modal, ConfirmDialog, AlertDialog |
| Navigation | Breadcrumbs, Sidebar |
| Feedback | Toast (ephemeral notifications) |
| Forms | Autoform (declarative form generation) |
| Grid | DataControl (CRUD grid), DataControlGrid, Toolbar, PaginationControls |
| Data | DataProvider (abstract), JsonDataProvider, AuthProvider |
| Utils | UIUtils, I18n, ModuleManager |

## What It Looks Like

Creating a widget with reactive state:

```javascript
import { Widget } from './core/Widget.js'
import { ResourceLoader } from './core/ResourceLoader.js'

const template = `
<div class="nui-counter">
    <span class="count">0</span>
    <button class="btn btn-primary">+1</button>
</div>
`

export class Counter extends Widget {
    constructor(params = {}) {
        super({
            template,
            state: { count: params.initialCount ?? 0 },
            ...params
        })
    }

    async init() {
        await ResourceLoader.loadCss('./css/counter.css', import.meta.url)
        this.find('button').on('click', () => this.state.count++)
    }

    render() {
        this.find('.count').text(this.state.count)
    }
}
```

Using Toast notifications:

```javascript
import { Toast } from './widgets/feedback/Toast.js'

Toast.success('Saved!')
Toast.error('Something went wrong', { duration: 8000 })
```

Promise-based confirm dialog:

```javascript
import { ConfirmDialog } from './dialogs/Modal.js'

const yes = await ConfirmDialog.show({
    title: 'Delete item?',
    message: 'This cannot be undone.'
})
if (yes) deleteItem()
```

Setting up an SPA:

```javascript
import { Application } from './application/Application.js'

class MyApp extends Application {
    static routesMap = {
        '/': 'pages/Home',
        '/settings': 'pages/Settings'
    }
    static menu = [
        { icon: homeIcon, label: 'Home', path: '/' },
        { icon: gearIcon, label: 'Settings', path: '/settings' }
    ]
    static application = {
        classPath: new URL('.', import.meta.url).href,
        pathMap: MyApp.routesMap,
        menu: MyApp.menu,
        title: 'My App'
    }
    constructor() { super(MyApp.application) }
    static load() { super.load(MyApp, 'body') }
}
MyApp.load()
```

## Why This Exists

The longer story is in my article: [I Built a UI Framework in 2022 While Everyone Was Using React. Here's Why.](#)

The short version: framework choices are management decisions disguised as technical ones. I watched smart developers spend weeks becoming "comfortable" pushing code in React stacks — not because they lacked talent, but because the ecosystem demanded they learn 12 things before they could change a button color.

ntelioUI developers were shipping widgets on day 1 and production features within a week. The difference wasn't the developers. It was the friction.

## AI-Friendly by Accident

A bonus we didn't anticipate: simple, standard JavaScript is the easiest code for AI agents to work with. No framework magic to hallucinate about, no virtual DOM reconciliation to get wrong, no hook dependency arrays to mess up. The ntelioUI2 rewrite using Claude took a week — because there wasn't much complexity to untangle.

## Get Started

```bash
git clone https://github.com/ntelioai/ntelioUI2.git
cd ntelioUI2
# Open examples/index.html in your browser. That's it.
```

No `npm install`. No build. Just open the HTML file.

**GitHub:** [link]
**License:** MIT
**Contributing:** We welcome contributions — check the [CONTRIBUTING.md](link) and look for `good first issue` labels.

---

I know this approach isn't for everyone, and I'm not arguing jQuery is "better" than React in some absolute sense. Different tools for different contexts. But if you've ever felt like your toolchain was more complex than your product, this might resonate.

Happy to answer questions about architecture, trade-offs, or the migration from the original ntelioUI.
