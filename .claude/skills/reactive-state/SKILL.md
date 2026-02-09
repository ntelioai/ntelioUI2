---
name: reactive-state
description: Use Widget's reactive state system. Use when implementing widgets with dynamic data, form bindings, or auto-rendering UI. Covers state proxy, setState(), render(), batching, and gotchas.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Reactive State

Widget provides an opt-in reactive state system. Writing to `this.state` triggers a debounced `render()` call via `requestAnimationFrame`.

## Opting In

Pass a `state` object to `super()`:

```javascript
export class Counter extends Widget {
    constructor(params = {}) {
        const template = `
            <div class="nui-counter">
                <button class="btn btn-sm btn-outline-secondary decrement">−</button>
                <span class="count">0</span>
                <button class="btn btn-sm btn-outline-secondary increment">+</button>
            </div>
        `
        super({
            template,
            state: { count: params.initialCount ?? 0 },
            ...params
        })
    }

    async init() {
        this.find('.increment').on('click', () => this.state.count++)
        this.find('.decrement').on('click', () => this.state.count--)
    }

    render() {
        this.find('.count').text(this.state.count)
    }
}
```

## Core API

| Method/Property | Description |
|----------------|-------------|
| `this.state` | Proxied state object — writes trigger render |
| `this.state.key = value` | Set a value, schedules render via rAF |
| `this.setState({ key: value })` | Batch-set multiple values, single render |
| `this.getState()` | Returns plain object copy (un-proxied) |

## How It Works

1. `super({ state: {...} })` → Widget creates a shallow `Proxy` over the state
2. Each property write (`this.state.x = y`) triggers `_scheduleRender()`
3. `_scheduleRender()` calls `requestAnimationFrame(render)` — deduplicated
4. Multiple synchronous writes batch into **one** `render()` call

```javascript
// These three writes produce ONE render() call
this.state.firstName = 'John'
this.state.lastName = 'Doe'
this.state.age = 30
```

## `setState()` for Batch Updates

When setting multiple fields, prefer `setState()` — it's explicit about batching:

```javascript
this.setState({
    firstName: 'John',
    lastName: 'Doe',
    age: 30
})
// → single render()
```

`setState()` uses `Object.assign` internally to merge into the raw state, then schedules one render.

## `render()` Method

Override `render()` to update the DOM from current state:

```javascript
render() {
    this.find('.name').text(`${this.state.firstName} ${this.state.lastName}`)
    this.find('.age').text(this.state.age)
    this.find('.status').toggleClass('active', this.state.isActive)
}
```

**Rules for `render()`:**
- Must be **idempotent** — calling it twice with the same state produces the same DOM
- Must be **fast** — avoid network calls, heavy computation, or DOM creation
- Should only **update** existing DOM elements, not create new structure
- Is called automatically on state change — don't call it manually (use `setState()` instead)

## Gotchas

### 1. Shallow Proxy Only

Only **top-level** property writes are observed. Nested mutations are invisible:

```javascript
// ❌ NOT detected — nested object mutation
this.state.user.name = 'John'
this.state.items.push('new item')

// ✅ Detected — replace the top-level reference
this.state.user = { ...this.state.user, name: 'John' }
this.state.items = [...this.state.items, 'new item']
```

### 2. No-Op Guard

Writing the same value is a no-op — no render is scheduled:

```javascript
this.state.count = 5
this.state.count = 5  // no render — value unchanged
```

### 3. Destroyed Widgets Skip Render

If the widget is destroyed, state writes are silently ignored.

### 4. First Render Timing

The proxy is set up during `super()`, but `render()` is first called after the state is initialized. If you need DOM setup before state is active, do it in `init()`.

### 5. Don't Read State in Constructor

The proxy isn't ready until after `super()` returns. Read state in `init()` or `render()`.

## When to Use State vs Plain Properties

| Use `state` when... | Use plain `_properties` when... |
|---------------------|--------------------------------|
| Value changes should update the DOM | Value is internal bookkeeping |
| UI needs to stay in sync | No DOM representation |
| User interactions modify data | Config set once in constructor |
| Multiple sources can change the value | Only changed via explicit method call |

```javascript
// state — drives DOM
super({ state: { count: 0, filter: '' } })

// plain property — internal reference
this._modal = null
this._config = config
this._isLoading = false
```

## Testing Reactive State

```javascript
itAsync('should update DOM on state change', async () => {
    const counter = new Counter({ autoInit: false, state: { count: 0 } })
    await counter.init()
    counter.appendTo('body')

    counter.state.count = 42

    // Wait for rAF to flush
    await new Promise(r => requestAnimationFrame(r))

    assert.equals(counter.find('.count').text(), '42')

    counter.destroy()
})
```
