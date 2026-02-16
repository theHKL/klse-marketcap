/**
 * Format market cap as RM 1.2B, RM 450M, RM 12.3K
 */
export function formatMarketCap(value) {
  if (value == null || isNaN(value)) return "\u2014";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `RM ${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `RM ${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `RM ${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `RM ${(value / 1e3).toFixed(1)}K`;
  return `RM ${value.toFixed(0)}`;
}

/**
 * Format price as RM 5.42 (2-4 decimal places based on magnitude)
 */
export function formatPrice(value) {
  if (value == null || isNaN(value)) return "\u2014";
  const decimals = Math.abs(value) < 1 ? 4 : 2;
  return `RM ${Number(value).toFixed(decimals)}`;
}

/**
 * Format percentage change with sign: +2.45% or -1.30%
 */
export function formatChange(value) {
  if (value == null || isNaN(value)) return "\u2014";
  const num = Number(value);
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

/**
 * Format volume: 12.5M, 450K
 */
export function formatVolume(value) {
  if (value == null || isNaN(value)) return "\u2014";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

/**
 * Format number with locale commas
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return "\u2014";
  return Number(value).toLocaleString("en-MY");
}

/**
 * Format date string to "15 Feb 2026"
 */
export function formatDate(dateString) {
  if (!dateString) return "\u2014";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * XSS-safe JSON-LD serializer — escapes < and > characters
 */
export function safeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}
