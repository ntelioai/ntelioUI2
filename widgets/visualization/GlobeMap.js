/**
 * GlobeMap — Interactive 3D globe with point markers.
 *
 * Wraps [Globe.gl](https://globe.gl/) as an ntelioUI2 widget with a light
 * color scheme suited for information / intelligence dashboards. Supports
 * programmatic pin placement, camera navigation, click interaction, and
 * querying which points are currently visible in the viewport.
 *
 * Two built-in skins:
 * - `'satellite'` — Earth day imagery with topography (default)
 * - `'political'` — Clean flat globe with country borders, country labels,
 *   and zoom-dependent city labels
 *
 * Globe.gl is loaded automatically from CDN on first init.
 *
 * @extends Widget
 * @category Visualization
 *
 * @fires GlobeMap#pointClick    - Point clicked: `{ point, event, coords }`
 * @fires GlobeMap#pointHover    - Hover enter/leave: `{ point, prevPoint }`
 * @fires GlobeMap#globeClick    - Globe surface clicked: `{ lat, lng, event }`
 * @fires GlobeMap#polygonClick  - Country polygon clicked: `{ polygon, event, coords }`
 * @fires GlobeMap#polygonHover  - Country polygon hover: `{ polygon, prevPolygon }`
 * @fires GlobeMap#viewChange    - Camera moved: `{ pov: { lat, lng, altitude } }`
 *
 * @example
 * // Satellite skin (default)
 * const globe = new GlobeMap({
 *     initialView: { lat: 33.89, lng: 35.50, altitude: 2 },
 *     pointLabel: d => `${d.name} (${d.pop.toLocaleString()})`,
 *     pointRadius: d => Math.sqrt(d.pop) * 4e-4
 * })
 *
 * @example
 * // Political skin — clean borders, no satellite imagery
 * const globe = new GlobeMap({
 *     skin: 'political',
 *     initialView: { lat: 33.89, lng: 35.50, altitude: 2 }
 * })
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

const GLOBE_GL_JS = 'https://unpkg.com/globe.gl'
const COUNTRIES_GEOJSON = 'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson'
const CITIES_GEOJSON = 'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_populated_places_simple.geojson'

const template = `<div class="nui-globe-map"></div>`

/**
 * Skin presets. Each skin defines overrides applied on top of defaults.
 * @private
 */
const SKIN_PRESETS = {
    satellite: {
        // Uses all defaults — earth-day imagery
    },
    political: {
        globeImageUrl: '',
        bumpImageUrl: '',
        showGraticules: false,
        // Ocean color, border styling, and polygon config
        // are applied in _applySkinPolitical()
        _political: true
    }
}

/**
 * Population thresholds for zoom-dependent city labels.
 * Maps altitude ranges to minimum population for a city to be labeled.
 * Lower altitude (more zoomed in) = show smaller cities.
 * @private
 */
const LABEL_ZOOM_THRESHOLDS = [
    { maxAltitude: 0.8,  minPop: 100_000 },
    { maxAltitude: 1.2,  minPop: 500_000 },
    { maxAltitude: 1.8,  minPop: 2_000_000 },
    { maxAltitude: 2.5,  minPop: 5_000_000 },
    { maxAltitude: Infinity, minPop: 10_000_000 }
]

/** @category Visualization */
export class GlobeMap extends Widget {

    /** Default configuration */
    static defaults = {
        // Skin: 'satellite' or 'political'
        skin: 'satellite',

        // Globe appearance
        backgroundColor: '#f0f4f8',
        globeImageUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg',
        bumpImageUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
        showGraticules: true,
        showAtmosphere: true,
        atmosphereColor: 'lightskyblue',
        atmosphereAltitude: 0.2,
        animateIn: true,

        // Point styling
        pointColor: 'rgba(12, 122, 163, 0.75)',
        pointAltitude: 0.01,
        pointRadius: 0.3,
        pointLabel: 'name',
        pointLat: 'lat',
        pointLng: 'lng',
        pointResolution: 12,
        pointsMerge: false,
        pointsTransitionDuration: 800,

        // Label styling
        labelColor: 'rgba(33, 37, 41, 0.85)',
        labelSize: 0.5,
        labelDotRadius: 0.3,
        labelResolution: 2,

        // Camera
        initialView: { lat: 30, lng: 30, altitude: 2.5 },

        // Controls
        enableZoom: true,
        enableRotate: true,
        autoRotate: false,
        autoRotateSpeed: 0.5
    }

