// src/utils/i18n/interpolator.js

const INTERPOLATION_REGEX = /\{([a-zA-Z0-9_]+)\}/g;

/**
 * Safely replaces {variable} placeholders in a template string.
 * @param {string} template - The template string with {variable} placeholders
 * @param {Record<string, any>} variables - Object with values to interpolate
 * @returns {string} - Interpolated string
 */
export function interpolate(template, variables = {}) {
    if (typeof template !== 'string') {
        return '';
    }

    if (!variables || typeof variables !== 'object') {
        return template;
    }

    return template.replace(INTERPOLATION_REGEX, (match, key) => {
        if (Object.prototype.hasOwnProperty.call(variables, key)) {
            const val = variables[key];
            return val !== null && val !== undefined ? String(val) : '';
        }
        return match;
    });
}
