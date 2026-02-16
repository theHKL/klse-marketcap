const FMP_BASE = 'https://financialmodelingprep.com/api';
const API_KEY = process.env.FMP_API_KEY;

/**
 * Core fetch helper with retry logic (3 attempts, exponential backoff).
 * Returns parsed JSON or null on failure.
 */
async function fmpFetch(path, params = {}) {
  const url = new URL(`${FMP_BASE}${path}`);
  url.searchParams.set('apikey', API_KEY);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const maxRetries = 3;
  const backoffMs = [1000, 2000, 4000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`FMP API error: ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.error(
        `[FMP] Attempt ${attempt + 1}/${maxRetries} failed for ${path}:`,
        err.message
      );
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, backoffMs[attempt]));
      }
    }
  }

  console.error(`[FMP] All ${maxRetries} attempts failed for ${path}`);
  return null;
}

/** GET /v3/stock/list — filter to .KL tickers only */
export async function getStockList() {
  const data = await fmpFetch('/v3/stock/list');
  if (!data) return [];
  return data.filter((item) => item.symbol && item.symbol.endsWith('.KL'));
}

/** GET /v3/etf/list — filter to .KL tickers only */
export async function getETFList() {
  const data = await fmpFetch('/v3/etf/list');
  if (!data) return [];
  return data.filter((item) => item.symbol && item.symbol.endsWith('.KL'));
}

/** GET /v3/profile/{symbol} — returns first item */
export async function getProfile(fmpSymbol) {
  const data = await fmpFetch(`/v3/profile/${encodeURIComponent(fmpSymbol)}`);
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

/**
 * GET /v3/quote/{symbols} — batch into groups of 50, merge results.
 * fmpSymbols is an array of strings.
 */
export async function getBulkQuotes(fmpSymbols) {
  const results = [];
  const batchSize = 50;

  for (let i = 0; i < fmpSymbols.length; i += batchSize) {
    const batch = fmpSymbols.slice(i, i + batchSize);
    const joined = batch.map((s) => encodeURIComponent(s)).join(',');
    const data = await fmpFetch(`/v3/quote/${joined}`);
    if (data && Array.isArray(data)) {
      results.push(...data);
    }
  }

  return results;
}

/** GET /v3/historical-price-full/{symbol}?from=&to= */
export async function getHistoricalPrices(fmpSymbol, from, to) {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return fmpFetch(
    `/v3/historical-price-full/${encodeURIComponent(fmpSymbol)}`,
    params
  );
}

/** GET /v3/income-statement/{symbol} */
export async function getIncomeStatements(fmpSymbol, period, limit) {
  return fmpFetch(
    `/v3/income-statement/${encodeURIComponent(fmpSymbol)}`,
    { period, limit }
  );
}

/** GET /v3/balance-sheet-statement/{symbol} */
export async function getBalanceSheets(fmpSymbol, period, limit) {
  return fmpFetch(
    `/v3/balance-sheet-statement/${encodeURIComponent(fmpSymbol)}`,
    { period, limit }
  );
}

/** GET /v3/cash-flow-statement/{symbol} */
export async function getCashFlowStatements(fmpSymbol, period, limit) {
  return fmpFetch(
    `/v3/cash-flow-statement/${encodeURIComponent(fmpSymbol)}`,
    { period, limit }
  );
}

/** GET /v3/key-metrics/{symbol} */
export async function getKeyMetrics(fmpSymbol, period, limit) {
  return fmpFetch(
    `/v3/key-metrics/${encodeURIComponent(fmpSymbol)}`,
    { period, limit }
  );
}

/** GET /v4/stock_peers?symbol={symbol} */
export async function getStockPeers(fmpSymbol) {
  return fmpFetch('/v4/stock_peers', { symbol: fmpSymbol });
}

/** GET /v3/etf-holder/{symbol} */
export async function getETFHoldings(fmpSymbol) {
  return fmpFetch(`/v3/etf-holder/${encodeURIComponent(fmpSymbol)}`);
}

/** GET /v3/etf-sector-weightings/{symbol} */
export async function getETFSectorWeights(fmpSymbol) {
  return fmpFetch(
    `/v3/etf-sector-weightings/${encodeURIComponent(fmpSymbol)}`
  );
}

/** GET /v4/etf-info?symbol={symbol} */
export async function getETFInfo(fmpSymbol) {
  const data = await fmpFetch('/v4/etf-info', { symbol: fmpSymbol });
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  return data[0];
}
