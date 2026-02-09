/**
 * ActivityMonitor — Example widget that combines Bootstrap visuals with Widget lifecycle.
 *
 * This is NOT a production widget. It exists to demonstrate why you'd create
 * a Widget instead of using raw Bootstrap HTML.
 *
 * What Widget adds over plain Bootstrap:
 *  - init() / destroy() lifecycle with cleanup (clears the interval)
 *  - Internal state (_count, _running) managed across methods
 *  - Custom events (started, stopped, event, complete) parents can listen to
 *  - Public API methods (start, stop, reset) other code can call
 */
import { Widget } from '../../core/Widget.js'

const template = `
<div class="card" style="max-width: 400px;">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold"><i class="fas fa-wave-square me-1"></i> Activity Monitor</span>
        <span class="badge bg-secondary nui-status-badge">Stopped</span>
    </div>
    <div class="card-body pb-2">
        <div class="mb-2">
            <div class="d-flex justify-content-between mb-1">
                <small class="text-muted">Events processed</small>
                <span class="badge bg-primary nui-count-badge">0 / 20</span>
            </div>
            <div class="progress" style="height: 6px;">
                <div class="progress-bar nui-progress" role="progressbar" style="width: 0%;"></div>
            </div>
        </div>
        <div class="nui-log list-group list-group-flush" style="max-height: 140px; overflow-y: auto; font-size: 0.8em;"></div>
    </div>
    <div class="card-footer d-flex gap-2">
        <button class="btn btn-success btn-sm nui-btn-start"><i class="fas fa-play me-1"></i>Start</button>
        <button class="btn btn-danger btn-sm nui-btn-stop" disabled><i class="fas fa-stop me-1"></i>Stop</button>
        <button class="btn btn-outline-secondary btn-sm nui-btn-reset"><i class="fas fa-redo me-1"></i>Reset</button>
    </div>
</div>
`

const EVENTS = [
    { level: 'info',  message: 'User signed in' },
    { level: 'info',  message: 'Page viewed' },
    { level: 'info',  message: 'Item added to cart' },
    { level: 'warn',  message: 'Slow API response' },
    { level: 'warn',  message: 'Rate limit approaching' },
    { level: 'error', message: 'Payment declined' },
    { level: 'info',  message: 'Order placed' },
    { level: 'info',  message: 'Email sent' },
    { level: 'warn',  message: 'Disk usage high' },
    { level: 'info',  message: 'Cache refreshed' },
]

const LEVEL_COLOR = { info: 'primary', warn: 'warning', error: 'danger' }

export class ActivityMonitor extends Widget {

    /**
     * Create a new ActivityMonitor widget.
     *
     * @param {Object} params - Configuration object
     * @param {number} [params.maxCount=20] - Total events before auto-stop
     * @param {number} [params.speed=600] - Interval between events in ms
     */
    constructor(params = {}) {
        super({ ...params, template, autoInit: false })
        this._count = 0
        this._maxCount = params.maxCount || 20
        this._speed = params.speed || 600
        this._interval = null
    }

    /**
     * Bind button click handlers for start, stop, and reset controls.
     * @returns {Promise<void>}
     */
    async init() {
        this.find('.nui-btn-start').on('click', () => this.start())
        this.find('.nui-btn-stop').on('click', () => this.stop())
        this.find('.nui-btn-reset').on('click', () => this.reset())
    }

    /**
     * Start the activity monitor. Begins emitting events at the configured speed.
     * @fires ActivityMonitor#started
     */
    start() {
        this._setStatus('running')
        this._interval = setInterval(() => this._tick(), this._speed)
        this.emit('started')
    }

    /**
     * Stop the activity monitor. Pauses event emission.
     * @fires ActivityMonitor#stopped
     */
    stop() {
        clearInterval(this._interval)
        this._interval = null
        this._setStatus('paused')
        this.emit('stopped')
    }

    /**
     * Reset the monitor: stop, clear the counter and log.
     * @fires ActivityMonitor#reset
     */
    reset() {
        this._count = 0
        this._updateProgress()
        this.find('.nui-log').empty()
        this._setStatus('stopped')
        this.emit('reset')
    }

    // ── Private ──────────────────────────────────

    /**
     * Process one event tick: increment counter, log a random event,
     * update progress, and auto-stop when maxCount is reached.
     * @private
     */
    _tick() {
        this._count++
        const evt = EVENTS[Math.floor(Math.random() * EVENTS.length)]
        this._addLogEntry(evt)
        this._updateProgress()
        this.emit('event', { count: this._count, ...evt })

        if (this._count >= this._maxCount) {
            this.stop()
            this._setStatus('complete')
            this.emit('complete', { total: this._count })
        }
    }

    /**
     * Update the progress bar and count badge.
     * @private
     */
    _updateProgress() {
        const pct = (this._count / this._maxCount) * 100
        this.find('.nui-progress').css('width', pct + '%')
        this.find('.nui-count-badge').text(`${this._count} / ${this._maxCount}`)
    }

    /**
     * Prepend a log entry to the activity log list.
     * @param {{level: string, message: string}} evt - Event to display
     * @private
     */
    _addLogEntry(evt) {
        this.find('.nui-log').prepend($(`
            <div class="list-group-item py-1 px-2 d-flex justify-content-between align-items-center">
                <span>${evt.message}</span>
                <span class="badge bg-${LEVEL_COLOR[evt.level]}">${evt.level}</span>
            </div>
        `))
    }

    /**
     * Update the status badge and button enabled states.
     * @param {'stopped'|'running'|'paused'|'complete'} status - Current status
     * @private
     */
    _setStatus(status) {
        const map = {
            stopped:  { text: 'Stopped',  cls: 'bg-secondary' },
            running:  { text: 'Running',  cls: 'bg-success' },
            paused:   { text: 'Paused',   cls: 'bg-warning text-dark' },
            complete: { text: 'Complete', cls: 'bg-primary' },
        }
        const s = map[status]
        const badge = this.find('.nui-status-badge')
        badge.attr('class', 'badge nui-status-badge ' + s.cls).text(s.text)

        this.find('.nui-btn-start').prop('disabled', status === 'running' || status === 'complete')
        this.find('.nui-btn-stop').prop('disabled', status !== 'running')
    }

    /**
     * Clean up the interval timer before destruction.
     * This is the key reason ActivityMonitor is a Widget —
     * lifecycle cleanup of external resources.
     */
    destroy() {
        if (this._interval) {
            clearInterval(this._interval)
            this._interval = null
        }
        super.destroy()
    }
}
