import { Widget } from '../core/Widget.js'

/**
 * Page navigation widget: first / prev / page display / next / last.
 *
 * Auto-hides when there is only one page. Disables buttons at boundaries.
 *
 * @extends Widget
 * @category Grid
 *
 * @fires PaginationControls#navigate - { page, action } when user clicks a button
 */
export class PaginationControls extends Widget {
    static template = `
        <div class="pagination-controls">
            <button class="btn btn-sm btn-outline-secondary" data-action="first" title="First page">
                <i class="fas fa-angle-double-left"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" data-action="prev" title="Previous page">
                <i class="fas fa-angle-left"></i>
            </button>
            <span class="page-display">
                <span class="current-page">1</span> / <span class="total-pages">1</span>
            </span>
            <button class="btn btn-sm btn-outline-secondary" data-action="next" title="Next page">
                <i class="fas fa-angle-right"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" data-action="last" title="Last page">
                <i class="fas fa-angle-double-right"></i>
            </button>
        </div>`

    constructor(params = {}) {
        super({ template: PaginationControls.template, autoInit: false, ...params })
        this._currentPage = 1
        this._totalPages = 1
    }

    async init() {
        this.find('button').on('click', (e) => {
            const action = $(e.currentTarget).data('action')
            if (action) this.emit('navigate', { action, page: this._currentPage })
        })
    }

    /**
     * Update the page display and button states.
     * @param {number} page - Current page (1-based)
     * @param {number} totalPages
     */
    update(page, totalPages) {
        this._currentPage = page
        this._totalPages = totalPages

        this.find('.current-page').text(page)
        this.find('.total-pages').text(totalPages)

        this.find('[data-action="first"], [data-action="prev"]').prop('disabled', page <= 1)
        this.find('[data-action="next"], [data-action="last"]').prop('disabled', page >= totalPages)

        // Hide when only one page
        if (totalPages <= 1) this.hide()
        else this.show()
    }
}
