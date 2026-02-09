/**
 * Toast Examples
 */
import { Toast } from '../../../../widgets/feedback/Toast.js'

// 1. Type variants
document.getElementById('btn-success').addEventListener('click', () => {
    Toast.success('Changes saved successfully!')
})
document.getElementById('btn-error').addEventListener('click', () => {
    Toast.error('Failed to save. Please try again.')
})
document.getElementById('btn-warning').addEventListener('click', () => {
    Toast.warning('Your session will expire in 5 minutes.')
})
document.getElementById('btn-info').addEventListener('click', () => {
    Toast.info('New version available.')
})

// 2. Custom duration
document.getElementById('btn-long').addEventListener('click', () => {
    Toast.show('This toast stays for 10 seconds', { type: 'info', duration: 10000 })
})
document.getElementById('btn-short').addEventListener('click', () => {
    Toast.show('Quick flash!', { type: 'success', duration: 1500 })
})
document.getElementById('btn-permanent').addEventListener('click', () => {
    Toast.show('Close me manually.', { type: 'warning', duration: 0 })
})

// 3. Stacking
document.getElementById('btn-stack').addEventListener('click', () => {
    const types = ['success', 'error', 'warning', 'info', 'success']
    types.forEach((type, i) => {
        setTimeout(() => Toast[type](`Toast #${i + 1} (${type})`), i * 200)
    })
})

// Expose for console testing
window.Toast = Toast
console.log('Toast Examples loaded. Try Toast.success("Hello!") in console.')
