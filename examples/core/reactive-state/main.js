import { Widget } from '../../../core/Widget.js'

// ─── Demo 1: Counter ─────────────────────────────────────────

class Counter extends Widget {
    constructor() {
        super({
            state: { count: 0 },
            template: `
                <div class="text-center">
                    <div class="display-4 mb-3 count-display">0</div>
                    <div class="btn-group">
                        <button class="btn btn-outline-primary dec">-</button>
                        <button class="btn btn-outline-primary inc">+</button>
                    </div>
                    <div class="text-muted small mt-2">render() calls: <span class="render-count">0</span></div>
                </div>
            `,
            autoInit: false
        })
        this._renderCount = 0
    }

    async init() {
        this.find('.inc').on('click', () => this.state.count++)
        this.find('.dec').on('click', () => this.state.count--)
    }

    render() {
        this._renderCount++
        this.find('.count-display').text(this.state.count)
        this.find('.render-count').text(this._renderCount)
    }
}

const counter = new Counter()
counter.init()
counter.appendTo($('#counter-container'))

// ─── Demo 2: Status Toggle ──────────────────────────────────

class StatusToggle extends Widget {
    constructor() {
        super({
            state: { status: 'offline' },
            template: `
                <div class="text-center">
                    <span class="badge fs-5 status-badge" style="cursor:pointer">offline</span>
                    <div class="text-muted small mt-3">Click to toggle</div>
                </div>
            `,
            autoInit: false
        })
    }

    async init() {
        this.find('.status-badge').on('click', () => {
            this.state.status = this.state.status === 'online' ? 'offline' : 'online'
        })
    }

    render() {
        const online = this.state.status === 'online'
        this.find('.status-badge')
            .text(this.state.status)
            .removeClass('bg-success bg-secondary')
            .addClass(online ? 'bg-success' : 'bg-secondary')
    }
}

const status = new StatusToggle()
status.init()
status.appendTo($('#status-container'))

// ─── Demo 3: Filtered List ───────────────────────────────────

class FilteredList extends Widget {
    constructor() {
        const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon']
        super({
            state: { query: '', items },
            template: `
                <div>
                    <input type="text" class="form-control mb-2 search-input" placeholder="Type to filter...">
                    <ul class="list-group items-list"></ul>
                    <div class="text-muted small mt-2">Showing <span class="match-count">0</span> of ${items.length}</div>
                </div>
            `,
            autoInit: false
        })
    }

    async init() {
        this.find('.search-input').on('input', (e) => {
            this.state.query = e.target.value
        })
        // Initial render
        this.render()
    }

    render() {
        const q = (this.state.query || '').toLowerCase()
        const filtered = this.state.items.filter(item =>
            item.toLowerCase().includes(q)
        )
        const list = this.find('.items-list')
        list.html(filtered.map(item => {
            if (q) {
                const idx = item.toLowerCase().indexOf(q)
                const highlighted = item.substring(0, idx) +
                    '<strong>' + item.substring(idx, idx + q.length) + '</strong>' +
                    item.substring(idx + q.length)
                return `<li class="list-group-item py-1">${highlighted}</li>`
            }
            return `<li class="list-group-item py-1">${item}</li>`
        }).join(''))
        this.find('.match-count').text(filtered.length)
    }
}

const filteredList = new FilteredList()
filteredList.init()
filteredList.appendTo($('#filter-container'))

// ─── Demo 4: Batching Proof ─────────────────────────────────

class BatchTest extends Widget {
    constructor() {
        super({
            state: { a: 0, b: 0, c: 0 },
            template: `
                <div>
                    <div class="d-flex gap-4 mb-3">
                        <span>a = <strong class="val-a">0</strong></span>
                        <span>b = <strong class="val-b">0</strong></span>
                        <span>c = <strong class="val-c">0</strong></span>
                    </div>
                    <button class="btn btn-primary btn-set-3">Set 3 props</button>
                    <button class="btn btn-outline-secondary btn-use-setstate ms-2">Use setState()</button>
                    <div class="text-muted small mt-2">render() calls: <span class="render-count">0</span></div>
                </div>
            `,
            autoInit: false
        })
        this._renderCount = 0
    }

    async init() {
        this.find('.btn-set-3').on('click', () => {
            // Three synchronous state writes → one render (rAF batching)
            this.state.a = this.state.a + 1
            this.state.b = this.state.b + 10
            this.state.c = this.state.c + 100
        })

        this.find('.btn-use-setstate').on('click', () => {
            // Explicit batch via setState()
            this.setState({
                a: this.state.a + 1,
                b: this.state.b + 10,
                c: this.state.c + 100
            })
        })
    }

    render() {
        this._renderCount++
        this.find('.val-a').text(this.state.a)
        this.find('.val-b').text(this.state.b)
        this.find('.val-c').text(this.state.c)
        this.find('.render-count').text(this._renderCount)
    }
}

const batchTest = new BatchTest()
batchTest.init()
batchTest.appendTo($('#batch-container'))
