// src/utils/i18n/index.js
import { getRawTranslation, loadCatalogs, DEFAULT_LOCALE, SUPPORTED_LOCALES } from './loader.js';
import { interpolate } from './interpolator.js';
import { resolveLocale, normalizeLocale } from './resolver.js';
import { localizeSlashCommand, localizeSubcommand, localizeOption } from './commandLocalizer.js';

export {
    loadCatalogs,
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    resolveLocale,
    normalizeLocale,
    localizeSlashCommand,
    localizeSubcommand,
    localizeOption,
};

/**
 * Main translation function.
 * @param {string} key - Dot-separated key path (e.g. 'core.help.title', 'common.errors.unknown')
 * @param {Record<string, any>} [variables={}] - Key-value map of variables to interpolate into {varName}
 * @param {any} [target=null] - Context: Interaction, Guild, locale string, or null
 * @param {object|null} [guildConfig=null] - Optional guild configuration object
 * @returns {string} The localized and interpolated string
 */
export function t(key, variables = {}, target = null, guildConfig = null) {
    if (!key || typeof key !== 'string') {
        return '';
    }

    const effectiveLocale = resolveLocale(target, guildConfig);
    const rawTemplate = getRawTranslation(effectiveLocale, key);

    if (rawTemplate === null || rawTemplate === undefined) {
        // Safe fallback: if translation is completely missing in both requested locale and en-US
        return key;
    }

    return interpolate(rawTemplate, variables);
}

// Ensure catalogs are loaded on first import
loadCatalogs();
