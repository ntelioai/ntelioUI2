# Contributing to ntelioUI2

Thanks for your interest in contributing! ntelioUI2 is a modern UI widget framework built on jQuery + Bootstrap 5.3 + native ES6 modules. This guide will help you get started.

## Quick Links

- [GitHub Discussions](../../discussions) — Questions, ideas, design proposals
- [Issue Tracker](../../issues) — Bug reports and feature requests
- [Migration Catalog](docs/plans/migration-component-catalog.md) — Widget migration status and roadmap

## Getting Started

### Prerequisites

- A modern browser with ES6 module support
- A local HTTP server (the repo includes `serve.sh`)
- Git

There is **no build step** — no webpack, no transpiler, no `npm install` required to run the project. Modules are loaded natively by the browser.

### Setup

```bash
git clone https://github.com/ntelioai/ntelioUI2.git
cd ntelioUI2
./serve.sh    # Starts a local server on port 8765
```

Then open `http://localhost:8765/ntelioUI2/examples/` in your browser.

### Claude AI Skills

This project includes **7 Claude AI skills** in `.claude/skills/` that help AI assistants (and human contributors) understand and follow project conventions:

- **code-style** — Formatting, naming conventions, import rules, file structure
- **jsdoc-conventions** — Documentation standards, @category tags, examples
- **anti-patterns** — 15 "never do this" rules to prevent common mistakes
- **testing-patterns** — TestRunner API, assertions, test file structure
- **reactive-state** — Widget's reactive state system usage and gotchas
- **css-conventions** — CSS naming (.nui-prefix), custom properties, file placement
- **common-recipes** — Step-by-step checklists for frequent tasks (new widget, add page, etc.)

If you're using GitHub Copilot, Claude, or another AI coding assistant, these skills will be automatically referenced to ensure code follows project conventions. You can also read them directly as quick reference guides.

## How to Contribute

### Reporting Bugs

Open an issue using the **Bug Report** template. Include:

- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS
- Screenshots or console errors if applicable

### Suggesting Features

Open an issue using the **Feature Request** template, or start a thread in [GitHub Discussions](../../discussions) for broader design conversations.

### Submitting Code

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/my-widget
   ```
2. Make your changes (see [Development Guidelines](#development-guidelines) below)
3. Test your changes in the browser
4. Commit using [Conventional Commits](#commit-messages)
5. Push and open a **Pull Request** against `main`

## Development Guidelines

### Architecture Principles

- **No build step.** All JavaScript is native ES6 modules. File extensions (`.js`) are required in all imports.
- **jQuery is a prerequisite, not a dependency.** Access it via `const $ = window.jQuery || window.$`. Never `import` it.
- **Bootstrap IS the widget library for basic UI.** Don't wrap buttons, badges, alerts, or form inputs in Widget subclasses. Only create a Widget when you need lifecycle management, internal state, custom events, or a public API.

### Project Structure

```
ntelioUI2/
├── core/           # Widget base class, ResourceLoader, EventBus
├── application/    # SPA shell (Application, Page, PageRouter)
├── widgets/        # Widget categories (navigation/, feedback/, etc.)
├── dialogs/        # Modal, ConfirmDialog, AlertDialog
├── forms/          # Autoform
├── utils/          # UIUtils, I18n, ModuleManager
├── css/            # Mirrors the JS structure exactly
├── examples/       # One folder per example, each with index.html + main.js
└── index.js        # Main entry point (re-exports all modules)
```

The layout is **flat** — no `src/` wrapper. Keep import paths short.

### Creating a New Widget

Follow this checklist:

1. **Create the JS file** in the appropriate `widgets/` subfolder (create the subfolder if needed)
2. **Extend `Widget`**, define a template, override `init()`
3. **Create a matching CSS file** in `css/widgets/` mirroring the JS path
4. **Load CSS in `init()`** using `ResourceLoader.loadCss()` with a path relative to the module:
   ```javascript
   await ResourceLoader.loadCss('../../css/widgets/category/my-widget.css', import.meta.url)
   ```
5. **Export** from the category's `index.js`
6. **Add an example** in `examples/` — copy `examples/_template/` as a starting point
7. **Update** `examples/index.html` with a link to your new example
8. **Add the widget** to the main `index.js` exports if applicable

### CSS Conventions

- Classes: `.nui-{widget}-{element}` (e.g., `.nui-toast-container`)
- Variables: `--nui-{property}` with fallbacks: `color: var(--nui-primary, #0d6efd)`
- Widget CSS is loaded at runtime via `ResourceLoader.loadCss()` — never import CSS in JS

### Common Pitfalls

These are the most frequent sources of bugs — please read before submitting:

- **CSS path resolution:** `ResourceLoader.loadCss(path, import.meta.url)` resolves relative to the calling module. If your widget is in `widgets/nav/` and CSS is in `css/widgets/nav/`, the path is `../../css/widgets/nav/foo.css`.
- **`find()` matches nested widgets:** `this.find('.item')` searches the entire subtree including child widgets. Use `this.find('> .item')` to match only direct children.
- **`[widgetid]` sets `position: relative`:** This can break Bootstrap components that need `position: fixed` (e.g., modals). Add overrides in CSS if needed.
- **Ephemeral widgets:** Use `{ register: false }` for widgets that self-destruct (like Toast) to avoid bloating the global registry.

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or widget |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | CSS changes, formatting (no logic change) |
| `refactor` | Code restructuring (no feature or fix) |
| `test` | Adding or updating tests |
| `chore` | Tooling, config, maintenance |

### Examples

```
feat: Add DataGrid widget with sorting and pagination
fix: Resolve CSS path resolution in Toast on nested pages
docs: Add Autoform usage examples to README
refactor: Extract modal event handling into shared mixin
```

Keep the subject line under 72 characters. Use the body for context on *why*, not *what*.

## Pull Request Process

1. **One concern per PR** — Don't mix a bug fix with an unrelated refactor
2. **Include an example** — If adding or changing a widget, update or add an example page
3. **Test in the browser** — Open your example page and verify it works. Check the console for errors.
4. **Describe your changes** — Use the PR template. Explain what and why.
5. **Be responsive** — Address review feedback promptly. We aim to review PRs within a few days.

### PR Title

Use the same Conventional Commits format as commit messages:
```
feat: Add Tabs widget
fix: Modal close event not firing on Escape
```

## Code Style

- **ES6 modules** with named exports
- **No semicolons** or **always semicolons** — match the style of the file you're editing
- **Private members** prefixed with `_` (e.g., `this._count`)
- **Template literals** for HTML templates (backtick strings)
- Keep widgets focused — if Bootstrap already does it, don't wrap it

## Maintainers

Pull requests are reviewed by the lead maintainers:

- [@rabih-nassar](https://github.com/rabih-nassar)
- [@legatoloco](https://github.com/legatoloco)
- [@carof](https://github.com/carof)

We aim to review PRs within 2-3 business days. Feel free to @mention any maintainer if you need feedback.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## Questions?

Open a thread in [GitHub Discussions](../../discussions) — we're happy to help you get started.