    /**
     * @param {Object} params
     * @param {string}  [params.skin='satellite']                 - Skin preset: 'satellite' or 'political'
     * @param {string}  [params.backgroundColor='#f0f4f8']       - Scene background color
     * @param {string}  [params.globeImageUrl]                    - Globe texture URL
     * @param {string}  [params.bumpImageUrl]                     - Bump map URL for topography
     * @param {boolean} [params.showGraticules=true]              - Show lat/lng grid
     * @param {boolean} [params.showAtmosphere=true]              - Show atmosphere glow
     * @param {string}  [params.atmosphereColor='lightskyblue']   - Atmosphere color
     * @param {number}  [params.atmosphereAltitude=0.2]           - Atmosphere thickness
     * @param {boolean} [params.animateIn=true]                   - Animate globe on load
     * @param {string|function}  [params.pointColor]              - Point color (accessor or constant)
     * @param {number|function}  [params.pointAltitude=0.01]      - Point height above surface
     * @param {number|function}  [params.pointRadius=0.3]         - Point radius (accessor or constant)
     * @param {string|function}  [params.pointLabel='name']       - Point tooltip (accessor or field name)
     * @param {string|function}  [params.pointLat='lat']          - Latitude accessor
     * @param {string|function}  [params.pointLng='lng']          - Longitude accessor
     * @param {Object}  [params.initialView]                      - Initial camera `{ lat, lng, altitude }`
     * @param {boolean} [params.enableZoom=true]                  - Allow scroll zoom
     * @param {boolean} [params.enableRotate=true]                - Allow drag rotation
     * @param {boolean} [params.autoRotate=false]                 - Auto-rotate the globe
     * @param {number}  [params.autoRotateSpeed=0.5]              - Auto-rotation speed
     * @param {Array<Object>} [params.points]                     - Initial points data
     */
    constructor(params = {}) {
        // Merge: defaults → skin preset → user params
        const skinName = params.skin || GlobeMap.defaults.skin
        const skinPreset = SKIN_PRESETS[skinName] || {}
        const config = { ...GlobeMap.defaults, ...skinPreset, ...params, skin: skinName }
        super({ ...config, template, autoInit: false })

        this._config = config
        this._points = []
        this._pointMap = new Map()
        this._globe = null
        this._GlobeGL = null
        this._resizeObserver = null
        this._resizeTimeout = null
        this._onViewChange = null
        this._viewChangeRAF = null
        this._countriesData = null
        this._citiesData = null
        this._lastLabelAltitude = null
    }

    // ── Lifecycle ─────────────────────────────────────────────────

    async init() {
        // 1. Load widget CSS
        await ResourceLoader.loadCss(
            '../../css/widgets/visualization/globe-map.css',
            import.meta.url
        )

        // 2. Load Globe.gl from CDN (sets window.Globe)
        await ResourceLoader.loadScript(GLOBE_GL_JS)

        // Capture the Globe.gl constructor before anything overwrites it
        this._GlobeGL = window.Globe

        // 3. Create and configure the globe instance
        this._initGlobe()

        // 4. Apply skin-specific setup
        if (this._config._political) {
            await this._applySkinPolitical()
        }

        // 5. Responsive sizing
        this._initResizeObserver()

        // 6. Load initial points if provided
        if (this._config.points) {
            this.setPoints(this._config.points)
        }
    }

