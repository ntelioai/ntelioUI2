import { GlobeMap } from '../../../../widgets/visualization/GlobeMap.js'

const $ = window.jQuery

// ── Read skin from URL query param ────────────────────────────────

const params = new URLSearchParams(window.location.search)
const skin = params.get('skin') || 'satellite'

// Highlight active skin button
$(`#btn-skin-${skin}`).removeClass('btn-outline-secondary').addClass('btn-secondary active')

// ── Create the globe ──────────────────────────────────────────────

const globeOptions = {
    skin,
    initialView: { lat: 20, lng: 10, altitude: 2.2 },
    autoRotate: true,
    autoRotateSpeed: 0.3
}

// For satellite skin, add point styling (political skin uses its own labels)
if (skin === 'satellite') {
    Object.assign(globeOptions, {
        pointRadius: d => Math.max(0.15, Math.sqrt(d.pop) * 4e-4),
        pointLabel: d => `${d.name} (pop: ${d.pop.toLocaleString()})`,
        pointColor: () => 'rgba(12, 122, 163, 0.75)'
    })
}

const globe = new GlobeMap(globeOptions)

globe.appendTo($('#globe-container'))
await globe.init()

// ── Load world cities data (satellite skin only — political loads its own) ──

if (skin === 'satellite') {
    const res = await fetch(
        'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_populated_places_simple.geojson'
    )
    const places = await res.json()

    const points = places.features.map(f => ({
        id: f.properties.name,
        name: f.properties.name,
        lat: f.properties.latitude,
        lng: f.properties.longitude,
        pop: f.properties.pop_max
    }))

    globe.setPoints(points)
}

// ── Wire events ───────────────────────────────────────────────────

const $log = $('#event-log')

function log(msg) {
    const line = $('<div>').text(`${new Date().toLocaleTimeString()} ${msg}`)
    $log.prepend(line)
    if ($log.children().length > 50) $log.children().last().remove()
}

globe.on('pointClick', ({ point }) => {
    log(`pointClick: ${point.name}`)
    globe.flyTo(point.lat, point.lng, 1.5, 800)
})

globe.on('pointHover', ({ point }) => {
    if (point) log(`pointHover: ${point.name}`)
})

globe.on('globeClick', ({ lat, lng }) => {
    log(`globeClick: ${lat.toFixed(2)}, ${lng.toFixed(2)}`)
})

globe.on('polygonClick', ({ polygon }) => {
    if (polygon) {
        const name = polygon.properties.ADMIN
        log(`polygonClick: ${name}`)
    }
})

globe.on('polygonHover', ({ polygon }) => {
    if (polygon) log(`polygonHover: ${polygon.properties.ADMIN}`)
})

// Update visible points list on view change (debounced)
let updateTimeout = null
globe.on('viewChange', () => {
    clearTimeout(updateTimeout)
    updateTimeout = setTimeout(updateVisibleList, 300)
})

function updateVisibleList() {
    const visible = globe.getVisiblePoints()
    $('#visible-count').text(visible.length)

    const $list = $('#visible-list').empty()
    visible
        .sort((a, b) => b.pop - a.pop)
        .slice(0, 20)
        .forEach(p => {
            const $item = $('<a href="#" class="list-group-item list-group-item-action py-1 px-2">')
                .text(`${p.name} — ${p.pop.toLocaleString()}`)
                .on('click', (e) => {
                    e.preventDefault()
                    globe.flyTo(p.lat, p.lng, 1.5, 800)
                })
            $list.append($item)
        })

    if (visible.length > 20) {
        $list.append($('<div class="list-group-item py-1 px-2 text-muted">').text(`… and ${visible.length - 20} more`))
    }
}

// Initial population
setTimeout(updateVisibleList, 1500)

// ── Navigation buttons ────────────────────────────────────────────

$('#btn-fly-beirut').on('click', () => globe.flyTo(33.89, 35.50, 1.5, 1000))
$('#btn-fly-tokyo').on('click', () => globe.flyTo(35.68, 139.69, 1.5, 1000))
$('#btn-fly-nyc').on('click', () => globe.flyTo(40.71, -74.01, 1.5, 1000))
$('#btn-fly-london').on('click', () => globe.flyTo(51.51, -0.13, 1.5, 1000))
$('#btn-reset').on('click', () => globe.setPointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 1000))

// ── Expose for console debugging ──────────────────────────────────

window.globe = globe
