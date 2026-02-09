/**
 * Modal Examples
 */
import { Modal, ConfirmDialog, AlertDialog } from '../../../../widgets/dialogs/Modal.js'

/**
 * Display a result message in a specific output element.
 * @param {string} id - DOM element ID to write into
 * @param {string} text - Result text to display
 */
function showResult(id, text) {
    document.getElementById(id).textContent = text
}

// 1. Basic Modal
document.getElementById('btn-basic-modal').addEventListener('click', () => {
    const modal = new Modal({
        title: 'Welcome to ntelioUI2',
        body: `
            <p>This is a basic modal dialog with customizable content.</p>
            <p>You can use it for:</p>
            <ul>
                <li>Displaying information</li>
                <li>Collecting user input</li>
                <li>Confirming actions</li>
            </ul>
        `,
        confirmLabel: 'Got it!',
        closeLabel: 'Close'
    })

    modal.init()

    modal.on('confirm', () => {
        showResult('result-basic', 'You clicked "Got it!"')
    })

    modal.on('close', () => {
        showResult('result-basic', 'Modal was closed')
    })

    modal.open()
})

// 2. Confirm Dialog
document.getElementById('btn-confirm').addEventListener('click', async () => {
    showResult('result-confirm', 'Waiting for confirmation...')

    const confirmed = await ConfirmDialog.show({
        title: 'Delete Item?',
        message: 'Are you sure you want to delete this item? This action cannot be undone.',
        confirmLabel: 'Delete',
        closeLabel: 'Cancel'
    })

    if (confirmed) {
        showResult('result-confirm', 'User confirmed deletion')
    } else {
        showResult('result-confirm', 'User cancelled')
    }
})

// 3. Alert Dialog
document.getElementById('btn-alert').addEventListener('click', async () => {
    await AlertDialog.show({
        title: 'Success!',
        message: 'Your changes have been saved successfully.'
    })

    showResult('result-alert', 'Alert was acknowledged')
})

// 4. Modal Sizes
const sizes = [
    { btn: 'btn-size-sm', size: 'sm', title: 'Small Modal' },
    { btn: 'btn-size-default', size: '', title: 'Default Modal' },
    { btn: 'btn-size-lg', size: 'lg', title: 'Large Modal' },
    { btn: 'btn-size-xl', size: 'xl', title: 'Extra Large Modal' }
]

sizes.forEach(({ btn, size, title }) => {
    document.getElementById(btn).addEventListener('click', () => {
        const modal = new Modal({
            title,
            body: `<p>This modal has size: <strong>${size || 'default'}</strong></p>`,
            size,
            showClose: false
        })
        modal.init()
        modal.open()
    })
})

// 5. Custom Form Content
document.getElementById('btn-custom').addEventListener('click', () => {
    const modal = new Modal({
        title: 'User Information',
        body: `
            <form id="modal-form">
                <div class="mb-3">
                    <label for="userName" class="form-label">Name</label>
                    <input type="text" class="form-control" id="userName" placeholder="Enter your name">
                </div>
                <div class="mb-3">
                    <label for="userEmail" class="form-label">Email</label>
                    <input type="email" class="form-control" id="userEmail" placeholder="Enter your email">
                </div>
                <div class="mb-3">
                    <label for="userMessage" class="form-label">Message</label>
                    <textarea class="form-control" id="userMessage" rows="3" placeholder="Your message..."></textarea>
                </div>
            </form>
        `,
        confirmLabel: 'Submit',
        closeLabel: 'Cancel',
        closeOnConfirm: false
    })

    modal.init()

    modal.on('confirm', () => {
        const name = modal.find('#userName').val()
        const email = modal.find('#userEmail').val()
        const message = modal.find('#userMessage').val()

        if (!name || !email) {
            alert('Please fill in name and email')
            return
        }

        showResult('result-custom', `Submitted: ${name} (${email}) - "${message}"`)
        modal.close()
    })

    modal.open()
})

// 6. Static Backdrop
document.getElementById('btn-static').addEventListener('click', () => {
    const modal = new Modal({
        title: 'Important Notice',
        body: `
            <p><strong>This modal cannot be dismissed by clicking outside.</strong></p>
            <p>You must click a button to close it.</p>
        `,
        backdrop: 'static',
        keyboard: false,
        confirmLabel: 'I Understand',
        showClose: false
    })

    modal.init()
    modal.open()
})

// 7. Content from URL (replaces ModalContentPopup)
document.getElementById('btn-content').addEventListener('click', async () => {
    showResult('result-content', 'Loading content...')

    const modal = await Modal.showContent(
        './sample-terms.html',
        'Terms & Conditions',
        { size: 'lg' }
    )

    modal.on('hidden', () => {
        showResult('result-content', 'Terms modal was closed')
    })
})

// 8. Content with Acceptance Checkbox
document.getElementById('btn-content-checkbox').addEventListener('click', async () => {
    showResult('result-checkbox', 'Loading content...')

    const modal = await Modal.showContent(
        './sample-terms.html',
        'Terms & Conditions',
        {
            checkboxLabel: 'I have read and accept the Terms & Conditions',
            confirmLabel: 'Accept',
            closeLabel: 'Decline'
        }
    )

    modal.on('confirm', () => {
        showResult('result-checkbox', 'User accepted the terms!')
    })

    modal.on('close', () => {
        showResult('result-checkbox', 'User declined the terms')
    })
})

// Expose for debugging
window.Modal = Modal
window.ConfirmDialog = ConfirmDialog
window.AlertDialog = AlertDialog

console.log('Modal Examples loaded. Try Modal, ConfirmDialog, AlertDialog in console.')
