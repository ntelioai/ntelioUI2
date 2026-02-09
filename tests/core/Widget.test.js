/**
 * Widget.js Unit Tests
 */
import { TestRunner } from '../runner/TestRunner.js'
import { assert } from '../runner/assertions.js'
import { Widget } from '../../core/Widget.js'

const { describe, it, itAsync } = TestRunner

describe('Widget', () => {

    describe('constructor', () => {
        it('creates a DOM node', () => {
            const widget = new Widget({ autoInit: false })
            assert.exists(widget.node)
            assert.isTrue(widget.node.length > 0)
            widget.destroy()
        })

        it('assigns unique widget ID', () => {
            const widget1 = new Widget({ autoInit: false })
            const widget2 = new Widget({ autoInit: false })
            assert.isTrue(widget1.getId() !== widget2.getId())
            widget1.destroy()
            widget2.destroy()
        })

        it('parses template variables', () => {
            const widget = new Widget({
                template: '<div class="test">Hello {{name}}</div>',
                name: 'World',
                autoInit: false
            })
            assert.includes(widget.node.html(), 'World')
            widget.destroy()
        })

        it('registers widget in _allWidgets', () => {
            const widget = new Widget({ autoInit: false })
            const id = widget.getId()
            assert.equals(Widget.getWidgetById(id), widget)
            widget.destroy()
        })

        it('allows opting out of registration', () => {
            const widget = new Widget({ register: false, autoInit: false })
            const id = widget.getId()
            assert.isNull(Widget.getWidgetById(id))
            widget.destroy()
        })
    })

    describe('destroy', () => {
        it('removes widget from registry', () => {
            const widget = new Widget({ autoInit: false })
            const id = widget.getId()
            assert.exists(Widget.getWidgetById(id))

            widget.destroy()
            assert.isNull(Widget.getWidgetById(id))
        })

        it('destroys child widgets', () => {
            const parent = new Widget({ autoInit: false })
            const child = new Widget({ autoInit: false })
            parent.add(child)

            const childId = child.getId()
            parent.destroy()

            assert.isNull(Widget.getWidgetById(childId))
        })

        it('removes from parent _widgets array', () => {
            const parent = new Widget({ autoInit: false })
            const child = new Widget({ autoInit: false })
            parent.add(child)

            assert.lengthOf(parent.getWidgets(), 1)
            child.destroy()
            assert.lengthOf(parent.getWidgets(), 0)

            parent.destroy()
        })

        it('marks widget as destroyed', () => {
            const widget = new Widget({ autoInit: false })
            assert.isFalse(widget._destroyed)
            widget.destroy()
            assert.isTrue(widget._destroyed)
        })

        it('calls beforeDestroy hook', () => {
            let hookCalled = false
            class TestWidget extends Widget {
                beforeDestroy() {
                    hookCalled = true
                }
            }
            const widget = new TestWidget({ autoInit: false })
            widget.destroy()
            assert.isTrue(hookCalled)
        })

        it('calls onDestroy callback', () => {
            let callbackCalled = false
            const widget = new Widget({
                autoInit: false,
                onDestroy: () => { callbackCalled = true }
            })
            widget.destroy()
            assert.isTrue(callbackCalled)
        })
    })

    describe('events', () => {
        it('emits and receives events', () => {
            const widget = new Widget({ autoInit: false })
            let received = null

            widget.on('test', (data) => { received = data })
            widget.emit('test', { value: 42 })

            assert.equals(received.value, 42)
            widget.destroy()
        })

        it('allows unsubscribing via returned function', () => {
            const widget = new Widget({ autoInit: false })
            let callCount = 0

            const unsubscribe = widget.on('test', () => { callCount++ })
            widget.emit('test')
            unsubscribe()
            widget.emit('test')

            assert.equals(callCount, 1)
            widget.destroy()
        })

        it('once() only fires once', () => {
            const widget = new Widget({ autoInit: false })
            let callCount = 0

            widget.once('test', () => { callCount++ })
            widget.emit('test')
            widget.emit('test')
            widget.emit('test')

            assert.equals(callCount, 1)
            widget.destroy()
        })

        it('clears handlers on destroy', () => {
            const widget = new Widget({ autoInit: false })
            let callCount = 0

            widget.on('test', () => { callCount++ })
            widget.emit('test')
            widget.destroy()

            // After destroy, widget should not process events
            assert.equals(callCount, 1)
        })

        it('bubbles events to parent', () => {
            const parent = new Widget({ autoInit: false })
            const child = new Widget({ autoInit: false })
            parent.add(child)

            let parentReceived = null
            parent.on('childEvent', (data) => { parentReceived = data })

            child.emit('childEvent', { from: 'child' })

            assert.equals(parentReceived.from, 'child')
            parent.destroy()
        })

        it('can prevent bubbling', () => {
            const parent = new Widget({ autoInit: false })
            const child = new Widget({ autoInit: false })
            parent.add(child)

            let parentReceived = false
            parent.on('childEvent', () => { parentReceived = true })

            child.emit('childEvent', { bubbles: false })

            assert.isFalse(parentReceived)
            parent.destroy()
        })
    })

    describe('static methods', () => {
        it('isWidget returns widgetId for widget nodes', () => {
            const widget = new Widget({ autoInit: false })
            const widgetId = Widget.isWidget(widget.node)
            assert.equals(widgetId, String(widget.getId()))
            widget.destroy()
        })

        it('getByNode returns widget instance', () => {
            const widget = new Widget({ autoInit: false })
            const found = Widget.getByNode(widget.node)
            assert.equals(found, widget)
            widget.destroy()
        })

        it('_$ normalizes jQuery objects', () => {
            const $el = $('<div>')
            assert.isTrue(Widget._$($el) instanceof jQuery)
        })

        it('_$ normalizes HTMLElement', () => {
            const el = document.createElement('div')
            assert.isTrue(Widget._$(el) instanceof jQuery)
        })

        it('_$ normalizes selector string', () => {
            const result = Widget._$('body')
            assert.isTrue(result instanceof jQuery)
        })
    })

})
