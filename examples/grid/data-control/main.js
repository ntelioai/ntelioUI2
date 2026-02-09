import { DataControl } from '../../../grid/DataControl.js'
import { JsonDataProvider } from '../../../data/JsonDataProvider.js'

// ─── Sample Data ─────────────────────────────────────────────

const employees = [
    { id: '1',  name: 'Alice Johnson',   department: 'Engineering', role: 'Senior Developer',   salary: 120000, status: 'Active' },
    { id: '2',  name: 'Bob Smith',       department: 'Marketing',   role: 'Marketing Manager',  salary: 95000,  status: 'Active' },
    { id: '3',  name: 'Carol Williams',  department: 'Engineering', role: 'Tech Lead',          salary: 135000, status: 'Active' },
    { id: '4',  name: 'David Brown',     department: 'Sales',       role: 'Account Executive',  salary: 85000,  status: 'Active' },
    { id: '5',  name: 'Eve Davis',       department: 'HR',          role: 'HR Director',        salary: 110000, status: 'Active' },
    { id: '6',  name: 'Frank Miller',    department: 'Engineering', role: 'Junior Developer',   salary: 75000,  status: 'On Leave' },
    { id: '7',  name: 'Grace Wilson',    department: 'Design',      role: 'UX Designer',        salary: 90000,  status: 'Active' },
    { id: '8',  name: 'Hank Moore',      department: 'Sales',       role: 'Sales Director',     salary: 125000, status: 'Active' },
    { id: '9',  name: 'Ivy Taylor',      department: 'Engineering', role: 'DevOps Engineer',    salary: 115000, status: 'Active' },
    { id: '10', name: 'Jack Anderson',   department: 'Marketing',   role: 'Content Writer',     salary: 65000,  status: 'Active' },
    { id: '11', name: 'Kate Thomas',     department: 'Engineering', role: 'QA Engineer',        salary: 88000,  status: 'Active' },
    { id: '12', name: 'Leo Jackson',     department: 'Finance',     role: 'Financial Analyst',  salary: 92000,  status: 'Active' },
    { id: '13', name: 'Mia White',       department: 'Design',      role: 'Product Designer',   salary: 97000,  status: 'On Leave' },
    { id: '14', name: 'Noah Harris',     department: 'Engineering', role: 'Backend Developer',  salary: 105000, status: 'Active' },
    { id: '15', name: 'Olivia Martin',   department: 'HR',          role: 'Recruiter',          salary: 70000,  status: 'Active' },
    { id: '16', name: 'Peter Garcia',    department: 'Sales',       role: 'Sales Rep',          salary: 60000,  status: 'Active' },
    { id: '17', name: 'Quinn Robinson',  department: 'Engineering', role: 'Frontend Developer', salary: 100000, status: 'Active' },
    { id: '18', name: 'Rachel Clark',    department: 'Finance',     role: 'Controller',         salary: 130000, status: 'Active' },
    { id: '19', name: 'Sam Lewis',       department: 'Marketing',   role: 'SEO Specialist',     salary: 72000,  status: 'Active' },
    { id: '20', name: 'Tina Walker',     department: 'Design',      role: 'Art Director',       salary: 115000, status: 'Active' }
]

// ─── Logging ─────────────────────────────────────────────────

const logEl = document.getElementById('event-log')
function log(msg) {
    const time = new Date().toLocaleTimeString()
    logEl.textContent += `\n[${time}] ${msg}`
    logEl.scrollTop = logEl.scrollHeight
}

document.getElementById('btn-clear-log').addEventListener('click', () => {
    logEl.textContent = 'Waiting for events...'
})

// ─── Demo 1: Full DataControl ────────────────────────────────

const dp1 = new JsonDataProvider({
    data: employees,
    keyField: 'id',
    columns: [
        { name: 'name',       title: 'Name',       sortable: true, width: '180px' },
        { name: 'department', title: 'Department',  sortable: true, width: '130px' },
        { name: 'role',       title: 'Role',        sortable: true },
        { name: 'salary',     title: 'Salary',      sortable: true, width: '100px',
          formatter: (val) => val ? `$${Number(val).toLocaleString()}` : '' },
        { name: 'status',     title: 'Status',      sortable: true, width: '90px',
          formatter: (val) => {
              const cls = val === 'Active' ? 'bg-success' : 'bg-warning text-dark'
              return `<span class="badge ${cls}">${val}</span>`
          }
        }
    ],
    pageSize: 5
})

const grid1 = new DataControl({
    dataProvider: dp1,
    selectable: true,
    showSearch: true,
    autoInit: false
})

grid1.on('modeChange', (data) => log(`Mode: ${data.previousMode} → ${data.mode}`))
grid1.on('rowClick', (data) => log(`Row clicked: ${data.key} (${data.row?.name || '?'})`))
grid1.on('save', (data) => log(`Saved: ${JSON.stringify(data.data)} (new=${data.isNew})`))
grid1.on('delete', (data) => log(`Deleted: ${data.keys.join(', ')}`))
grid1.on('dataRefresh', (data) => log(`Refresh: page ${data.pageResult.page}/${data.pageResult.totalPages}, ${data.pageResult.totalRows} rows`))

grid1.init().then(() => {
    grid1.appendTo($('#demo-grid'))
    log('Demo 1 initialized')
})

// ─── Demo 2: Persistent Grid (localStorage) ─────────────────

const seedData = [
    { id: '1', item: 'Laptop',    category: 'Electronics', price: 999 },
    { id: '2', item: 'Desk Chair', category: 'Furniture',  price: 349 },
    { id: '3', item: 'Monitor',   category: 'Electronics', price: 499 }
]

const dp2 = new JsonDataProvider({
    data: seedData,
    keyField: 'id',
    columns: [
        { name: 'item',     title: 'Item',     sortable: true },
        { name: 'category', title: 'Category', sortable: true, width: '130px' },
        { name: 'price',    title: 'Price',    sortable: true, width: '100px',
          formatter: (val) => val ? `$${Number(val).toLocaleString()}` : '' }
    ],
    pageSize: 10,
    storageKey: 'ntelioUI2-grid-demo-persistent'
})

const grid2 = new DataControl({
    dataProvider: dp2,
    selectable: true,
    showSearch: true,
    autoInit: false
})

grid2.on('save', (data) => log(`[Persistent] Saved: ${JSON.stringify(data.data)}`))
grid2.on('delete', (data) => log(`[Persistent] Deleted: ${data.keys.join(', ')}`))

grid2.init().then(() => {
    grid2.appendTo($('#demo-persistent'))
    log('Demo 2 (persistent) initialized')
})

document.getElementById('btn-clear-storage').addEventListener('click', () => {
    localStorage.removeItem('ntelioUI2-grid-demo-persistent')
    log('[Persistent] localStorage cleared — refresh page to see seed data')
})
