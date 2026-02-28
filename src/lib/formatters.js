/**
 * Format a market cap value into human-readable string.
 * e.g. 298825065176 -> "RM298.83B"
 */
export function formatMarketCap(value) {
  if (value == null) return '\u2014';
  if (value >= 1e12) return `RM${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `RM${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `RM${(value / 1e6).toFixed(1)}M`;
  return `RM${value.toLocaleString()}`;
}

/**
 * Format a price in MYR currency.
 */
export function formatPrice(value) {
  if (value == null) return '\u2014';
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Format a percentage change with sign prefix.
 * e.g. 12.6 -> "+12.60%", -3.5 -> "-3.50%"
 */
export function formatChange(value) {
  if (value == null) return '\u2014';
  if (!Number.isFinite(value)) return '\u2014';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a volume with compact notation.
 * e.g. 4169009 -> "4.2M"
 */
export function formatVolume(value) {
  if (value == null) return '\u2014';
  return new Intl.NumberFormat('en-MY', { notation: 'compact' }).format(value);
}

/**
 * Format a date string to locale display.
 */
export function formatDate(value) {
  if (!value) return '\u2014';
  return new Intl.DateTimeFormat('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

/**
 * Format a number with locale grouping.
 */
export function formatNumber(value, opts = {}) {
  if (value == null) return '\u2014';
  return new Intl.NumberFormat('en-MY', opts).format(value);
}

/**
 * Format a ratio to 2 decimal places (P/E, Beta, EPS).
 */
export function formatRatio(value) {
  if (value == null || !Number.isFinite(value)) return '\u2014';
  return value.toFixed(2);
}

/**
 * Format a yield stored as decimal (0.045) to percentage ("4.50%").
 */
export function formatYieldPct(value) {
  if (value == null || !Number.isFinite(value)) return '\u2014';
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Format a value already in percentage form (0.40) to display ("0.40%").
 * Used for expense_ratio which is returned as a percentage, not a decimal.
 */
export function formatRawPct(value) {
  if (value == null || !Number.isFinite(value)) return '\u2014';
  return `${Number(value).toFixed(2)}%`;
}
