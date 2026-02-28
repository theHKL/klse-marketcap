/**
 * Transform yahoo-finance2 responses to match our Supabase schema.
 */

/**
 * Remove .KL suffix for display.
 * @param {string} symbol - e.g. "1155.KL"
 * @returns {string} - e.g. "1155"
 */
export function stripSuffix(symbol) {
  if (!symbol) return '';
  return symbol.replace(/\.KL$/i, '');
}

/**
 * Add .KL suffix for Yahoo lookups.
 * @param {string} symbol - e.g. "1155"
 * @returns {string} - e.g. "1155.KL"
 */
export function toYahooSymbol(symbol) {
  if (!symbol) return '';
  if (symbol.toUpperCase().endsWith('.KL')) return symbol.toUpperCase();
  return `${symbol}.KL`;
}

/**
 * Determine security type from Yahoo quote type.
 * Yahoo classifies KLSE ETFs as EQUITY, so we also check the symbol
 * for the Bursa Malaysia "EA" suffix (e.g. 0800EA.KL).
 * @param {string} quoteType - e.g. "EQUITY", "ETF", "MUTUALFUND"
 * @param {string} [symbol] - Yahoo symbol for suffix-based detection
 * @returns {string} - "stock", "etf", or "fund"
 */
export function mapSecurityType(quoteType, symbol) {
  if (quoteType?.toUpperCase() === 'ETF') return 'etf';
  if (quoteType?.toUpperCase() === 'MUTUALFUND') return 'fund';
  // KLSE ETFs are classified as EQUITY by Yahoo but use the "EA" suffix
  if (symbol && /EA\.KL$/i.test(symbol)) return 'etf';
  return 'stock';
}

/**
 * Transform quoteSummary (summaryProfile + price modules) to securities columns.
 */
export function transformProfile(quoteSummary, yahooSymbol) {
  const profile = quoteSummary?.summaryProfile || {};
  const price = quoteSummary?.price || {};
  const detail = quoteSummary?.summaryDetail || {};

  return {
    yahoo_symbol: yahooSymbol,
    symbol: stripSuffix(yahooSymbol),
    name: price.longName || price.shortName || null,
    type: mapSecurityType(price.quoteType),
    sector: profile.sector || null,
    industry: profile.industry || null,
    description: profile.longBusinessSummary || null,
    website: profile.website || null,
    ceo: null, // Yahoo doesn't provide CEO directly
    employees: profile.fullTimeEmployees || null,
    currency: price.currency || 'MYR',
    exchange: price.exchangeName || 'Bursa Malaysia',
    country: profile.country || 'Malaysia',
    ipo_date: null, // Not available in quoteSummary
    beta: detail.beta ?? null,
    dividend_yield: detail.dividendYield ?? null,
    market_cap: price.marketCap ?? null,
    price: price.regularMarketPrice ?? null,
  };
}

/**
 * Transform a yahoo quote response to price/market data columns.
 */
export function transformQuote(quoteData) {
  if (!quoteData) return null;
  return {
    yahoo_symbol: quoteData.symbol,
    symbol: stripSuffix(quoteData.symbol),
    price: quoteData.regularMarketPrice ?? null,
    change_1d: quoteData.regularMarketChange ?? null,
    change_1d_pct: quoteData.regularMarketChangePercent ?? null,
    volume: quoteData.regularMarketVolume ?? null,
    day_high: quoteData.regularMarketDayHigh ?? null,
    day_low: quoteData.regularMarketDayLow ?? null,
    day_open: quoteData.regularMarketOpen ?? null,
    previous_close: quoteData.regularMarketPreviousClose ?? null,
    market_cap: quoteData.marketCap ?? null,
    pe_ratio: quoteData.trailingPE ?? null,
    eps: quoteData.epsTrailingTwelveMonths ?? null,
    year_high: quoteData.fiftyTwoWeekHigh ?? null,
    year_low: quoteData.fiftyTwoWeekLow ?? null,
    price_avg_50: quoteData.fiftyDayAverage ?? null,
    price_avg_200: quoteData.twoHundredDayAverage ?? null,
  };
}

/**
 * Transform incomeStatementHistory to our income_statements schema.
 */
export function transformIncomeStatement(stmt, securityId) {
  if (!stmt) return null;
  const date = stmt.endDate instanceof Date
    ? stmt.endDate.toISOString().split('T')[0]
    : stmt.endDate;
  return {
    security_id: securityId,
    date,
    period: 'FY',
    reported_currency: 'MYR',
    revenue: stmt.totalRevenue ?? null,
    gross_profit: stmt.grossProfit ?? null,
    operating_income: stmt.operatingIncome ?? null,
    operating_expenses: stmt.totalOperatingExpenses ?? null,
    net_income: stmt.netIncome ?? null,
    eps: stmt.dilutedEPS ?? null,
    eps_diluted: stmt.dilutedEPS ?? null,
    ebitda: stmt.ebitda ?? null,
  };
}

/**
 * Transform balanceSheetHistory to our balance_sheets schema.
 */