    beforeDestroy() {
        // 1. Disconnect ResizeObserver
        if (this._resizeObserver) {
            this._resizeObserver.disconnect()
            this._resizeObserver = null
        }

        // 2. Clear timers
        clearTimeout(this._resizeTimeout)
        if (this._viewChangeRAF) {
            cancelAnimationFrame(this._viewChangeRAF)
        }

        // 3. Clean up orbit controls listener
        if (this._globe && this._onViewChange) {
            try {
                const controls = this._globe.controls()
                if (controls) {
                    controls.removeEventListener('change', this._onViewChange)
                }
            } catch (_) { /* controls may already be disposed */ }
        }

        // 4. Dispose Globe.gl / Three.js resources
        if (this._globe) {
            try {
                // Dispose WebGL renderer
                const renderer = this._globe.renderer()
                if (renderer) {
                    renderer.dispose()
                    renderer.forceContextLoss()
                }
            } catch (_) { /* may already be gone */ }

            try {
                // Dispose scene geometries, materials, textures
                const scene = this._globe.scene()
                if (scene) {
                    scene.traverse(obj => {
                        if (obj.geometry) obj.geometry.dispose()
                        if (obj.material) {
                            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
                            for (const m of mats) {
                                for (const val of Object.values(m)) {
                                    if (val && typeof val.dispose === 'function') val.dispose()
                                }
                                m.dispose()
                            }
                        }
                    })
                }
            } catch (_) { /* non-critical */ }

            // Stop the animation loop
            try {
                if (typeof this._globe.pauseAnimation === 'function') {
                    this._globe.pauseAnimation()
                }
            } catch (_) {}

            // Remove all canvases Globe.gl injected
            const container = this.node[0]
            if (container) {
                container.querySelectorAll('canvas').forEach(c => c.remove())
            }
            this._globe = null
        }

        // 5. Clear data
        this._points = []
        this._pointMap.clear()
    }

    // ── Public API: Point Management ──────────────────────────────

    /**
     * Replace all points on the globe.
     * @param {Array<Object>} points - Point objects with lat/lng and optionally id, name, color, radius
     * @returns {GlobeMap} this
     */
    setPoints(points) {
        if (this._destroyed) return this
        this._points = [...points]
        this._rebuildPointMap()
        if (this._globe) {
            this._globe.pointsData(this._points)
        }
        return this
    }

    /**
     * Add a single point.
     * @param {Object} point
     * @returns {GlobeMap} this
     */
    addPoint(point) {
        if (this._destroyed) return this
        this._points.push(point)
        if (point.id !== undefined) {
            this._pointMap.set(String(point.id), point)
        }
        if (this._globe) {
            this._globe.pointsData([...this._points])
        }
        return this
    }

    /**
     * Remove a point by id.
     * @param {string|number} id
     * @returns {GlobeMap} this
     */
    removePoint(id) {
        if (this._destroyed) return this
        const key = String(id)
        this._points = this._points.filter(p => String(p.id) !== key)
        this._pointMap.delete(key)
        if (this._globe) {
            this._globe.pointsData([...this._points])
        }
        return this
    }

    /**
     * Get all current points (copy).
     * @returns {Array<Object>}
     */
    getPoints() {
        return [...this._points]
    }

    // ── Public API: Camera / Navigation ───────────────────────────

    /**
     * Animate the camera to a location.
     * @param {number} lat
     * @param {number} lng
     * @param {number} [altitude=2.0] - Camera altitude in globe radii
     * @param {number} [duration=1000] - Transition ms
     * @returns {GlobeMap} this
     */
    flyTo(lat, lng, altitude = 2.0, duration = 1000) {
        if (this._destroyed || !this._globe) return this
        this._globe.pointOfView({ lat, lng, altitude }, duration)
        return this
    }

    /**
     * Set the camera point of view.
     * @param {{ lat?: number, lng?: number, altitude?: number }} pov
     * @param {number} [duration=0]
     * @returns {GlobeMap} this
     */
    setPointOfView(pov, duration = 0) {
        if (this._destroyed || !this._globe) return this
        this._globe.pointOfView(pov, duration)
        return this
    }

    /**
     * Get the current camera point of view.
     * @returns {{ lat: number, lng: number, altitude: number } | null}
     */
    getPointOfView() {
        return this._globe ? this._globe.pointOfView() : null
    }

    // ── Public API: Visibility Query ──────────────────────────────

    /**
     * Get points currently visible in the viewport.
     * Projects each point to screen coordinates and filters to those
     * within the canvas bounds.
     * @returns {Array<Object>}
     */
    getVisiblePoints() {
        if (this._destroyed || !this._globe) return []

        const container = this.node[0]
        const w = container.clientWidth
        const h = container.clientHeight
        const latFn = this._resolveAccessor(this._config.pointLat)
        const lngFn = this._resolveAccessor(this._config.pointLng)

        return this._points.filter(p => {
            const lat = latFn(p)
            const lng = lngFn(p)
            const coords = this._globe.getScreenCoords(lat, lng)
            if (!coords) return false
            const { x, y } = coords
            return x >= 0 && x <= w && y >= 0 && y <= h
        })
    }

