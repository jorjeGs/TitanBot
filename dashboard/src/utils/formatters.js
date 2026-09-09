/**
 * Defensive Browser Formatting Utilities for TitanBot Dashboard.
 * Prevents runtime crashes from Intl, invalid dates, and browser compatibility quirks.
 */

/**
 * Safely formats a date and time string without throwing runtime Intl exceptions.
 * @param {string|number|Date} dateInput
 * @param {string} [fallback='N/A']
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function safeFormatDateTime(
  dateInput,
  fallback = 'N/A',
  options = { dateStyle: 'medium', timeStyle: 'short' }
) {
  if (!dateInput) return fallback;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;

    // Use toLocaleString (toLocaleDateString does NOT support timeStyle)
    return d.toLocaleString(undefined, options);
  } catch {
    try {
      return new Date(dateInput).toLocaleString();
    } catch {
      return fallback;
    }
  }
}

/**
 * Safely formats only the date portion (day, month, year).
 * @param {string|number|Date} dateInput
 * @param {string} [fallback='N/A']
 * @returns {string}
 */
export function safeFormatDate(dateInput, fallback = 'N/A') {
  if (!dateInput) return fallback;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    try {
      return new Date(dateInput).toLocaleDateString();
    } catch {
      return fallback;
    }
  }
}

/**
 * Safely formats numbers with thousand separators.
 * @param {number|string} num
 * @param {string} [fallback='0']
 * @returns {string}
 */
export function safeFormatNumber(num, fallback = '0') {
  if (num === null || num === undefined) return fallback;
  const parsed = Number(num);
  if (isNaN(parsed)) return fallback;
  try {
    return parsed.toLocaleString();
  } catch {
    return String(parsed);
  }
}

/**
 * Safely formats relative time (e.g. "hace 5 minutos").
 * @param {string|number|Date} dateInput
 * @param {string} [fallback='Recientemente']
 * @returns {string}
 */
export function safeFormatRelativeTime(dateInput, fallback = 'Recientemente') {
  if (!dateInput) return fallback;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const time = d.getTime();
    if (isNaN(time)) return fallback;

    const diffMs = Date.now() - time;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 30) return `Hace ${diffDays} días`;

    return safeFormatDate(d, fallback);
  } catch {
    return fallback;
  }
}
