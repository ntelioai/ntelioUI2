/**
 * LoginDialog Examples
 */
import { LoginDialog } from '../../../application/LoginDialog.js'

/**
 * Display a result message in a specific output element.
 * @param {string} id - DOM element ID to write into
 * @param {string} text - Result text to display
 */
function showResult(id, text) {
    document.getElementById(id).textContent = text
}

/**
 * Mock authentication function for demo purposes.
 * Accepts admin/secret credentials.
 *
 * @param {{username: string, password: string}} credentials
 * @returns {Promise<{token: string, username: string}>}
 * @throws {Error} If credentials are invalid
 */
async function mockAuthenticate(credentials) {
    if (credentials.username === 'admin' && credentials.password === 'secret') {
        return { token: 'tok_' + Date.now(), username: credentials.username }
    }
    throw new Error('Invalid username or password')
}

/**
 * Slow mock authentication that adds a 1.5s delay (for loading state demo).
 *
 * @param {{username: string, password: string}} credentials
 * @returns {Promise<{token: string, username: string}>}
 */
async function slowMockAuthenticate(credentials) {
    await new Promise(r => setTimeout(r, 1500))
    return mockAuthenticate(credentials)
}

// 1. Basic Login
document.getElementById('btn-basic-login').addEventListener('click', async () => {
    showResult('result-basic', 'Waiting for login...')
    try {
        const result = await LoginDialog.open({
            authenticate: mockAuthenticate
        })
        showResult('result-basic', `Logged in! Token: ${result.token}, User: ${result.username}`)
    } catch (e) {
        showResult('result-basic', `Login dismissed: ${e.message}`)
    }
})

// 2. Login with Terms
document.getElementById('btn-terms-login').addEventListener('click', async () => {
    showResult('result-terms', 'Waiting for login...')
    try {
        const result = await LoginDialog.open({
            authenticate: mockAuthenticate,
            termsUrl: './sample-terms.html',
            termsTitle: 'Terms and Conditions'
        })
        showResult('result-terms', `Logged in! Token: ${result.token}, User: ${result.username}`)
    } catch (e) {
        showResult('result-terms', `Login dismissed: ${e.message}`)
    }
})

// 3. Custom Options
document.getElementById('btn-custom-login').addEventListener('click', async () => {
    showResult('result-custom', 'Waiting for login...')
    try {
        const result = await LoginDialog.open({
            authenticate: slowMockAuthenticate,
            title: 'Welcome Back',
            showRememberMe: false
        })
        showResult('result-custom', `Logged in! Token: ${result.token}, User: ${result.username}`)
    } catch (e) {
        showResult('result-custom', `Login dismissed: ${e.message}`)
    }
})

window.LoginDialog = LoginDialog
console.log('LoginDialog Examples loaded.')
