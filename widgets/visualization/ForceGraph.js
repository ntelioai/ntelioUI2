/**
 * ForceGraph — Interactive 2D force-directed graph visualization.
 *
 * Wraps [force-graph](https://github.com/vasturiano/force-graph) as an
 * ntelioUI2 widget. Renders nodes and links on a 2D canvas with physics-based
 * layout, zoom/pan, and click interaction.
 *
 * force-graph is loaded automatically from CDN on first init.
 *
 * @extends Widget
 * @category Visualization
 *
 * @fires ForceGraph#nodeClick  - Node clicked: `{ node }`
 * @fires ForceGraph#nodeHover  - Node hover: `{ node, prevNode }`
 * @fires ForceGraph#linkClick  - Link clicked: `{ link }`
 *
 * @example
 * const graph = new ForceGraph({
 *     nodeColorMap: { person: '#3b82f6', location: '#10b981', topic: '#f59e0b' },
 *     autoInit: false
 * })
 * pane.add(graph)
 * await graph.init()
 * graph.setGraphData({ nodes, links })
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

const FORCE_GRAPH_JS = 'https://unpkg.com/force-graph'

const template = `<div class="nui-force-graph"></div>`

const DEFAULTS = {
    nodeColorMap: {
        person: '#3b82f6',
        location: '#10b981',
        topic: '#f59e0b'
    },
    nodeIconMap: null,  // { type: svgString } — if set, renders icons instead of circles
    backgroundColor: '#f8f9fa',
    linkColor: 'rgba(150, 160, 175, 0.3)',
    linkHighlightColor: 'rgba(100, 110, 130, 0.6)',
    nodeHighlightColor: '#fbbf24',
    labelColor: '#4b5563',
    labelHighlightColor: '#111827',
    labelDimColor: 'rgba(150, 155, 165, 0.4)',
    nodeIconBg: '#ffffff',
    initialZoom: 1
}

export class ForceGraph extends Widget {
    constructor(params = {}) {
        const config = { ...DEFAULTS, ...params }
        super({ template, ...config })
        this._config = config
        this._graph = null
        this._ForceGraphLib = null
        this._resizeObserver = null
        this._highlightedNode = null
        this._connectedNodes = new Set()
        this._connectedLinks = new Set()
        this._graphData = { nodes: [], links: [] }
    }

    // ── Lifecycle ─────────────────────────────────────────────────

    async init() {
        // 1. Load widget CSS
        await ResourceLoader.loadCss(
            '../../css/widgets/visualization/force-graph.css',
            import.meta.url
        )

        // 2. Load force-graph from CDN (sets window.ForceGraph)
        await ResourceLoader.loadScript(FORCE_GRAPH_JS)
        this._ForceGraphLib = window.ForceGraph

        // 3. Pre-load SVG icons if provided
        this._nodeIcons = {}
        if (this._config.nodeIconMap) {
            await this._loadNodeIcons(this._config.nodeIconMap)
        }

        // 4. Initialize the graph instance
        this._initGraph()

        // 5. Responsive sizing
        this._initResizeObserver()
    }

    beforeDestroy() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect()
            this._resizeObserver = null
        }
        if (this._graph) {
            this._graph._destructor && this._graph._destructor()
            this._graph = null
        }
    }

    // ── Public API ────────────────────────────────────────────────

    /**
     * Set the graph data (nodes + links).
     * @param {{ nodes: object[], links: object[] }} data
     */
    setGraphData(data) {
        this._graphData = data
        this._computeNodeSizing(data.nodes)
        if (this._graph) {
            this._graph.graphData(data)
        }
    }

    /**
     * Highlight a specific node and its connections.
     * @param {string} nodeId
     */
    highlightNode(nodeId) {
        const node = this._graphData.nodes.find(n => n.id === nodeId)
        if (node) this._onNodeHover(node)
    }

    /** Clear all highlights. */
    resetHighlight() {
        this._onNodeHover(null)
    }

    /** Zoom to fit all nodes. */
    zoomToFit(durationMs = 500, padding = 40) {
        if (this._graph) this._graph.zoomToFit(durationMs, padding)
    }

    /** Get current zoom level. */
    getZoom() {
        return this._graph ? this._graph.zoom() : 1
    }

    /** Set zoom level. */
    setZoom(level, durationMs = 300) {
        if (this._graph) this._graph.zoom(level, durationMs)
    }

    /** Center the view on a specific node. */
    centerAt(x, y, durationMs = 300) {
        if (this._graph) this._graph.centerAt(x, y, durationMs)
    }

    /** Unpin all nodes and restart the force layout from scratch. */
    reheat() {
        if (!this._graph) return
        for (const node of this._graphData.nodes) {
            node.fx = undefined
            node.fy = undefined
        }
        this._graph.d3ReheatSimulation()
        setTimeout(() => this.zoomToFit(600, 60), 800)
    }

    /** Set a distance multiplier for links (default 1). Reheats the simulation. */
    setLinkDistance(multiplier = 1) {
        if (!this._graph) return
        this._linkDistMult = multiplier
        this._graph.d3Force('link').distance(l => (120 + 80 / (l.weight || 1)) * multiplier)
        this._graph.d3Force('charge').strength(-200 * multiplier)
        this._graph.d3ReheatSimulation()
    }

    /** Pause / resume the force simulation. */
    pauseSimulation() { if (this._graph) this._graph.pauseAnimation() }
    resumeSimulation() { if (this._graph) this._graph.resumeAnimation() }

    /** Get the underlying force-graph instance (escape hatch). */
    getGraphInstance() { return this._graph }

    // ── Private ──────────────────────────────────────────────────

    /**
     * @private — Compute adaptive node sizing based on node count and viewport.
     * Stores _baseNodeSize (px radius) used by nodeVal and canvas renderer.
     */
    _computeNodeSizing(nodes) {
        const container = this.node[0]
        const w = container ? container.clientWidth : 800
        const h = container ? container.clientHeight : 600
        const area = w * h
        const n = Math.max(1, nodes.length)

        // Target: each node's bounding circle occupies a fraction of viewport area.
        // As node count grows, individual nodes shrink. Clamp to sensible pixel range.
        const idealArea = area / n * 0.15   // each node gets ~15% of its "share"
        const idealR = Math.sqrt(idealArea / Math.PI)
        this._baseNodeSize = Math.min(30, Math.max(5, idealR))  // clamp 5–30px

        // Find max count for normalization
        let maxCount = 1
        for (const node of nodes) {
            if ((node.count || 1) > maxCount) maxCount = node.count
        }
        this._maxNodeCount = maxCount
    }

    /**
     * @private — Get the rendered radius for a node (in px).
     * Scales from baseNodeSize * 0.6 (count=1) to baseNodeSize * 1.4 (max count).
     */
    _nodeRadius(node) {
        const base = this._baseNodeSize || 12
        const maxC = this._maxNodeCount || 1
        const count = node.count || 1
        // Normalized 0–1, sqrt for gentler scaling
        const t = maxC > 1 ? Math.sqrt((count - 1) / (maxC - 1)) : 0
        return base * (0.6 + 0.8 * t)  // range: 60%–140% of base
    }

    /** @private */
    _initGraph() {
        const container = this.node[0]
        if (!container || !this._ForceGraphLib) return

        const colorMap = this._config.nodeColorMap

        this._graph = this._ForceGraphLib()(container)
            .backgroundColor(this._config.backgroundColor)
            .nodeId('id')
            .nodeLabel(n => {
                const typeLabel = (n.type || '').charAt(0).toUpperCase() + (n.type || '').slice(1)
                return `${n.name} (${typeLabel}, ${n.count} signal${n.count > 1 ? 's' : ''})`
            })
            .nodeVal(n => {
                const r = this._nodeRadius(n)
                return Math.PI * r * r / 20  // force-graph nodeVal ~ area
            })
            .nodeColor(n => {
                if (this._highlightedNode) {
                    if (n === this._highlightedNode) return this._config.nodeHighlightColor
                    if (this._connectedNodes.has(n)) return colorMap[n.type] || '#6b7280'
                    return 'rgba(200, 205, 215, 0.55)'
                }
                return colorMap[n.type] || '#6b7280'
            })
            .nodeCanvasObjectMode(n => this._hasIcons() ? 'replace' : 'after')
            .nodeCanvasObject((n, ctx, globalScale) => {
                const isHighlighted = this._highlightedNode && (n === this._highlightedNode || this._connectedNodes.has(n))
                const r = this._nodeRadius(n)
                const icon = this._nodeIcons[n.type]

                // Draw icon or fallback circle
                if (icon && this._hasIcons()) {
                    const size = r * 2
                    let alpha = 1
                    if (this._highlightedNode && !isHighlighted && n !== this._highlightedNode) {
                        alpha = 0.35
                    }
                    ctx.save()
                    ctx.globalAlpha = alpha
                    // Opaque white circle behind icon to hide links
                    ctx.beginPath()
                    ctx.arc(n.x, n.y, size / 2, 0, 2 * Math.PI)
                    ctx.fillStyle = this._config.nodeIconBg
                    ctx.fill()
                    ctx.drawImage(icon, n.x - size / 2, n.y - size / 2, size, size)
                    ctx.restore()
                }

                // Label — positioned below the icon
                const fontSize = 11 / globalScale
                if (fontSize < 3 && !isHighlighted) return
                if (fontSize < 1.5) return

                const iconSize = r * 2
                const label = n.name || n.id
                ctx.font = `${Math.max(fontSize, 2.5)}px 'Open Sans', sans-serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'top'

                if (this._highlightedNode && !isHighlighted) {
                    ctx.fillStyle = this._config.labelDimColor
                } else if (isHighlighted) {
                    ctx.fillStyle = this._config.labelHighlightColor
                } else {
                    ctx.fillStyle = this._config.labelColor
                }
                ctx.fillText(label, n.x, n.y + iconSize / 2 + 2)
            })
            .linkWidth(l => {
                if (this._connectedLinks.has(l)) return Math.max(1.5, (l.weight || 1) * 0.7)
                if (this._highlightedNode && !this._connectedLinks.has(l)) return Math.max(0.2, (l.weight || 1) * 0.15)
                return Math.max(0.3, (l.weight || 1) * 0.35)
            })
            .linkColor(l => {
                if (this._connectedLinks.has(l)) return this._config.linkHighlightColor
                if (this._highlightedNode) return 'rgba(180, 185, 195, 0.15)'
                return this._config.linkColor
            })
            .linkDirectionalParticles(l => this._connectedLinks.has(l) ? 2 : 0)
            .linkDirectionalParticleWidth(2)
            .onNodeClick(node => {
                this.emit('nodeClick', { node })
            })
            .onNodeHover(node => {
                container.style.cursor = node ? 'pointer' : 'default'
                this._onNodeHover(node)
            })
            .onLinkClick(link => {
                this.emit('linkClick', { link })
            })
            .onZoom(({ k }) => {
                this.emit('zoomChange', { zoom: k })
            })
            .cooldownTicks(200)
            .warmupTicks(80)
            .onNodeDragEnd(node => {
                // Pin the node where the user dropped it so force doesn't pull it back
                node.fx = node.x
                node.fy = node.y
            })

        // Relaxed forces: weaker centering + charge so dragged-apart nodes stay put
        this._graph.d3Force('charge').strength(-200)
        this._graph.d3Force('link').distance(l => 120 + 80 / (l.weight || 1))
        this._graph.d3Force('center').strength(0.03)

        // Initial zoom
        setTimeout(() => this.zoomToFit(800, 80), 600)
    }

    /** @private — Handle node hover: highlight connections */
    _onNodeHover(node) {
        const prev = this._highlightedNode
        this._highlightedNode = node || null
        this._connectedNodes.clear()
        this._connectedLinks.clear()

        if (node) {
            // Find all connected nodes and links
            for (const link of this._graphData.links) {
                const src = typeof link.source === 'object' ? link.source : this._graphData.nodes.find(n => n.id === link.source)
                const tgt = typeof link.target === 'object' ? link.target : this._graphData.nodes.find(n => n.id === link.target)
                if (src === node || tgt === node) {
                    this._connectedNodes.add(src)
                    this._connectedNodes.add(tgt)
                    this._connectedLinks.add(link)
                }
            }
        }

        // Trigger re-render
        if (this._graph) this._graph.nodeColor(this._graph.nodeColor())

        this.emit('nodeHover', { node, prevNode: prev })
    }

    /** @private */
    _initResizeObserver() {
        const container = this.node[0]
        if (!container) return

        let timeout
        this._resizeObserver = new ResizeObserver(() => {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                if (this._graph) {
                    this._graph.width(container.clientWidth)
                    this._graph.height(container.clientHeight)
                }
            }, 100)
        })
        this._resizeObserver.observe(container)
    }

    /** @private — Check if icons are loaded */
    _hasIcons() {
        return Object.keys(this._nodeIcons).length > 0
    }

    /**
     * @private — Load SVG strings as canvas-drawable Image objects.
     * Colorizes each SVG with the matching nodeColorMap color.
     * @param {Object<string, string>} iconMap - { type: svgString }
     */
    async _loadNodeIcons(iconMap) {
        const colorMap = this._config.nodeColorMap || {}
        const promises = Object.entries(iconMap).map(([type, svgStr]) => {
            return new Promise(resolve => {
                // Replace fill color with the type's color
                const color = colorMap[type] || '#6b7280'
                const colored = svgStr.replace(/fill="[^"]*"/, `fill="${color}"`)
                const blob = new Blob([colored], { type: 'image/svg+xml' })
                const url = URL.createObjectURL(blob)
                const img = new Image()
                img.onload = () => {
                    URL.revokeObjectURL(url)
                    this._nodeIcons[type] = img
                    resolve()
                }
                img.onerror = () => {
                    URL.revokeObjectURL(url)
                    console.warn(`[ForceGraph] Failed to load icon for type: ${type}`)
                    resolve()
                }
                img.src = url
            })
        })
        await Promise.all(promises)
    }
}
