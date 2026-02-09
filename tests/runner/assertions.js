/**
 * Assertion helpers for tests
 */

export const assert = {
    /**
     * Assert that a value is truthy
     */
    isTrue(value, message) {
        if (!value) {
            throw new Error(message || `Expected truthy, got ${value}`)
        }
    },

    /**
     * Assert that a value is falsy
     */
    isFalse(value, message) {
        if (value) {
            throw new Error(message || `Expected falsy, got ${value}`)
        }
    },

    /**
     * Assert strict equality
     */
    equals(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`)
        }
    },

    /**
     * Assert deep equality (for objects/arrays)
     */
    deepEquals(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Deep equality failed.\nExpected: ${JSON.stringify(expected)}\nGot: ${JSON.stringify(actual)}`)
        }
    },

    /**
     * Assert that value is not null/undefined
     */
    exists(value, message) {
        if (value == null) {
            throw new Error(message || `Expected value to exist, got ${value}`)
        }
    },

    /**
     * Assert that value is null
     */
    isNull(value, message) {
        if (value !== null) {
            throw new Error(message || `Expected null, got ${value}`)
        }
    },

    /**
     * Assert that value is undefined
     */
    isUndefined(value, message) {
        if (value !== undefined) {
            throw new Error(message || `Expected undefined, got ${value}`)
        }
    },

    /**
     * Assert that string contains substring
     */
    includes(str, substring, message) {
        if (!str.includes(substring)) {
            throw new Error(message || `Expected "${str}" to include "${substring}"`)
        }
    },

    /**
     * Assert that function throws an error
     */
    throws(fn, expectedMessage, message) {
        let threw = false
        let error = null
        try {
            fn()
        } catch (e) {
            threw = true
            error = e
        }
        if (!threw) {
            throw new Error(message || 'Expected function to throw')
        }
        if (expectedMessage && !error.message.includes(expectedMessage)) {
            throw new Error(message || `Expected error message to include "${expectedMessage}", got "${error.message}"`)
        }
    },

    /**
     * Assert that async function throws an error
     */
    async throwsAsync(fn, expectedMessage, message) {
        let threw = false
        let error = null
        try {
            await fn()
        } catch (e) {
            threw = true
            error = e
        }
        if (!threw) {
            throw new Error(message || 'Expected async function to throw')
        }
        if (expectedMessage && !error.message.includes(expectedMessage)) {
            throw new Error(message || `Expected error message to include "${expectedMessage}", got "${error.message}"`)
        }
    },

    /**
     * Assert instance of
     */
    instanceOf(value, constructor, message) {
        if (!(value instanceof constructor)) {
            throw new Error(message || `Expected instance of ${constructor.name}`)
        }
    },

    /**
     * Assert array length
     */
    lengthOf(arr, length, message) {
        if (arr.length !== length) {
            throw new Error(message || `Expected length ${length}, got ${arr.length}`)
        }
    }
}
