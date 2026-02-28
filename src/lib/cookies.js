const COOKIE_NAME = 'asx_screener_columns';
const MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Read column preferences from cookie.
 * Returns string[] of column IDs, or null if no preference saved.
 */
export function getColumnPreferences() {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));

  if (!match) return null;

  try {
    const value = decodeURIComponent(match.split('=')[1]);
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Save column preferences to cookie.
 * @param {string[]} visibleIds - array of column IDs to persist
 */
export function setColumnPreferences(visibleIds) {
  if (typeof document === 'undefined') return;

  const value = encodeURIComponent(JSON.stringify(visibleIds));
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

/**
 * Remove column preferences cookie.
 */
export function clearColumnPreferences() {
  if (typeof document === 'undefined') return;

  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
