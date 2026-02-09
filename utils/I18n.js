/**
 * I18n - Internationalization utility
 * @category Utilities
 */

export class I18n {
    static _locale = 'en'
    static _translations = {}

    /**
     * Set the current locale for translations.
     * @param {string} locale - Locale code (e.g. 'en', 'fr', 'es')
     */
    static setLocale(locale) {
        I18n._locale = locale
    }

    /**
     * Get the current locale code.
     * @returns {string} Current locale (e.g. 'en')
     */
    static getLocale() {
        return I18n._locale
    }

    /**
     * Load translations for a locale from a plain object.
     * Merges with any existing translations for that locale.
     *
     * @param {string} locale - Locale code
     * @param {Object<string, string>} translations - Key-value translation pairs
     */
    static loadTranslations(locale, translations) {
        I18n._translations[locale] = {
            ...I18n._translations[locale],
            ...translations
        }
    }

    /**
     * Load translations from a JSON file at {basePath}/{locale}.json
     * @param {string} basePath - Directory URL containing locale JSON files
     * @param {string} [locale] - Locale to load (defaults to current)
     */
    static async load(basePath, locale) {
        locale = locale || I18n._locale
        const url = basePath.replace(/\/$/, '') + '/' + locale + '.json'
        const response = await fetch(url)
        if (!response.ok) throw new Error(`I18n: Failed to load ${url} (${response.status})`)
        const translations = await response.json()
        I18n.loadTranslations(locale, translations)
    }

    /**
     * Translate a key using the current locale's translations.
     * Supports {{param}} interpolation.
     *
     * @param {string} key - Translation key (returned as-is if no translation found)
     * @param {Object<string, string>} [params={}] - Interpolation values for {{key}} placeholders
     * @returns {string} Translated and interpolated string
     */
    static t(key, params = {}) {
        const translations = I18n._translations[I18n._locale] || {}
        let text = translations[key] || key

        // Interpolate parameters
        Object.keys(params).forEach(param => {
            text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param])
        })

        return text
    }

    /**
     * Alias for {@link I18n.t}.
     * @param {string} key - Translation key
     * @param {Object<string, string>} [params] - Interpolation values
     * @returns {string} Translated string
     */
    static translate(key, params) {
        return I18n.t(key, params)
    }
}
