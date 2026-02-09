/**
 * CollapsiblePane Examples
 */
import { CollapsiblePane } from '../../../../widgets/containers/CollapsiblePane.js'

const $ = window.jQuery

// ── Event log helper ───────────────────────────────────────────────

/**
 * Log a pane event to the on-screen event log.
 * @param {string} pane - Pane label (e.g. 'Left', 'Right')
 * @param {string} event - Event name (e.g. 'collapse', 'expand', 'resize')
 * @param {Object} [data={}] - Event data to display
 */
function log(pane, event, data = {}) {
    const el = document.getElementById('event-log')
    const time = new Date().toLocaleTimeString()
    const extra = Object.entries(data).map(([k, v]) => `${k}=${v}`).join(', ')
    const badge = event === 'collapse' ? 'bg-warning text-dark'
        : event === 'expand' ? 'bg-success'
        : 'bg-info'

    el.innerHTML = `<div class="log-entry">
        <span class="text-muted">${time}</span>
        <span class="badge ${badge}">${event}</span>
        <strong>${pane}</strong>
        ${extra ? `<span class="text-muted">— ${extra}</span>` : ''}
    </div>` + el.innerHTML
}

// ── Create panes ───────────────────────────────────────────────────

const leftPane = new CollapsiblePane({
    title: 'Explorer',
    dir: CollapsiblePane.LEFT,
    width: 220,
    minWidth: 140,
    maxWidth: 400
})

const centerPane = new CollapsiblePane({
    title: 'Editor',
    dir: CollapsiblePane.CENTER
})

const rightPane = new CollapsiblePane({
    title: 'Properties',
    dir: CollapsiblePane.RIGHT,
    width: 260,
    minWidth: 160,
    maxWidth: 450
})

// ── Mount ──────────────────────────────────────────────────────────

const $layout = $('#layout')
leftPane.appendTo($layout)
centerPane.appendTo($layout)
rightPane.appendTo($layout)

await Promise.all([leftPane.init(), centerPane.init(), rightPane.init()])

// ── Populate content ───────────────────────────────────────────────

leftPane.setContent(`
    <ul class="file-list">
        <li><i class="fas fa-folder text-warning"></i> src/</li>
        <li><i class="fas fa-folder text-warning"></i> components/</li>
        <li><i class="fab fa-js text-info"></i> App.js</li>
        <li><i class="fab fa-js text-info"></i> index.js</li>
        <li><i class="fab fa-css3-alt text-primary"></i> styles.css</li>
        <li><i class="fas fa-file-code text-secondary"></i> package.json</li>
        <li><i class="fas fa-file-code text-secondary"></i> tsconfig.json</li>
        <li><i class="fas fa-folder text-warning"></i> tests/</li>
        <li><i class="fab fa-js text-info"></i> utils.js</li>
        <li><i class="fas fa-file text-muted"></i> README.md</li>
    </ul>
`)

centerPane.setContent(`
    <div class="center-content">
        <h4>Welcome to CollapsiblePane</h4>
        <p class="text-muted">This is a three-pane layout demo. Try the following:</p>
        <ul>
            <li><strong>Collapse/Expand</strong> — Click a pane's header to toggle it.</li>
            <li><strong>Resize</strong> — Drag the edge between panes to resize.</li>
            <li><strong>Programmatic</strong> — Use the buttons above to control panes.</li>
        </ul>
        <hr>
        <h5>How it works</h5>
        <p>Each <code>CollapsiblePane</code> is a Widget placed inside a flex row container.
        Left and right panes use <code>flex: 0 0 {width}px</code> while the center pane
        uses <code>flex: 1 1 auto</code> to fill remaining space.</p>
        <p>Resize uses native <strong>pointer events</strong> (no jQuery UI). Collapse/expand
        animates via CSS <code>transition: flex-basis 0.3s</code>.</p>
        <div class="alert alert-info mt-3">
            <i class="fas fa-info-circle"></i>
            Check the event log at the bottom to see <code>collapse</code>, <code>expand</code>,
            and <code>resize</code> events in real time.
        </div>
    </div>
`)

rightPane.setContent(`
    <div class="p-2">
        <h6 class="px-1 mb-2 text-muted text-uppercase" style="font-size: 0.75em; letter-spacing: 0.05em;">Properties</h6>
        <table class="table table-sm props-table">
            <tr><th>Name</th><td>App.js</td></tr>
            <tr><th>Type</th><td>JavaScript</td></tr>
            <tr><th>Size</th><td>4.2 KB</td></tr>
            <tr><th>Modified</th><td>2 hours ago</td></tr>
            <tr><th>Author</th><td>developer</td></tr>
            <tr><th>Branch</th><td>main</td></tr>
        </table>
        <hr>
        <h6 class="px-1 mb-2 text-muted text-uppercase" style="font-size: 0.75em; letter-spacing: 0.05em;">Actions</h6>
        <div class="d-grid gap-1 px-1">
            <button class="btn btn-outline-primary btn-sm"><i class="fas fa-edit me-1"></i> Edit</button>
            <button class="btn btn-outline-secondary btn-sm"><i class="fas fa-copy me-1"></i> Duplicate</button>
            <button class="btn btn-outline-danger btn-sm"><i class="fas fa-trash me-1"></i> Delete</button>
        </div>
    </div>
`)

// ── Wire up events ─────────────────────────────────────────────────

leftPane.on('collapse', (d) => log('Left', 'collapse', d))
leftPane.on('expand', (d) => log('Left', 'expand', d))
leftPane.on('resize', (d) => log('Left', 'resize', d))

rightPane.on('collapse', (d) => log('Right', 'collapse', d))
rightPane.on('expand', (d) => log('Right', 'expand', d))
rightPane.on('resize', (d) => log('Right', 'resize', d))

// ── Control buttons ────────────────────────────────────────────────

document.getElementById('btn-toggle-left').addEventListener('click', () => leftPane.collapse())
document.getElementById('btn-toggle-right').addEventListener('click', () => rightPane.collapse())

document.getElementById('btn-collapse-all').addEventListener('click', () => {
    leftPane.collapse(true)
    rightPane.collapse(true)
})

document.getElementById('btn-expand-all').addEventListener('click', () => {
    leftPane.collapse(false)
    rightPane.collapse(false)
})

document.getElementById('btn-clear-log').addEventListener('click', () => {
    document.getElementById('event-log').innerHTML =
        '<div class="log-entry text-muted">Log cleared.</div>'
})

// ── Expose for console debugging ───────────────────────────────────

window.leftPane = leftPane
window.centerPane = centerPane
window.rightPane = rightPane
window.CollapsiblePane = CollapsiblePane

console.log('CollapsiblePane example loaded. Try: leftPane.collapse(), rightPane.width(300)')
