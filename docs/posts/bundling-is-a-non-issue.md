# "But Can You Bundle It?" — Yes. You Just Don't Need To.

One of the first questions developers ask when they see ntelioUI2 shipping native ES6 modules to the browser is: "What about bundling?"

Fair question. Here's the short answer: **you can bundle it trivially, but you probably don't need to.**

## Why You Don't Need To

Modern browsers and HTTP/2 have eliminated the original reasons bundling existed:

- **HTTP/2 multiplexing** sends all your module files over a single connection. There's no waterfall penalty for having 20 small files instead of one big one.
- **Browser caching works per-file.** Change one widget, only that file invalidates. With a bundle, changing one line busts the entire cache.
- **The total payload is tiny.** The entire ntelioUI2 core (Widget, ResourceLoader, EventBus, UIUtils) is a few KB. Compare that to a React + Redux bundle that starts at 40KB gzipped before you write a single line of application code.
- **You keep your debugging story.** Open DevTools, see your actual source files, set a breakpoint. No source maps, no "where is my code in this 300KB blob?"

## How To Bundle (When You Actually Need To)

If you're distributing ntelioUI2 as a single `<script>` tag for third-party consumption, or deploying to an environment where HTTP/2 isn't available, bundling is a one-liner.

**With esbuild (fastest):**
```bash
esbuild index.js --bundle --format=iife --global-name=ntelioUI --minify --outfile=dist/ntelioUI2.min.js
```

**With rollup (tree-shaking):**
```bash
rollup index.js --file dist/ntelioUI2.min.js --format=iife --name=ntelioUI
```

That's it. The module graph is shallow and has zero circular dependencies, so any bundler handles it without configuration.

## The Approach

Develop with native modules. Always. Zero friction, instant reload, real debuggability.

Bundle only at the distribution boundary — when someone outside your team needs a single file to drop into their page. This is a packaging step, not a development workflow. The distinction matters.

## Why This Works

ntelioUI2's module graph looks like this:

```
Widget ← ResourceLoader, UIUtils
Modal  ← Widget
Button ← Widget
Tabs   ← Widget
...
```

Flat. Shallow. No dependency hell, no circular imports, no barrel files re-exporting hundreds of symbols. A bundler's job here is trivial because the architecture is simple.

Compare that to a typical React project where the bundler needs to resolve thousands of node_modules, handle JSX transformation, CSS extraction, code splitting, tree shaking across dynamic imports, and hot module replacement. The bundler isn't optional there — it's structural. Here, it's just a zip tool.

---

*The best build step is the one you don't need. And when you do need it, it should take one command, not a config file.*
