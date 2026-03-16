import { SourceAssignmentBoard } from '../../../../widgets/containers/SourceAssignmentBoard.js'

/* ── Sample news-source data (subset of Middle East channels) ── */

const sources = [
    {
        category: 'Arabic News Networks',
        items: [
            { name: 'Al Jazeera Arabic', language: 'Arabic', based_in: 'Qatar', notes: 'Flagship pan-Arab news' },
            { name: 'Al Arabiya', language: 'Arabic', based_in: 'UAE', notes: 'Saudi-owned, MBC Group' },
            { name: 'Sky News Arabia', language: 'Arabic', based_in: 'UAE', notes: 'Abu Dhabi joint venture' },
            { name: 'Al Mayadeen', language: 'Arabic', based_in: 'Lebanon', notes: 'Beirut-based, resistance axis' },
            { name: 'RT Arabic', language: 'Arabic', based_in: 'Russia', notes: 'Russian state-funded Arabic service' },
            { name: 'France 24 Arabic', language: 'Arabic', based_in: 'France', notes: 'French public broadcaster Arabic desk' }
        ]
    },
    {
        category: 'Conflict Tracking',
        items: [
            { name: 'Liveuamap', language: 'English', based_in: 'Ukraine', notes: 'Real-time conflict mapping' },
            { name: 'ACLED', language: 'English', based_in: 'USA', notes: 'Armed Conflict Location & Event Data' },
            { name: 'Bellingcat', language: 'English', based_in: 'Netherlands', notes: 'Open-source investigations' },
            { name: 'Syrian Observatory for Human Rights', language: 'English', based_in: 'UK', notes: 'Syria conflict tracking' }
        ]
    },
    {
        category: 'Israeli Media',
        items: [
            { name: 'Haaretz', language: 'Hebrew', based_in: 'Israel', notes: 'Liberal-leaning daily newspaper' },
            { name: 'The Times of Israel', language: 'English', based_in: 'Israel', notes: 'English-language Israeli news' },
            { name: 'Ynet News', language: 'English', based_in: 'Israel', notes: 'Yedioth Ahronoth online' },
            { name: 'i24 News', language: 'English', based_in: 'Israel', notes: '24-hour international news channel' },
            { name: 'Channel 12 News', language: 'Hebrew', based_in: 'Israel', notes: 'Most-watched Israeli TV channel' }
        ]
    },
    {
        category: 'Iranian Media',
        items: [
            { name: 'Press TV', language: 'English', based_in: 'Iran', notes: 'Iranian state English-language' },
            { name: 'IRNA', language: 'Persian', based_in: 'Iran', notes: 'Islamic Republic News Agency' },
            { name: 'Tasnim News', language: 'Persian', based_in: 'Iran', notes: 'IRGC-affiliated agency' },
            { name: 'Fars News', language: 'Persian', based_in: 'Iran', notes: 'Semi-official news agency' }
        ]
    },
    {
        category: 'Lebanese Media',
        items: [
            { name: 'L\'Orient Today', language: 'English', based_in: 'Lebanon', notes: 'English edition of L\'Orient-Le Jour' },
            { name: 'Al-Akhbar', language: 'Arabic', based_in: 'Lebanon', notes: 'Left-leaning daily' },
            { name: 'MTV Lebanon', language: 'Arabic', based_in: 'Lebanon', notes: 'Murr Television network' }
        ]
    },
    {
        category: 'Gulf Media',
        items: [
            { name: 'Gulf News', language: 'English', based_in: 'UAE', notes: 'Dubai-based English daily' },
            { name: 'Arab News', language: 'English', based_in: 'Saudi Arabia', notes: 'Saudi English-language daily' },
            { name: 'The National', language: 'English', based_in: 'UAE', notes: 'Abu Dhabi-based, ADNOC owned' },
            { name: 'Al Jazeera English', language: 'English', based_in: 'Qatar', notes: 'English arm of Al Jazeera' }
        ]
    },
    {
        category: 'OSINT & Analysts',
        items: [
            { name: 'Charles Lister', language: 'English', based_in: 'USA', notes: 'MEI Syria/counterterrorism analyst' },
            { name: 'Farnaz Fassihi', language: 'English', based_in: 'USA', notes: 'NYT Iran/ME correspondent' },
            { name: 'Barak Ravid', language: 'English', based_in: 'USA', notes: 'Axios, Israeli diplomacy' },
            { name: 'Elijah Magnier', language: 'English', based_in: 'Brussels', notes: 'Veteran war correspondent' }
        ]
    },
    {
        category: 'Wire Services',
        items: [
            { name: 'Reuters Middle East', language: 'English', based_in: 'UK', notes: 'ME bureau of Reuters' },
            { name: 'AP Middle East', language: 'English', based_in: 'USA', notes: 'Associated Press ME desk' },
            { name: 'AFP Middle East', language: 'English', based_in: 'France', notes: 'Agence France-Presse ME' }
        ]
    }
]

/* ── Board ── */

const board = new SourceAssignmentBoard({
    sources,
    lanes: [
        { id: 'watch', title: 'Watch List' },
        { id: 'priority', title: 'Priority Sources' },
        { id: 'archive', title: 'Archive' }
    ],
    cardFields: {
        title: 'name',
        subtitle: 'notes',
        badge: 'language'
    },
    sourceTitle: 'News Sources',
    expandAll: false
})

board.appendTo($('#demo-board'))
await board.init()

/* ── Event Log ── */

const $log = $('#event-log')

function log(msg) {
    const ts = new Date().toLocaleTimeString()
    $log.prepend(`[${ts}] ${msg}\n`)
}

board.on('assign', e => log(`ASSIGN: "${e.item.name}" → lane "${e.lane}"`))
board.on('unassign', e => log(`UNASSIGN: "${e.item.name}" ← lane "${e.fromLane}"`))
board.on('transfer', e => log(`TRANSFER: "${e.item.name}" from "${e.fromLane}" → "${e.toLane}"`))
board.on('reorder', e => log(`REORDER: "${e.item.name}" in "${e.lane}" (${e.fromIndex} → ${e.toIndex})`))
board.on('trash', e => log(`TRASH: "${e.item.name}" removed from "${e.fromLane}"`))
board.on('search', e => log(`SEARCH: "${e.query}" — ${e.matchCount} match(es)`))

/* ── Toolbar Buttons ── */

$('#btn-assignments').on('click', () => {
    const assignments = board.getAssignments()
    for (const [laneId, items] of Object.entries(assignments)) {
        const names = items.map(i => i.name).join(', ')
        log(`  ${laneId}: [${names || 'empty'}]`)
    }
    log('ASSIGNMENTS:')
})

$('#btn-expand').on('click', () => board.expandAll())
$('#btn-collapse').on('click', () => board.collapseAll())
$('#btn-clear-log').on('click', () => $log.text('Waiting for events...'))
