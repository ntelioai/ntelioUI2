/**
 * TestRunner - Lightweight browser-based test runner
 *
 * @example
 * import { TestRunner } from './runner/TestRunner.js'
 * const { describe, it, itAsync } = TestRunner
 *
 * describe('MyWidget', () => {
 *     it('does something', () => {
 *         assert.equals(1 + 1, 2)
 *     })
 * })
 */

export class TestRunner {
    static results = { passed: 0, failed: 0, errors: [] }
    static _currentSuite = null

    /**
     * Define a test suite
     */
    static describe(name, fn) {
        console.group(`%c${name}`, 'font-weight: bold; font-size: 14px;')
        TestRunner._currentSuite = name
        fn()
        console.groupEnd()
    }

    /**
     * Define a synchronous test
     */
    static it(description, fn) {
        try {
            fn()
            TestRunner.results.passed++
            console.log(`%c✓ ${description}`, 'color: green;')
        } catch (e) {
            TestRunner.results.failed++
            TestRunner.results.errors.push({
                suite: TestRunner._currentSuite,
                description,
                error: e
            })
            console.log(`%c✗ ${description}`, 'color: red;')
            console.error(e)
        }
    }

    /**
     * Define an asynchronous test
     */
    static async itAsync(description, fn) {
        try {
            await fn()
            TestRunner.results.passed++
            console.log(`%c✓ ${description}`, 'color: green;')
        } catch (e) {
            TestRunner.results.failed++
            TestRunner.results.errors.push({
                suite: TestRunner._currentSuite,
                description,
                error: e
            })
            console.log(`%c✗ ${description}`, 'color: red;')
            console.error(e)
        }
    }

    /**
     * Print test summary
     */
    static summary() {
        console.log('\n' + '='.repeat(50))
        const total = TestRunner.results.passed + TestRunner.results.failed
        console.log(`Tests: ${total}`)
        console.log(`%cPassed: ${TestRunner.results.passed}`, 'color: green;')
        console.log(`%cFailed: ${TestRunner.results.failed}`, TestRunner.results.failed > 0 ? 'color: red;' : '')

        if (TestRunner.results.errors.length > 0) {
            console.log('\nFailed tests:')
            TestRunner.results.errors.forEach(({ suite, description, error }) => {
                console.log(`  ${suite} > ${description}`)
                console.log(`    ${error.message}`)
            })
        }

        console.log('='.repeat(50))
        return TestRunner.results.failed === 0
    }

    /**
     * Reset test results
     */
    static reset() {
        TestRunner.results = { passed: 0, failed: 0, errors: [] }
        TestRunner._currentSuite = null
    }
}
