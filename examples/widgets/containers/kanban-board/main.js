import { KanbanBoard } from '../../../../widgets/containers/KanbanBoard.js'
import { JsonDataProvider } from '../../../../data/JsonDataProvider.js'

// ── Sample Data ──────────────────────────────────────────────

const todoDP = new JsonDataProvider({
    data: [
        { id: '1', name: 'Design mockups',       description: 'Create wireframes for dashboard', priority: 'High',   icon: 'fas fa-pencil-alt' },
        { id: '2', name: 'Write API specs',       description: 'OpenAPI 3.0 documentation',      priority: 'Medium', icon: 'fas fa-file-code' },
        { id: '3', name: 'Set up CI pipeline',    description: 'GitHub Actions workflow',         priority: 'Low',    icon: 'fas fa-cogs' },
        { id: '7', name: 'Security audit',        description: 'Review auth flow for OWASP',     priority: 'High',   icon: 'fas fa-shield-alt' },
        { id: '8', name: 'Write unit tests',      description: 'Cover utility functions',        priority: 'Medium', icon: 'fas fa-vial' }
    ],
    keyField: 'id',
    pageSize: 100
})

const doingDP = new JsonDataProvider({
    data: [
        { id: '4', name: 'Build login page',      description: 'OAuth2 integration',             priority: 'High',   icon: 'fas fa-lock' },
        { id: '5', name: 'Database migration',     description: 'Migrate users table to v2',      priority: 'Medium', icon: 'fas fa-database' },
        { id: '9', name: 'Fix nav overflow',       description: 'Sidebar clips on mobile',        priority: 'Low',    icon: 'fas fa-bug' }
    ],
    keyField: 'id',
    pageSize: 100
})

const doneDP = new JsonDataProvider({
    data: [
        { id: '6',  name: 'Project setup',        description: 'Repo, linter, dependencies',     priority: 'Low',    icon: 'fas fa-check' },
        { id: '10', name: 'Environment config',    description: 'Dev, staging, production envs',  priority: 'Medium', icon: 'fas fa-server' }
    ],
    keyField: 'id',
    pageSize: 100
})

// ── Event Log ────────────────────────────────────────────────

const logEl = document.getElementById('event-log')
function log(msg) {
    const time = new Date().toLocaleTimeString()
    logEl.textContent += `\n[${time}] ${msg}`
    logEl.scrollTop = logEl.scrollHeight
}

// ── Create Board ─────────────────────────────────────────────

const board = new KanbanBoard({
    columns: [
        { id: 'todo',  title: 'To Do',        dataProvider: todoDP },
        { id: 'doing', title: 'In Progress',  dataProvider: doingDP },
        { id: 'done',  title: 'Done',         dataProvider: doneDP }
    ],
    cardFields: {
        title: 'name',
        subtitle: 'description',
        badge: 'priority',
        icon: 'icon'
    },
    groupBy: 'priority',
    groupOrder: ['High', 'Medium', 'Low'],
    draggable: true
})

board.appendTo($('#demo-kanban'))
await board.init()

// ── Wire Events ──────────────────────────────────────────────

board.on('transfer', (data) => {
    log(`TRANSFER: "${data.item.name}" from ${data.fromColumn} → ${data.toColumn} at index ${data.index}`)
})

board.on('reorder', (data) => {
    log(`REORDER: "${data.item.name}" in ${data.column} from index ${data.fromIndex} → ${data.toIndex}`)
})

board.on('select', (data) => {
    log(`SELECT: "${data.item?.name}" in column ${data.column}`)
})

log('KanbanBoard initialized')

// ── Buttons ──────────────────────────────────────────────────

document.getElementById('btn-refresh').addEventListener('click', () => {
    board.refresh()
    log('Board refreshed')
})

document.getElementById('btn-add-col').addEventListener('click', async () => {
    const reviewDP = new JsonDataProvider({
        data: [
            { id: '99', name: 'Sample review item', description: 'Added dynamically', priority: 'Low', icon: 'fas fa-eye' }
        ],
        keyField: 'id',
        pageSize: 100
    })
    await board.addColumn({ id: 'review', title: 'In Review', dataProvider: reviewDP })
    log('Added "In Review" column')
})

document.getElementById('btn-clear-log').addEventListener('click', () => {
    logEl.textContent = 'Waiting for events...'
})

// ── Debug ────────────────────────────────────────────────────

window.board = board
console.log('KanbanBoard example loaded. Try: board.refresh(), board.getSelected()')