    // ── Public API: Advanced ──────────────────────────────────────

    /**
     * Get the underlying Globe.gl instance for advanced customization
     * (arcs, polygons, rings, custom layers, etc.).
     * @returns {Object|null}
     */
    getGlobeInstance() {
        return this._globe
    }

    /**
     * Set Globe.gl properties dynamically.
     * Keys are Globe.gl setter method names, values are the arguments.
     * @param {Object} options
     * @returns {GlobeMap} this
     */
    setOptions(options) {
        if (this._destroyed || !this._globe) return this
        Object.entries(options).forEach(([key, value]) => {
            if (typeof this._globe[key] === 'function') {
                this._globe[key](value)
            }
        })
        return this
    }

    // ── Private: Initialization ───────────────────────────────────

    /** @private */
    _initGlobe() {
        const container = this.node[0]
        const cfg = this._config

        const globe = this._GlobeGL()(container)

        // Appearance
        globe
            .backgroundColor(cfg.backgroundColor)
            .globeImageUrl(cfg.globeImageUrl)
            .showGraticules(cfg.showGraticules)
            .showAtmosphere(cfg.showAtmosphere)
            .atmosphereColor(cfg.atmosphereColor)
            .atmosphereAltitude(cfg.atmosphereAltitude)

        if (cfg.bumpImageUrl) {
            globe.bumpImageUrl(cfg.bumpImageUrl)
        }

        // Point layer styling
        globe
            .pointColor(cfg.pointColor)
            .pointAltitude(cfg.pointAltitude)
            .pointRadius(cfg.pointRadius)
            .pointLabel(cfg.pointLabel)
            .pointLat(cfg.pointLat)
            .pointLng(cfg.pointLng)
            .pointResolution(cfg.pointResolution)
            .pointsMerge(cfg.pointsMerge)
            .pointsTransitionDuration(cfg.pointsTransitionDuration)

        // Light theme lighting adjustment
        this._configureLighting(globe)

        // Initial camera
        globe.pointOfView(cfg.initialView, 0)

        // Orbit controls
        const controls = globe.controls()
        controls.enableZoom = cfg.enableZoom
        controls.enableRotate = cfg.enableRotate
        controls.autoRotate = cfg.autoRotate
        controls.autoRotateSpeed = cfg.autoRotateSpeed

        // Wire Globe.gl events → ntelioUI2 widget events
        globe.onPointClick((point, event, coords) => {
            this.emit('pointClick', { point, event, coords })
        })

        globe.onPointHover((point, prevPoint) => {
            this.emit('pointHover', { point, prevPoint })
        })

        globe.onGlobeClick(({ lat, lng }, event) => {
            this.emit('globeClick', { lat, lng, event })
        })

        // Throttled viewChange (one per animation frame)
        this._onViewChange = () => {
            if (this._viewChangeRAF) return
            this._viewChangeRAF = requestAnimationFrame(() => {
                this._viewChangeRAF = null
                if (!this._destroyed && this._globe) {
                    this.emit('viewChange', { pov: this._globe.pointOfView() })
                    // Update zoom-dependent city labels for political skin
                    if (this._config._political) {
                        this._updateLabelsForZoom()
                    }
                }
            })
        }
        controls.addEventListener('change', this._onViewChange)

        // Initial sizing
        const rect = container.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
            globe.width(rect.width).height(rect.height)
        }

