---
name: testing-patterns
description: Write browser-based tests for ntelioUI2 widgets and utilities. Use when the user asks to write tests, add test coverage, or debug failing tests. Covers TestRunner API, assertions, test file structure, and async testing patterns.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# Testing Patterns

ntelioUI2 uses a browser-based test runner — no Node.js test framework. Tests run in the browser via `tests/index.html`.

## Test Infrastructure

| File | Purpose |
|------|---------|
| `tests/runner/TestRunner.js` | Suite/test definition, execution, summary |
| `tests/runner/assertions.js` | Assert helpers (throws on failure) |
| `tests/index.html` | Test harness HTML — loads jQuery, Bootstrap, then test modules |
| `tests/{category}/{Class}.test.js` | Test files, one per class |

## TestRunner API

```javascript
import { TestRunner } from '../runner/TestRunner.js'
const { describe, it, itAsync } = TestRunner

describe('Widget', () => {

    it('should create a node', () => {
        // synchronous test
    })

    itAsync('should init asynchronously', async () => {
        // async test — awaited automatically
    })

    describe('nested suite', () => {
        it('can nest describes', () => { })
    })
})

// At end of file:
TestRunner.summary()
```

- `describe(name, fn)` — group tests; supports nesting
- `it(description, fn)` — synchronous test case
- `itAsync(description, fn)` — async test case (awaits the function)
- `TestRunner.summary()` — prints pass/fail counts to console, returns `true` if all passed
- `TestRunner.reset()` — clear results between runs

## Assertions

```javascript
import { assert } from '../runner/assertions.js'

assert.isTrue(value, 'optional message')
assert.isFalse(value)
assert.equals(actual, expected)          // strict ===
assert.deepEquals(actual, expected)      // JSON-based deep compare
assert.exists(value)                      // value != null
assert.isNull(value)                      // value === null
assert.isUndefined(value)                // value === undefined
assert.includes(string, substring)       // string contains
assert.throws(fn, expectedMessage?)      // sync throw
assert.throwsAsync(fn, expectedMessage?) // async throw
assert.instanceOf(value, Constructor)    // instanceof
assert.lengthOf(arrayOrString, length)   // .length check
```

All assertions throw on failure — TestRunner catches and reports them.

## Test File Template

```javascript
/**
 * Tests for MyWidget
 */
import { TestRunner } from '../runner/TestRunner.js'
import { assert } from '../runner/assertions.js'
import { MyWidget } from '../../widgets/category/MyWidget.js'

const { describe, it, itAsync } = TestRunner

describe('MyWidget', () => {

    itAsync('should initialize', async () => {
        const w = new MyWidget({ autoInit: false })
        await w.init()

        assert.exists(w.node)
        assert.isTrue(w.node.length > 0)

        w.destroy()
    })

    it('should have correct defaults', () => {
        const w = new MyWidget({ autoInit: false, register: false })
        assert.equals(w._config.size, 'md')
        w.destroy()
    })

    itAsync('should emit events', async () => {
        const w = new MyWidget({ autoInit: false })
        await w.init()

        let fired = false
        w.on('custom', () => { fired = true })
        w.emit('custom')

        assert.isTrue(fired, 'Event should have fired')

        w.destroy()
    })

    itAsync('should clean up on destroy', async () => {
        const w = new MyWidget({ autoInit: false })
        await w.init()
        w.appendTo('body')

        w.destroy()

        assert.isTrue(w._destroyed)
        assert.equals(w.node.closest('body').length, 0)
    })
})

TestRunner.summary()
```

## Key Testing Rules

### 1. Always Use `autoInit: false`

Tests must control the lifecycle explicitly. Auto-init makes timing unpredictable.

```javascript
const w = new MyWidget({ autoInit: false })
await w.init()  // explicit
```

### 2. Always Destroy After Each Test

Widgets must be cleaned up to prevent DOM leaks between tests.

```javascript
itAsync('test name', async () => {
    const w = new Toast({ autoInit: false, register: false })
    await w.init()

    // ... assertions ...

    w.destroy()
})
```

### 3. Use `register: false` for Ephemeral Widgets

Toast, LoginDialog, etc. should not pollute the global registry during tests.

### 4. Test DOM Output

```javascript
assert.equals(w.find('.nui-toast-message').text(), 'Hello')
assert.isTrue(w.node.hasClass('nui-toast-success'))
```

### 5. Test Events

```javascript
let data = null
w.on('confirm', (d) => { data = d })
w.emit('confirm', { id: 42 })
assert.exists(data)
assert.equals(data.id, 42)
```

### 6. Test Reactive State

```javascript
const w = new Counter({ autoInit: false, state: { count: 0 } })
await w.init()

w.state.count = 5
// Wait for requestAnimationFrame to flush
await new Promise(r => requestAnimationFrame(r))

assert.equals(w.find('.count').text(), '5')
w.destroy()
```

### 7. Test Error Cases

```javascript
assert.throws(() => {
    new MyWidget({ requiredParam: undefined })
}, 'requiredParam is required')
```

## Registering a New Test File

Add a `<script>` import to `tests/index.html`:

```html
<script type="module" src="./category/MyWidget.test.js"></script>
```

## Running Tests

1. Start dev server: `./serve.sh`
2. Open: `http://localhost:8765/ntelioUI2/tests/index.html`
3. Check browser console for results

## Playwright Integration

For automated headless testing, use the `client-debug` skill to run Playwright against the test harness URL. Playwright captures console output, so TestRunner results are visible in the script output.
