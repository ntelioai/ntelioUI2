/**
 * FileStack example — 4 files showcasing tab side / label orientation,
 * arbitrary widget hosting, and state preservation across switches.
 */
import { FileStack } from '../../../../widgets/containers/FileStack.js'
import { KanbanBoard } from '../../../../widgets/containers/KanbanBoard.js'
import { JsonDataProvider } from '../../../../data/JsonDataProvider.js'

const $ = window.jQuery

// ── Event log helper ───────────────────────────────────────────────

const logEl = document.getElementById('event-log')
function log(msg) {
    const time = new Date().toLocaleTimeString()
    logEl.textContent = `[${time}] ${msg}\n` + logEl.textContent
}

// ── Build the FileStack ────────────────────────────────────────────

const stack = new FileStack({
    tabSide: 'left',
    labelOrientation: 'vertical',
    files: [
        { id: 'overview', title: 'Overview', icon: 'fa-house',       color: '#4a90e2' },
        { id: 'tasks',    title: 'Tasks',    icon: 'fa-list-check',  color: '#3aab64' },
        { id: 'board',    title: 'Board',    icon: 'fa-columns',     color: '#e0a83b' },
        { id: 'notes',    title: 'Notes',    icon: 'fa-note-sticky', color: '#d65a3a' }
    ],
    activeId: 'overview',
    autoInit: false
})

stack.appendTo($('#stack-host'))
await stack.init()

// ── File 1: Overview — plain HTML via setContent() ─────────────────

stack.file('overview').setContent(`
    <div class="demo-content">
        <h4><i class="fas fa-house text-primary me-2"></i>Project Overview</h4>
        <p class="text-muted mb-2">Quarterly snapshot for the design system refresh.</p>
        <p>This file is rendered via <code>stack.file('overview').setContent(html)</code> —
        the simplest way to put markup into a tab.</p>
        <div class="stat-cards">
            <div class="stat-card"><div class="label">Open issues</div><div class="value">23</div></div>
            <div class="stat-card"><div class="label">Pull requests</div><div class="value">7</div></div>
            <div class="stat-card"><div class="label">Contributors</div><div class="value">12</div></div>
            <div class="stat-card"><div class="label">Released</div><div class="value">42%</div></div>
        </div>
        <hr class="my-4">
        <p class="text-muted small mb-0">
            Try clicking each tab — switching is instant, and each file keeps its own state.
        </p>
    </div>
`)

// ── File 2: Tasks — HTML list of items ─────────────────────────────

stack.file('tasks').setContent(`
    <div class="demo-content">
        <h4><i class="fas fa-list-check text-success me-2"></i>Tasks</h4>
        <p class="text-muted">Sample task list — proves arbitrary HTML rendering works.</p>
    </div>
    <ul class="task-list">
        <li><i class="fas fa-circle pri-high"></i>   <span>Migrate auth middleware to JWT</span></li>
        <li><i class="fas fa-circle pri-high"></i>   <span>Patch CVE-2024-1928 in image processor</span></li>
        <li><i class="fas fa-circle pri-medium"></i> <span>Implement onboarding email digest</span></li>
        <li><i class="fas fa-circle pri-medium"></i> <span>Refactor billing webhook handler</span></li>
        <li><i class="fas fa-circle pri-low"></i>    <span>Update copy on pricing page</span></li>
        <li><i class="fas fa-circle pri-low"></i>    <span>Bump dragula to latest</span></li>
        <li><i class="fas fa-circle pri-low"></i>    <span>Audit unused CSS variables</span></li>
    </ul>
`)

// ── File 3: Board — a real KanbanBoard widget ──────────────────────
// Demonstrates: arbitrary widget hosting + state preservation across switches.

const todoDP = new JsonDataProvider({
    data: [
        { id: '1', name: 'Design tokens',    description: 'Spacing scale + radii', priority: 'High' },
        { id: '2', name: 'Tab widget',       description: 'Folder-style stack',     priority: 'High' },
        { id: '3', name: 'Docs site theme',  description: 'Match new tokens',       priority: 'Low' }
    ],
    keyField: 'id',
    pageSize: 100
})