export function transformBalanceSheet(stmt, securityId) {
  if (!stmt) return null;
  const date = stmt.endDate instanceof Date
    ? stmt.endDate.toISOString().split('T')[0]
    : stmt.endDate;
  return {
    security_id: securityId,
    date,
    period: 'FY',
    reported_currency: 'MYR',
    total_assets: stmt.totalAssets ?? null,
    total_liabilities: stmt.totalLiab ?? null,
    total_stockholders_equity: stmt.totalStockholderEquity ?? null,
    total_debt: stmt.longTermDebt ?? null,
    net_debt: (stmt.longTermDebt != null && stmt.cash != null) ? stmt.longTermDebt - stmt.cash : null,
    cash_and_cash_equivalents: stmt.cash ?? null,
  };
}

/**
 * Transform cashflowStatementHistory to our cash_flow_statements schema.
 */
export function transformCashFlow(stmt, securityId) {
  if (!stmt) return null;
  const date = stmt.endDate instanceof Date
    ? stmt.endDate.toISOString().split('T')[0]
    : stmt.endDate;
  return {
    security_id: securityId,
    date,
    period: 'FY',
    reported_currency: 'MYR',
    operating_cash_flow: stmt.totalCashFromOperatingActivities ?? null,
    capital_expenditure: stmt.capitalExpenditures ?? null,
    free_cash_flow: (stmt.totalCashFromOperatingActivities != null && stmt.capitalExpenditures != null) ? (stmt.totalCashFromOperatingActivities + stmt.capitalExpenditures) : null,
    dividends_paid: stmt.dividendsPaid ?? null,
  };
}

/**
 * Transform defaultKeyStatistics + financialData to key_metrics schema.
 */
export function transformKeyMetrics(data, securityId, date) {
  const stats = data?.defaultKeyStatistics || {};
  const fin = data?.financialData || {};
  return {
    security_id: securityId,
    date: date || new Date().toISOString().split('T')[0],
    pe_ratio: stats.trailingEps ? (fin.currentPrice / stats.trailingEps) : null,
    pb_ratio: stats.priceToBook ?? null,
    ps_ratio: null,
    eps: stats.trailingEps ?? null,
    roe: fin.returnOnEquity ?? null,
    roa: fin.returnOnAssets ?? null,
    current_ratio: fin.currentRatio ?? null,
    debt_to_equity: fin.debtToEquity ?? null,
    dividend_yield: stats.lastDividendValue ? (stats.lastDividendValue / (fin.currentPrice || 1)) : null,
    book_value_per_share: stats.bookValue ?? null,
    enterprise_value: stats.enterpriseValue ?? null,
  };
}

/**
 * Transform a historical price record to daily_prices schema.
 */
export function transformDailyPrice(record, securityId) {
  if (!record) return null;
  const date = record.date instanceof Date
    ? record.date.toISOString().split('T')[0]
    : record.date;
  return {
    security_id: securityId,
    date,
    open: record.open ?? null,
    high: record.high ?? null,
    low: record.low ?? null,
    close: record.close ?? null,
    adj_close: record.adjClose ?? record.close ?? null,
    volume: record.volume ?? null,
  };
}

/**
 * Transform quoteSummary for ETF-specific info.
 */
export function transformEtfInfo(quoteSummary, securityId) {
  const fund = quoteSummary?.fundProfile || {};
  const stats = quoteSummary?.defaultKeyStatistics || {};
  const holdings = quoteSummary?.topHoldings || {};

  return {
    security_id: securityId,
    expense_ratio: fund.feesExpensesInvestment?.annualReportExpenseRatio ??
      stats.annualReportExpenseRatio ?? null,
    aum: stats.totalAssets ?? null,
    nav: stats.navPrice ?? null,
    issuer: fund.family || null,
    inception_date: fund.fundInceptionDate instanceof Date
      ? fund.fundInceptionDate.toISOString().split('T')[0]
      : fund.fundInceptionDate || null,
    asset_class: fund.categoryName || null,
    holdings_count: holdings.holdings?.length ?? null,
    website: null,
  };
}

/**
 * Transform ETF top holdings.
 */
export function transformEtfHoldings(quoteSummary, securityId) {
  const holdings = quoteSummary?.topHoldings?.holdings || [];
  return holdings.map((h) => ({
    security_id: securityId,
    holding_symbol: h.symbol || null,
    holding_name: h.holdingName || null,
    weight_pct: h.holdingPercent != null ? h.holdingPercent * 100 : null,
  }));
}

/**
 * Transform ETF sector weightings.
 */
export function transformEtfSectorWeights(quoteSummary, securityId) {
  const weights = quoteSummary?.topHoldings?.sectorWeightings || [];
  return weights.flatMap((w) =>
    Object.entries(w).map(([sector, weight]) => ({
      security_id: securityId,
      sector: formatSectorName(sector),
      weight_pct: weight != null ? weight * 100 : null,
    }))
  );
}

/**
 * Convert camelCase sector key to readable name.
 */
function formatSectorName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\s/, '')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
