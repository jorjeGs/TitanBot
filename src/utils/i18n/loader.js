// src/utils/i18n/loader.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCALES_DIR = path.resolve(__dirname, '../../locales');

export const DEFAULT_LOCALE = 'en-US';
export const SUPPORTED_LOCALES = ['en-US', 'es-419', 'de'];

let catalogs = null;

/**
 * Loads all translation catalogs synchronously into memory.
 */
export function loadCatalogs(forceReload = false) {
    if (catalogs && !forceReload) {
        return catalogs;
    }

    catalogs = {};

    try {
        if (!fs.existsSync(LOCALES_DIR)) {
            return catalogs;
        }

        const localeEntries = fs.readdirSync(LOCALES_DIR, { withFileTypes: true });

        for (const localeDirent of localeEntries) {
            if (!localeDirent.isDirectory()) continue;
            const locale = localeDirent.name;
            catalogs[locale] = {};

            const localePath = path.join(LOCALES_DIR, locale);
            const domainFiles = fs.readdirSync(localePath, { withFileTypes: true });

            for (const fileDirent of domainFiles) {
                if (!fileDirent.isFile() || !fileDirent.name.endsWith('.json')) continue;
                const domain = path.basename(fileDirent.name, '.json');
                const filePath = path.join(localePath, fileDirent.name);

                try {
                    const rawContent = fs.readFileSync(filePath, 'utf8');
                    catalogs[locale][domain] = JSON.parse(rawContent);
                } catch (err) {
                    console.error(`[i18n] Failed to parse translation file ${filePath}:`, err);
                }
            }
        }
    } catch (err) {
        console.error('[i18n] Failed to load locales directory:', err);
    }

    return catalogs;
}

/**
 * Traverses a nested object using dot-notation.
 */
function getNestedValue(obj, pathSegments) {
    let current = obj;
    for (const segment of pathSegments) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }
        current = current[segment];
    }
    return current;
}

/**
 * Retrieves a translated string by key path with automatic fallback to en-US.
 * @param {string} locale - Target locale code
 * @param {string} keyPath - e.g. "core.help.title"
 * @returns {string|null} - The translated text, or null if not found
 */
export function getRawTranslation(locale, keyPath) {
    if (!catalogs) {
        loadCatalogs();
    }

    if (!keyPath || typeof keyPath !== 'string') {
        return null;
    }

    const normalizedKey = keyPath.replace(':', '.');
    const segments = normalizedKey.split('.');
    const domain = segments[0];
    const subPath = segments.slice(1);

    // 1. Try requested locale
    if (catalogs[locale] && catalogs[locale][domain]) {
        const value = getNestedValue(catalogs[locale][domain], subPath);
        if (typeof value === 'string') {
            return value;
        }
    }

    // 2. Fallback to DEFAULT_LOCALE
    if (locale !== DEFAULT_LOCALE && catalogs[DEFAULT_LOCALE] && catalogs[DEFAULT_LOCALE][domain]) {
        const fallbackValue = getNestedValue(catalogs[DEFAULT_LOCALE][domain], subPath);
        if (typeof fallbackValue === 'string') {
            return fallbackValue;
        }
    }

    return null;
}

/**
 * Returns raw catalog object for a given locale and domain.
 */
export function getCatalog(locale, domain) {
    if (!catalogs) {
        loadCatalogs();
    }
    return catalogs[locale]?.[domain] || null;
}