const doingDP = new JsonDataProvider({
    data: [
        { id: '4', name: 'Color palette',  description: 'Switch from HSL to OKLCH', priority: 'Medium' },
        { id: '5', name: 'Icon audit',     description: 'Drop duplicates',          priority: 'Low' }
    ],
    keyField: 'id',
    pageSize: 100
})

const doneDP = new JsonDataProvider({
    data: [
        { id: '6', name: 'Logo refresh', description: 'Approved by brand',  priority: 'Medium' },
        { id: '7', name: 'Type scale',   description: 'Modular 1.25 ratio', priority: 'Low' }
    ],
    keyField: 'id',
    pageSize: 100
})

const board = new KanbanBoard({
    columns: [
        { id: 'todo',  title: 'Backlog',  dataProvider: todoDP },
        { id: 'doing', title: 'Doing',    dataProvider: doingDP },
        { id: 'done',  title: 'Done',     dataProvider: doneDP }
    ],
    cardFields: { title: 'name', subtitle: 'description', badge: 'priority' },
    draggable: true,
    autoInit: false
})

// Wrap board in a sized host so it gets full pane height
const $boardHost = $(`<div class="kanban-host"></div>`)
stack.file('board').setContent(`
    <div class="demo-content pb-0">
        <h4 class="mb-1"><i class="fas fa-columns text-warning me-2"></i>Drag-and-drop Board</h4>
        <p class="text-muted small mb-2">
            Drag cards between columns, then switch to another tab and back — state is preserved.
        </p>
    </div>
`).getContentNode().append($boardHost)

board.appendTo($boardHost)
await board.init()

// ── File 4: Notes — a textarea (proves input focus + value persist) ─

stack.file('notes').setContent(`
    <textarea class="notes-pad" placeholder="Type here, switch tabs, come back — your text and cursor position are preserved."></textarea>
`)

// ── Wire stack events ──────────────────────────────────────────────

stack.on('select', ({ id, prevId }) => {
    log(`select  id=${id}  prevId=${prevId}`)
})

// ── Populate the "Jump to" select ──────────────────────────────────

const $jump = $('#sel-jump')
for (const id of stack.getFileIds()) {
    const cfg = stack.getFileConfig(id)
    $jump.append(`<option value="${id}">${cfg.title}</option>`)
}
$jump.val(stack.getActiveFileId())
$jump.on('change', (e) => stack.select(e.target.value))

stack.on('select', ({ id }) => { $jump.val(id) })

// ── Top-bar control buttons ────────────────────────────────────────

const $btnSide = $('#btn-flip-side')
$btnSide.on('click', () => {
    const next = stack._tabSide === 'left' ? 'right' : 'left'
    stack.setTabSide(next)
    $btnSide.text(`Tab side: ${next[0].toUpperCase()}${next.slice(1)}`)
})

const $btnLabels = $('#btn-flip-labels')
$btnLabels.on('click', () => {
    const next = stack._labelOrientation === 'vertical' ? 'horizontal' : 'vertical'
    stack.setLabelOrientation(next)
    $btnLabels.text(`Labels: ${next[0].toUpperCase()}${next.slice(1)}`)
})

let tasksDisabled = false
const $btnDisable = $('#btn-toggle-disable')
$btnDisable.on('click', () => {
    tasksDisabled = !tasksDisabled
    if (tasksDisabled) {
        stack.disable('tasks')
        $btnDisable.text('Enable "tasks"')
    } else {
        stack.enable('tasks')
        $btnDisable.text('Disable "tasks"')
    }
})

document.getElementById('btn-clear-log').addEventListener('click', () => {
    logEl.textContent = 'Log cleared.\n'
})

// ── Expose for console debugging ───────────────────────────────────

window.stack = stack
window.board = board
console.log('FileStack example loaded. Try: stack.select("notes"), stack.setTabSide("right")')
