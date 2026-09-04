// src/utils/i18n/resolver.js
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './loader.js';

/**
 * Normalizes a locale string to one of our supported locales.
 * Mappings:
 *  - es-* -> es-419
 *  - en-* -> en-US
 *  - de-* -> de
 *  - others -> en-US
 * @param {string|null|undefined} locale
 * @returns {string}
 */
export function normalizeLocale(locale) {
    if (!locale || typeof locale !== 'string') {
        return DEFAULT_LOCALE;
    }

    const trimmed = locale.trim();

    // Exact match
    if (SUPPORTED_LOCALES.includes(trimmed)) {
        return trimmed;
    }

    const lower = trimmed.toLowerCase();

    // Specific regional normalization
    if (lower === 'es-419') return 'es-419';
    if (lower.startsWith('es')) return 'es-419';
    if (lower.startsWith('en')) return 'en-US';
    if (lower.startsWith('de')) return 'de';

    return DEFAULT_LOCALE;
}

/**
 * Resolves the effective locale given a target context and optional guild configuration.
 * @param {any} target - Interaction, Guild, locale string, or null
 * @param {object|null} guildConfig - Optional guildConfig object
 * @returns {string}
 */
export function resolveLocale(target = null, guildConfig = null) {
    // 1. Forced guild locale takes precedence if set and not 'auto'
    if (guildConfig?.locale && guildConfig.locale !== 'auto') {
        return normalizeLocale(guildConfig.locale);
    }

    if (!target) {
        return DEFAULT_LOCALE;
    }

    // 2. Explicit string locale passed
    if (typeof target === 'string') {
        return normalizeLocale(target);
    }

    // 3. User interaction (Slash command, button, select menu, modal)
    if (target.locale && typeof target.locale === 'string') {
        return normalizeLocale(target.locale);
    }

    // 4. Discord Guild object
    if (target.preferredLocale && typeof target.preferredLocale === 'string') {
        return normalizeLocale(target.preferredLocale);
    }

    return DEFAULT_LOCALE;
}
