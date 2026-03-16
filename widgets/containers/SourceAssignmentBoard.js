/**
 * SourceAssignmentBoard — Composite drag-and-drop widget combining a searchable,
 * categorized source panel with assignment lanes and a trash zone.
 *
 * Sources are grouped by category with collapsible headers and a search filter.
 * Items can be dragged from the source panel into lanes, transferred between lanes,
 * returned to the source panel (auto-sorted to the correct category), or dragged
 * to the trash zone for permanent removal.
 *
 * @extends Widget
 * @category Containers
 *
 * @fires SourceAssignmentBoard#assign   - `{ item, lane, index }`
 * @fires SourceAssignmentBoard#unassign - `{ item, fromLane }`
 * @fires SourceAssignmentBoard#transfer - `{ item, fromLane, toLane, index }`
 * @fires SourceAssignmentBoard#reorder  - `{ item, lane, fromIndex, toIndex }`
 * @fires SourceAssignmentBoard#trash    - `{ item, fromLane }`
 * @fires SourceAssignmentBoard#search   - `{ query, matchCount }`
 *
 * @example
 * const board = new SourceAssignmentBoard({
 *     sources: [
 *         { category: 'Wire Services', items: [{ name: 'Reuters', notes: 'Global wire' }] }
 *     ],
 *     lanes: [{ id: 'watch', title: 'Watch List' }],
 *     cardFields: { title: 'name', subtitle: 'notes', badge: 'language' }
 * })
 * board.appendTo($('#container'))
 * await board.init()
 */
import { Widget } from '../../core/Widget.js'
import { ResourceLoader } from '../../core/ResourceLoader.js'

const $ = window.jQuery || window.$

const DRAGULA_JS  = 'https://cdn.jsdelivr.net/npm/dragula@3.7.3/dist/dragula.min.js'
const DRAGULA_CSS = 'https://cdn.jsdelivr.net/npm/dragula@3.7.3/dist/dragula.min.css'

const template = `<div class="nui-assignment-board"></div>`

/**
 * @typedef {Object} SourceCategory
 * @property {string}   category - Category label
 * @property {Object[]} items    - Items in this category
 */

/**
 * @typedef {Object} LaneConfig
 * @property {string} id    - Unique lane identifier
 * @property {string} title - Display title
 */

/** @category Containers */
export class SourceAssignmentBoard extends Widget {

    /**
     * @param {Object} params
     * @param {SourceCategory[]} params.sources            - Categories with items
     * @param {LaneConfig[]}     params.lanes              - Lane definitions
     * @param {Object}  [params.cardFields]                - Field mapping for card rendering
     * @param {string}  [params.cardFields.title]           - Item field for card title
     * @param {string}  [params.cardFields.subtitle]        - Item field for subtitle
     * @param {string}  [params.cardFields.badge]           - Item field for badge
     * @param {string}  [params.cardFields.icon]            - Item field for icon CSS class
     * @param {function(Object):string} [params.renderCard] - Custom card HTML renderer
     * @param {string}  [params.sourceTitle='Sources']      - Source panel header
     * @param {string}  [params.sourceWidth]                - CSS width of source panel
     * @param {string}  [params.laneWidth]                  - CSS width of each lane
     * @param {string}  [params.searchPlaceholder='Filter sources...']
     * @param {string}  [params.trashLabel='Drop here to remove']
     * @param {boolean} [params.expandAll=false]            - Start with all groups expanded
     */
    constructor(params = {}) {
        super({ ...params, template, autoInit: false })

        this._sources = params.sources || []
        this._laneConfigs = params.lanes || []
        this._cardFields = params.cardFields || {}
        this._renderCard = params.renderCard || null
        this._sourceTitle = params.sourceTitle || 'Sources'
        this._searchPlaceholder = params.searchPlaceholder || 'Filter sources...'
        this._trashLabel = params.trashLabel || 'Drop here to remove'

        /** @private */
        this._itemMap = new Map()
        /** @private  category -> items currently in source */
        this._sourceItems = new Map()
        /** @private  laneId -> items */
        this._laneItems = new Map()
        /** @private  expanded categories */
        this._expandedGroups = new Set()
        /** @private */
        this._searchQuery = ''
        /** @private */
        this._searchTimer = null
        /** @private */
        this._drake = null

        // Stamp _category and build data structures
        this._sources.forEach(cat => {
            this._sourceItems.set(cat.category, [])
            cat.items.forEach(item => {
                item._category = cat.category
                this._itemMap.set(item.name, item)
                this._sourceItems.get(cat.category).push(item)
            })
            if (params.expandAll) {
                this._expandedGroups.add(cat.category)
            }
        })

        this._laneConfigs.forEach(lane => {
            this._laneItems.set(lane.id, [])
        })
    }

