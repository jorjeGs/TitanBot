// src/utils/i18n/index.js
import { getRawTranslation, loadCatalogs, getCatalog, DEFAULT_LOCALE, SUPPORTED_LOCALES } from './loader.js';
import { interpolate } from './interpolator.js';
import { resolveLocale, normalizeLocale } from './resolver.js';
import { localizeSlashCommand, localizeSubcommand, localizeOption, localizeFullCommand } from './commandLocalizer.js';

export {
    loadCatalogs,
    getCatalog,
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    resolveLocale,
    normalizeLocale,
    localizeSlashCommand,
    localizeSubcommand,
    localizeOption,
    localizeFullCommand,
};

/**
 * Main translation function.
 * Supports flexible signatures:
 *   t(key)
 *   t(key, target)
 *   t(key, variables, target)
 *   t(key, target, variables)
 * 
 * @param {string} key - Dot-separated key path (e.g. 'core.help.title', 'common.errors.unknown')
 * @param {any} [arg1={}] - Variables object OR target context (Interaction, Guild, locale string)
 * @param {any} [arg2=null] - Target context OR variables object
 * @param {object|null} [guildConfig=null] - Optional guild configuration object
 * @returns {string} The localized and interpolated string
 */
export function t(key, arg1 = {}, arg2 = null, guildConfig = null) {
    if (!key || typeof key !== 'string') {
        return '';
    }

    let variables = {};
    let target = null;

    const isTarget = (arg) => {
        if (!arg) return false;
        if (typeof arg === 'string') return true;
        if (typeof arg === 'object') {
            if (
                arg.locale !== undefined || 
                arg.guildLocale !== undefined || 
                arg.guild !== undefined || 
                arg.isCommand !== undefined || 
                arg.isButton !== undefined || 
                arg.inGuild !== undefined || 
                arg.preferredLocale !== undefined || 
                arg.client !== undefined
            ) {
                return true;
            }
        }
        return false;
    };

    if (isTarget(arg1) && (!arg2 || !isTarget(arg2))) {
        target = arg1;
        variables = (arg2 && typeof arg2 === 'object') ? arg2 : {};
    } else {
        variables = (arg1 && typeof arg1 === 'object') ? arg1 : {};
        target = arg2;
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
