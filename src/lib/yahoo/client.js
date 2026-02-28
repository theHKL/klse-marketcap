/**
 * Yahoo Finance 2 API wrapper for KLSE data.
 * Provides rate-limited, batched access to yahoo-finance2 library.
 */
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  validation: { logErrors: false },
});

const DEFAULT_CONCURRENCY = 4;
const BATCH_DELAY_MS = 200;
const YF_SCREENER_URL = 'https://query2.finance.yahoo.com/v1/finance/screener';
const YF_CRUMB_URL = 'https://query2.finance.yahoo.com/v1/test/getcrumb';
const YF_COOKIE_URL = 'https://fc.yahoo.com/';

/** Cached Yahoo crumb + cookie for raw API calls. */
let _crumbCache = { crumb: null, cookie: null, expiresAt: 0 };

/**
 * Get a Yahoo Finance crumb + cookie pair (cached for 30 min).
 */
async function getYahooCrumb() {
  if (_crumbCache.crumb && Date.now() < _crumbCache.expiresAt) {
    return _crumbCache;
  }
  const cookieRes = await fetch(YF_COOKIE_URL, { redirect: 'manual' });
  const setCookies = cookieRes.headers.getSetCookie?.() || [];
  const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
  const crumbRes = await fetch(YF_CRUMB_URL, {
    headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0' },
  });
  const crumb = await crumbRes.text();
  if (!crumb) throw new Error('Failed to obtain Yahoo crumb');
  _crumbCache = { crumb, cookie, expiresAt: Date.now() + 30 * 60 * 1000 };
  return _crumbCache;
}

/**
 * Retry a function with exponential backoff.
 */
async function withRetry(fn, retries = 2, baseDelay = 500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Batch-fetch items with concurrency and rate limiting.
 * @param {Array} items - items to process
 * @param {Function} fetchFn - async function(item) => result
 * @param {number} concurrency - max parallel requests
 * @returns {Promise<Array>} - results (nulls filtered out)
 */
export async function yahooBatchFetch(items, fetchFn, concurrency = DEFAULT_CONCURRENCY) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fetchFn));
    for (const r of batchResults) {
      if (r.status === 'fulfilled' && r.value != null) {
        results.push(r.value);
      }
    }
    if (i + concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
  return results;
}

/**
 * Get a live quote for a single symbol.
 * @param {string} symbol - Yahoo symbol (e.g. "1155.KL")
 * @returns {Promise<Object|null>}
 */
export async function getQuote(symbol) {
  try {
    return await withRetry(() => yahooFinance.quote(symbol, {}, { validateResult: false }));
  } catch (err) {
    console.error(`Yahoo quote failed for ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Get live quotes for multiple symbols.
 * @param {string[]} symbols - Yahoo symbols
 * @returns {Promise<Object[]>}
 */
export async function getQuotes(symbols) {
  return yahooBatchFetch(symbols, async (sym) => {
    const q = await yahooFinance.quote(sym, {}, { validateResult: false });
    return q ?? null;
  });
}

/**
 * Get detailed quote summary with specified modules.
 * @param {string} symbol
 * @param {string[]} modules - e.g. ['summaryProfile', 'price', 'summaryDetail']
 * @returns {Promise<Object|null>}
 */
export async function getQuoteSummary(symbol, modules) {
  try {
    return await withRetry(() =>
      yahooFinance.quoteSummary(symbol, { modules }, { validateResult: false })
    );
  } catch (err) {
    console.error(`Yahoo quoteSummary failed for ${symbol}:`, err.message);
    return null;
  }
}

/**
 * Get historical daily prices.
 * @param {string} symbol
 * @param {Object} options - { period1, period2, interval }
 * @returns {Promise<Object[]>}
 */
export async function getHistorical(symbol, options = {}) {
  try {
    const result = await withRetry(() => yahooFinance.historical(symbol, {
      period1: options.period1 || '2020-01-01',
      period2: options.period2 || new Date().toISOString().split('T')[0],
      interval: options.interval || '1d',
    }, { validateResult: false }));
    return result || [];
  } catch (err) {
    console.error(`Yahoo historical failed for ${symbol}:`, err.message);
    return [];
  }
}

/**
 * Search for securities matching a query.
 * @param {string} query
 * @returns {Promise<Object[]>}
 */
export async function searchSecurities(query) {
  try {
    const result = await yahooFinance.search(query, { quotesCount: 20, newsCount: 0 }, { validateResult: false });
    return (result.quotes || []).filter(
      (q) => q.exchange === 'KLS' || q.symbol?.endsWith('.KL')
    );
  } catch (err) {
    console.error(`Yahoo search failed for "${query}":`, err.message);
    return [];
  }
}

/**
 * Discover KLSE securities using Yahoo Finance custom screener API.
 * Uses direct HTTP to the custom screener endpoint (not the predefined
 * screen IDs which are US-only). Note: Yahoo classifies KLSE ETFs as
 * EQUITY, so they are included in the results — use mapSecurityType()
 * with the symbol to detect ETFs by their "EA" suffix.
 * @param {number} offset - pagination offset
 * @param {number} size - page size (max 250)
 * @returns {Promise<Object[]>}
 */
export async function screenKlseSecurities(offset = 0, size = 250) {
  try {
    const { crumb, cookie } = await getYahooCrumb();
    const res = await fetch(`${YF_SCREENER_URL}?crumb=${encodeURIComponent(crumb)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        offset,
        size,
        sortField: 'intradaymarketcap',
        sortType: 'DESC',
        quoteType: 'EQUITY',
        query: {
          operator: 'AND',
          operands: [{ operator: 'eq', operands: ['region', 'my'] }],
        },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data?.finance?.result?.[0]?.quotes || [];
  } catch (err) {
    console.error(`Yahoo custom screener failed (offset ${offset}):`, err.message);
    return [];
  }
}