    // ── Lifecycle ───────────────────────────────────────────────

    async init() {
        await ResourceLoader.loadCss('../../css/widgets/containers/assignment-board.css', import.meta.url)

        await Promise.all([
            ResourceLoader.loadScript(DRAGULA_JS),
            ResourceLoader.loadCss(DRAGULA_CSS)
        ])

        if (this.params.sourceWidth) {
            this.get().css('--nui-assignment-source-width', this.params.sourceWidth)
        }
        if (this.params.laneWidth) {
            this.get().css('--nui-assignment-lane-width', this.params.laneWidth)
        }

        this.render()
        this._initDragula()
        this._attachGroupToggle()
        this._attachSearch()
    }

    render() {
        const root = this.get()
        root.empty()

        // Source panel
        root.append(this._buildSourcePanel())

        // Lanes area
        const $lanes = $('<div class="nui-assignment-lanes"></div>')
        this._laneConfigs.forEach(lane => {
            $lanes.append(this._buildLane(lane))
        })
        root.append($lanes)

        // Trash zone
        root.append(`
            <div class="nui-assignment-trash">
                <i class="fas fa-trash-alt nui-assignment-trash-icon"></i>
                <span class="nui-assignment-trash-label">${this._trashLabel}</span>
            </div>
        `)
    }

    beforeDestroy() {
        if (this._drake) {
            this._drake.destroy()
            this._drake = null
        }
        clearTimeout(this._searchTimer)
        this.get().off('click', '.nui-assignment-group-header')
        this.get().off('input', '.nui-assignment-search-input')
    }

    // ── Public API ──────────────────────────────────────────────

    /**
     * Get all lane assignments.
     * @returns {Object} `{ laneId: item[] }`
     */
    getAssignments() {
        const result = {}
        this._laneConfigs.forEach(lane => {
            result[lane.id] = this.getLaneItems(lane.id)
        })
        return result
    }

    /**
     * Get items in a specific lane.
     * @param {string} laneId
     * @returns {Object[]}
     */
    getLaneItems(laneId) {
        return (this._laneItems.get(laneId) || []).map(i => ({ ...i }))
    }

    /**
     * Programmatically assign an item to a lane.
     * @param {string} itemName
     * @param {string} laneId
     * @returns {boolean}
     */
    assignItem(itemName, laneId) {
        const item = this._itemMap.get(itemName)
        if (!item) return false

        const catItems = this._sourceItems.get(item._category)
        if (!catItems) return false

        const idx = catItems.findIndex(i => i.name === itemName)
        if (idx === -1) return false

        catItems.splice(idx, 1)
        this._laneItems.get(laneId).push(item)

        this._refreshAfterChange(item._category, laneId)
        this.emit('assign', { item: { ...item }, lane: laneId, index: this._laneItems.get(laneId).length - 1 })
        return true
    }

    /**
     * Programmatically return an item from a lane to its source category.
     * @param {string} itemName
     * @returns {boolean}
     */
    unassignItem(itemName) {
        const item = this._itemMap.get(itemName)
        if (!item) return false

        let fromLaneId = null
        for (const [laneId, items] of this._laneItems) {
            const idx = items.findIndex(i => i.name === itemName)
            if (idx > -1) {
                items.splice(idx, 1)
                fromLaneId = laneId
                break
            }
        }
        if (!fromLaneId) return false

        this._sourceItems.get(item._category).push(item)
        this._refreshAfterChange(item._category, fromLaneId)
        this.emit('unassign', { item: { ...item }, fromLane: fromLaneId })
        return true
    }