        this._globe = globe
    }

    /** @private - Adjust lighting for the light color scheme */
    _configureLighting(globe) {
        try {
            const lights = globe.lights()
            if (lights && lights.length >= 2) {
                // Default: [AmbientLight, DirectionalLight]
                // Brighten ambient to reduce harsh shadows on light globe
                lights[0].intensity = 1.2
                // Soften directional to avoid dark southern hemisphere
                lights[1].intensity = 0.6
            }
        } catch (_) {
            // lights() may not be available until globe is ready
        }
    }

    /** @private */
    _initResizeObserver() {
        const container = this.node[0]

        this._resizeObserver = new ResizeObserver((entries) => {
            clearTimeout(this._resizeTimeout)
            this._resizeTimeout = setTimeout(() => {
                if (this._destroyed || !this._globe) return
                const entry = entries[0]
                if (entry) {
                    const { width, height } = entry.contentRect
                    if (width > 0 && height > 0) {
                        this._globe.width(width).height(height)
                    }
                }
            }, 100)
        })

        this._resizeObserver.observe(container)
    }

    // ── Private: Political Skin ──────────────────────────────────

    /** @private - Load country + city data and configure the political skin */
    async _applySkinPolitical() {
        const globe = this._globe

        // Set ocean color via globe material
        try {
            const material = globe.globeMaterial()
            material.color.set('#dce3eb')
            material.emissive.set('#dce3eb')
            material.emissiveIntensity = 0.1
        } catch (_) { /* material may not be ready */ }

        // Fetch countries and cities in parallel
        const [countriesRes, citiesRes] = await Promise.all([
            fetch(COUNTRIES_GEOJSON),
            fetch(CITIES_GEOJSON)
        ])
        const countries = await countriesRes.json()
        const cities = await citiesRes.json()

        this._countriesData = countries.features.filter(
            d => d.properties.ISO_A2 !== 'AQ'
        )
        this._citiesData = cities.features.map(f => ({
            lat: f.properties.latitude,
            lng: f.properties.longitude,
            name: f.properties.name,
            pop: f.properties.pop_max,
            country: f.properties.adm0name
        }))

        // Country polygons
        globe
            .polygonsData(this._countriesData)
            .polygonCapColor(() => '#e8ecf0')
            .polygonSideColor(() => 'rgba(200, 210, 220, 0.4)')
            .polygonStrokeColor(() => '#94a3b8')
            .polygonAltitude(0.005)
            .polygonLabel(({ properties: d }) =>
                `<b>${d.ADMIN}</b>`
            )

        // Wire polygon events
        globe.onPolygonClick((polygon, event, coords) => {
            this.emit('polygonClick', { polygon, event, coords })
        })
        globe.onPolygonHover((polygon, prevPolygon) => {
            this.emit('polygonHover', { polygon, prevPolygon })
            // Subtle highlight on hover
            globe
                .polygonCapColor(d => d === polygon ? '#d0d8e0' : '#e8ecf0')
                .polygonAltitude(d => d === polygon ? 0.01 : 0.005)
        })

        // City labels (zoom-dependent)
        globe
            .labelsData([])
            .labelLat('lat')
            .labelLng('lng')
            .labelText('name')
            .labelSize(d => Math.max(0.3, Math.sqrt(d.pop) * 1.5e-4))
            .labelDotRadius(d => Math.max(0.1, Math.sqrt(d.pop) * 8e-5))
            .labelColor(() => 'rgba(33, 37, 41, 0.85)')
            .labelResolution(2)
            .labelAltitude(0.006)

        // Initial label update
        this._updateLabelsForZoom()
    }

    /**
     * Update which city labels are visible based on the current zoom level.
     * Called on viewChange when using the political skin.
     * @private
     */
    _updateLabelsForZoom() {
        if (!this._globe || !this._citiesData) return

        const pov = this._globe.pointOfView()
        const altitude = pov.altitude

        // Find the population threshold for the current altitude
        const threshold = LABEL_ZOOM_THRESHOLDS.find(t => altitude <= t.maxAltitude)
        const minPop = threshold ? threshold.minPop : 10_000_000

        // Skip update if we're still in the same threshold band
        if (this._lastLabelAltitude !== null) {
            const prevThreshold = LABEL_ZOOM_THRESHOLDS.find(
                t => this._lastLabelAltitude <= t.maxAltitude
            )
            if (prevThreshold && prevThreshold.minPop === minPop) return
        }
        this._lastLabelAltitude = altitude

        const visibleCities = this._citiesData.filter(c => c.pop >= minPop)
        this._globe.labelsData(visibleCities)
    }

    // ── Private: Helpers ──────────────────────────────────────────

    /** @private */
    _rebuildPointMap() {
        this._pointMap.clear()
        this._points.forEach(p => {
            if (p.id !== undefined) {
                this._pointMap.set(String(p.id), p)
            }
        })
    }

    /** @private - Convert a field name string to an accessor function */
    _resolveAccessor(accessor) {
        if (typeof accessor === 'function') return accessor
        if (typeof accessor === 'string') return (d) => d[accessor]
        return (d) => d
    }
}
