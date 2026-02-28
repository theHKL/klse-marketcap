/**
 * JSON-LD structured data helpers for SEO.
 */

import { fixLogoUrl } from '@/lib/supabase/storage';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://klsemarketcap.com';

/**
 * Generate Corporation JSON-LD for a stock detail page.
 */
export function generateStockJsonLd(security) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Corporation',
    name: security.name,
    tickerSymbol: security.symbol,
    url: security.website || undefined,
    logo: fixLogoUrl(security.logo_url) || undefined,
    description: security.description || undefined,
    founder: security.ceo ? { '@type': 'Person', name: security.ceo } : undefined,
    numberOfEmployees: security.employees
      ? { '@type': 'QuantitativeValue', value: security.employees }
      : undefined,
    sameAs: security.website ? [security.website] : undefined,
  };
}

/**
 * Generate InvestmentFund JSON-LD for an ETF detail page.
 */
export function generateEtfJsonLd(security, etfDetails) {
  return {
    '@context': 'https://schema.org',
    '@type': 'InvestmentFund',
    name: security.name,
    tickerSymbol: security.symbol,
    description: security.description || undefined,
    url: etfDetails?.website || security.website || undefined,
    logo: fixLogoUrl(security.logo_url) || undefined,
    feesAndCommissionsSpecification: etfDetails?.expense_ratio != null
      ? `Expense Ratio: ${etfDetails.expense_ratio}%`
      : undefined,
  };
}

/**
 * Safely serialize an object to JSON for embedding in a <script> tag.
 * Escapes < and > to prevent XSS via </script> injection.
 */
export function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

/**
 * Generate BreadcrumbList JSON-LD.
 * @param {Array<{name: string, href: string}>} items
 */
export function generateBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.href}`,
    })),
  };
}