    /** Rebuild everything, preserving assignments and search state. */
    refresh() {
        if (this._drake) { this._drake.destroy(); this._drake = null }
        this.render()
        this._initDragula()
        this._attachGroupToggle()
        this._attachSearch()
        if (this._searchQuery) {
            this.find('.nui-assignment-search-input').val(this._searchQuery)
            this._applySearchFilter(this._searchQuery)
        }
    }

    /** Clear search filter. */
    clearSearch() {
        this._searchQuery = ''
        this.find('.nui-assignment-search-input').val('')
        this._applySearchFilter('')
    }

    /** Expand all source groups. */
    expandAll() {
        this._sources.forEach(cat => this._expandedGroups.add(cat.category))
        this.find('.nui-assignment-group').addClass('expanded')
    }

    /** Collapse all source groups. */
    collapseAll() {
        this._expandedGroups.clear()
        this.find('.nui-assignment-group').removeClass('expanded')
    }

    // ── Private: Build DOM ──────────────────────────────────────

    /** @private */
    _buildSourcePanel() {
        const totalCount = this._getTotalSourceCount()
        const $panel = $(`
            <div class="nui-assignment-source">
                <div class="nui-assignment-source-header">
                    <span class="nui-assignment-source-title">${this._sourceTitle}</span>
                    <span class="nui-assignment-source-count">${totalCount}</span>
                </div>
                <div class="nui-assignment-search">
                    <input type="text" class="nui-assignment-search-input"
                           placeholder="${this._searchPlaceholder}" />
                </div>
                <div class="nui-assignment-source-body"></div>
            </div>
        `)

        const $body = $panel.find('.nui-assignment-source-body')

        this._sources.forEach(cat => {
            const items = this._sourceItems.get(cat.category) || []
            const expanded = this._expandedGroups.has(cat.category)

            const $group = $(`
                <div class="nui-assignment-group${expanded ? ' expanded' : ''}" data-category="${cat.category}">
                    <div class="nui-assignment-group-header">
                        <i class="fas fa-chevron-right nui-assignment-chevron"></i>
                        <span class="nui-assignment-group-label">${cat.category}</span>
                        <span class="nui-assignment-group-count">${items.length}</span>
                    </div>
                    <div class="nui-assignment-group-body"></div>
                </div>
            `)

            const $groupBody = $group.find('.nui-assignment-group-body')
            items.forEach(item => $groupBody.append(this._buildCardHtml(item)))

            $body.append($group)
        })

        return $panel
    }

    /** @private */
    _buildLane(laneConfig) {
        const items = this._laneItems.get(laneConfig.id) || []

        const $lane = $(`
            <div class="nui-assignment-lane" data-lane-id="${laneConfig.id}">
                <div class="nui-assignment-lane-header">
                    <span class="nui-assignment-lane-title">${laneConfig.title}</span>
                    <span class="nui-assignment-lane-count">${items.length}</span>
                </div>
                <div class="nui-assignment-lane-body"></div>
            </div>
        `)

        const $body = $lane.find('.nui-assignment-lane-body')
        if (items.length === 0) {
            $body.html('<div class="nui-assignment-lane-empty">Drag sources here</div>')
        } else {
            items.forEach(item => $body.append(this._buildCardHtml(item)))
        }

        return $lane
    }

    /** @private */
    _buildCardHtml(item) {
        const key = item.name.replace(/"/g, '&quot;')
        const cat = (item._category || '').replace(/"/g, '&quot;')

        if (this._renderCard) {
            return `<div class="nui-assignment-card" data-key="${key}" data-category="${cat}">${this._renderCard(item)}</div>`
        }

        const fields = this._cardFields
        const title    = fields.title    ? (item[fields.title] ?? '')    : ''
        const subtitle = fields.subtitle ? (item[fields.subtitle] ?? '') : ''
        const badge    = fields.badge    ? (item[fields.badge] ?? '')    : ''
        const icon     = fields.icon     ? (item[fields.icon] ?? '')     : ''

        let html = `<div class="nui-assignment-card" data-key="${key}" data-category="${cat}">`
        html += '<div class="nui-assignment-card-header">'
        if (icon)  html += `<span class="nui-assignment-card-icon"><i class="${icon}"></i></span>`
        if (title) html += `<span class="nui-assignment-card-title">${title}</span>`
        if (badge) html += `<span class="nui-assignment-card-badge">${badge}</span>`
        html += '</div>'
        if (subtitle) html += `<div class="nui-assignment-card-subtitle">${subtitle}</div>`
        html += '</div>'
        return html
    }

    // ── Private: Search ─────────────────────────────────────────

    /** @private */
    _attachSearch() {
        this.get().on('input', '.nui-assignment-search-input', (e) => {
            clearTimeout(this._searchTimer)
            this._searchTimer = setTimeout(() => {
                const query = $(e.target).val().trim()
                this._searchQuery = query
                this._applySearchFilter(query)
            }, 200)
        })
    }

    /** @private */
    _applySearchFilter(query) {
        const q = query.toLowerCase()
        let matchCount = 0

        this._sources.forEach(cat => {
            const $group = this.find(`.nui-assignment-group[data-category="${cat.category}"]`)
            const $cards = $group.find('.nui-assignment-card')
            let groupHasMatch = false

            $cards.each((_, el) => {
                const $card = $(el)
                const text = $card.text().toLowerCase()
                const matches = !q || text.includes(q)
                $card.toggleClass('nui-hidden', !matches)
                if (matches) {
                    groupHasMatch = true
                    matchCount++
                }
            })

            // Hide empty groups, force-expand matching groups during search
            $group.toggleClass('nui-hidden', !groupHasMatch && !!q)
            if (q && groupHasMatch) {
                $group.addClass('expanded')
            } else if (!q) {
                // Restore persisted state
                $group.toggleClass('expanded', this._expandedGroups.has(cat.category))
            }

            // Update group count to show visible/total
            const visibleCount = $cards.not('.nui-hidden').length
            const totalCount = (this._sourceItems.get(cat.category) || []).length
            $group.find('.nui-assignment-group-count').text(
                q ? `${visibleCount}/${totalCount}` : `${totalCount}`
            )
        })

        // Update source panel total count
        const totalSource = this._getTotalSourceCount()
        this.find('.nui-assignment-source-count').text(
            q ? `${matchCount}/${totalSource}` : `${totalSource}`
        )

        this.emit('search', { query, matchCount })
    }

    // ── Private: Group Toggle ───────────────────────────────────

    /** @private */
    _attachGroupToggle() {
        this.get().on('click', '.nui-assignment-group-header', (e) => {
            const $group = $(e.currentTarget).closest('.nui-assignment-group')
            const category = $group.data('category')

            if ($group.hasClass('expanded')) {
                $group.removeClass('expanded')
                this._expandedGroups.delete(category)
            } else {
                $group.addClass('expanded')
                this._expandedGroups.add(category)
            }
        })
    }

    // ── Private: Dragula ────────────────────────────────────────

    /** @private */
    _initDragula() {
        // Collect all containers: source group bodies + lane bodies + trash
        const containers = []

        // Source group bodies
        this.find('.nui-assignment-group-body').each((_, el) => containers.push(el))

        // Lane bodies
        this.find('.nui-assignment-lane-body').each((_, el) => containers.push(el))

        // Trash zone
        const trashEl = this.find('.nui-assignment-trash')[0]
        if (trashEl) containers.push(trashEl)

        this._drake = window.dragula(containers, {
            moves: (el) => {
                return el.classList.contains('nui-assignment-card')
            },
            accepts: (el, target, source) => {
                const isTargetTrash = target.classList.contains('nui-assignment-trash')
                const isTargetLane  = target.classList.contains('nui-assignment-lane-body')
                const isTargetGroup = target.classList.contains('nui-assignment-group-body')
                const isSourceGroup = source.classList.contains('nui-assignment-group-body')
                const isSourceLane  = source.classList.contains('nui-assignment-lane-body')

                // Source → Trash: blocked
                if (isTargetTrash && isSourceGroup) return false
                // Source → Source (different group): blocked
                if (isTargetGroup && isSourceGroup) return false
                // Trash accepts only from lanes
                if (isTargetTrash && isSourceLane) return true
                // Source group accepts only from lanes (unassign)
                if (isTargetGroup && isSourceLane) return true
                // Lane accepts from everywhere
                if (isTargetLane) return true

                return false
            },
            direction: 'vertical'
        })

        this._drake.on('drop', (el, target, source, sibling) => {
            this._onDrop(el, target, source, sibling)
        })

        // Trash hover effect
        this._drake.on('over', (el, container) => {
            if (container.classList.contains('nui-assignment-trash')) {
                $(container).addClass('nui-drag-hover')
            }
        })
        this._drake.on('out', (el, container) => {
            if (container.classList.contains('nui-assignment-trash')) {
                $(container).removeClass('nui-drag-hover')
            }
        })
    }

    /** @private */
    _onDrop(el, target, source, sibling) {
        const $el = $(el)
        const key = $el.data('key')
        const item = this._itemMap.get(key)
        if (!item) return

        const isTargetTrash = target.classList.contains('nui-assignment-trash')
        const isTargetLane  = target.classList.contains('nui-assignment-lane-body')
        const isTargetGroup = target.classList.contains('nui-assignment-group-body')
        const isSourceGroup = source.classList.contains('nui-assignment-group-body')
        const isSourceLane  = source.classList.contains('nui-assignment-lane-body')

        if (isSourceGroup && isTargetLane) {
            // ── Source → Lane (assign) ──
            const toLaneId = $(target).closest('.nui-assignment-lane').data('lane-id')
            const toIndex = Array.from(target.children)
                .filter(c => c.classList.contains('nui-assignment-card'))
                .indexOf(el)

            // Remove from source data
            const catItems = this._sourceItems.get(item._category)
            const idx = catItems.findIndex(i => i.name === key)
            if (idx > -1) catItems.splice(idx, 1)

            // Add to lane data
            const laneItems = this._laneItems.get(toLaneId)
            laneItems.splice(toIndex, 0, item)

            // Remove empty-state placeholder if present
            $(target).find('.nui-assignment-lane-empty').remove()

            this._updateSourceCount()
            this._updateGroupCount(item._category)
            this._updateLaneCount(toLaneId)

            this.emit('assign', { item: { ...item }, lane: toLaneId, index: toIndex })

        } else if (isSourceLane && isTargetTrash) {
            // ── Lane → Trash → return to source category ──
            const fromLaneId = $(source).closest('.nui-assignment-lane').data('lane-id')

            // Remove from lane data
            const laneItems = this._laneItems.get(fromLaneId)
            const idx = laneItems.findIndex(i => i.name === key)
            if (idx > -1) laneItems.splice(idx, 1)

            // Detach from trash zone (dragula placed it there)
            $el.detach()

            // Return to correct source category group
            const $correctBody = this.find(
                `.nui-assignment-group[data-category="${item._category}"] .nui-assignment-group-body`
            )
            $correctBody.append($el)

            // Add back to source data
            this._sourceItems.get(item._category).push(item)

            this._updateSourceCount()
            this._updateGroupCount(item._category)
            this._updateLaneCount(fromLaneId)
            this._updateLaneEmptyState(fromLaneId)

            this.emit('unassign', { item: { ...item }, fromLane: fromLaneId })

        } else if (isSourceLane && isTargetGroup) {
            // ── Lane → Source (unassign, auto-sort) ──
            const fromLaneId = $(source).closest('.nui-assignment-lane').data('lane-id')
            const laneItems = this._laneItems.get(fromLaneId)
            const idx = laneItems.findIndex(i => i.name === key)
            if (idx > -1) laneItems.splice(idx, 1)

            // Move DOM to correct category group (user may have dropped in wrong one)
            const targetCategory = $(target).closest('.nui-assignment-group').data('category')
            if (targetCategory !== item._category) {
                $el.detach()
                const $correctBody = this.find(
                    `.nui-assignment-group[data-category="${item._category}"] .nui-assignment-group-body`
                )
                $correctBody.append($el)
            }

            // Add to source data
            this._sourceItems.get(item._category).push(item)

            this._updateSourceCount()
            this._updateGroupCount(item._category)
            this._updateLaneCount(fromLaneId)
            this._updateLaneEmptyState(fromLaneId)

            this.emit('unassign', { item: { ...item }, fromLane: fromLaneId })

        } else if (isSourceLane && isTargetLane) {
            // ── Lane → Lane (transfer or reorder) ──
            const fromLaneId = $(source).closest('.nui-assignment-lane').data('lane-id')
            const toLaneId   = $(target).closest('.nui-assignment-lane').data('lane-id')
            const toIndex = Array.from(target.children)
                .filter(c => c.classList.contains('nui-assignment-card'))
                .indexOf(el)

            if (fromLaneId === toLaneId) {
                // Reorder within same lane
                const items = this._laneItems.get(fromLaneId)
                const fromIndex = items.findIndex(i => i.name === key)
                items.splice(fromIndex, 1)
                items.splice(toIndex, 0, item)

                this.emit('reorder', { item: { ...item }, lane: fromLaneId, fromIndex, toIndex })
            } else {
                // Transfer between lanes
                const fromItems = this._laneItems.get(fromLaneId)
                const fromIdx = fromItems.findIndex(i => i.name === key)
                if (fromIdx > -1) fromItems.splice(fromIdx, 1)

                const toItems = this._laneItems.get(toLaneId)
                toItems.splice(toIndex, 0, item)

                // Remove empty-state from target
                $(target).find('.nui-assignment-lane-empty').remove()

                this._updateLaneCount(fromLaneId)
                this._updateLaneCount(toLaneId)
                this._updateLaneEmptyState(fromLaneId)

                this.emit('transfer', { item: { ...item }, fromLane: fromLaneId, toLane: toLaneId, index: toIndex })
            }
        }
    }

    // ── Private: Helpers ────────────────────────────────────────

    /** @private */
    _getTotalSourceCount() {
        let total = 0
        this._sourceItems.forEach(items => { total += items.length })
        return total
    }

    /** @private */
    _updateSourceCount() {
        this.find('.nui-assignment-source-count').text(this._getTotalSourceCount())
    }

    /** @private */
    _updateGroupCount(category) {
        const items = this._sourceItems.get(category) || []
        this.find(`.nui-assignment-group[data-category="${category}"] .nui-assignment-group-count`)
            .text(items.length)
    }

    /** @private */
    _updateLaneCount(laneId) {
        const items = this._laneItems.get(laneId) || []
        this.find(`.nui-assignment-lane[data-lane-id="${laneId}"] .nui-assignment-lane-count`)
            .text(items.length)
    }

    /** @private */
    _updateLaneEmptyState(laneId) {
        const items = this._laneItems.get(laneId) || []
        const $body = this.find(`.nui-assignment-lane[data-lane-id="${laneId}"] .nui-assignment-lane-body`)
        $body.find('.nui-assignment-lane-empty').remove()
        if (items.length === 0) {
            $body.html('<div class="nui-assignment-lane-empty">Drag sources here</div>')
        }
    }

    /** @private  Refresh counts, empty states, and rebuild dragula after programmatic changes */
    _refreshAfterChange(category, laneId) {
        if (this._drake) { this._drake.destroy(); this._drake = null }
        this.render()
        this._initDragula()
        this._attachGroupToggle()
        this._attachSearch()
        if (this._searchQuery) {
            this.find('.nui-assignment-search-input').val(this._searchQuery)
            this._applySearchFilter(this._searchQuery)
        }
    }
}
