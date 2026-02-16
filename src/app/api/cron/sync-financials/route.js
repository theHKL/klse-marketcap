import { NextResponse } from 'next/server';
import {
  getIncomeStatements,
  getBalanceSheets,
  getCashFlowStatements,
  getKeyMetrics,
  getStockPeers,
  getETFHoldings,
  getETFSectorWeights,
} from '@/lib/fmp';
import {
  verifyCronSecret,
  createServiceClient,
  logSyncStart,
  logSyncComplete,
  logSyncFail,
  sleep,
} from '@/lib/cron-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

/**
 * Map FMP period string to our DB period format.
 * FMP uses "FY" for annual and "Q1","Q2","Q3","Q4" for quarterly.
 */
function mapPeriod(fmpPeriod) {
  if (!fmpPeriod) return 'FY';
  const upper = fmpPeriod.toUpperCase();
  if (upper === 'FY' || upper === 'ANNUAL') return 'FY';
  if (['Q1', 'Q2', 'Q3', 'Q4'].includes(upper)) return upper;
  return 'FY';
}

export async function GET(request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const logId = await logSyncStart(supabase, 'sync-financials');

  try {
    // Fetch all active securities
    const { data: securities, error: fetchErr } = await supabase
      .from('securities')
      .select('id, fmp_symbol, type')
      .eq('is_actively_trading', true)
      .not('fmp_symbol', 'is', null);

    if (fetchErr) throw new Error(`Failed to fetch securities: ${fetchErr.message}`);

    const stocks = (securities || []).filter((s) => s.type === 'stock');
    const etfs = (securities || []).filter((s) => s.type === 'etf');

    let processed = 0;

    // Process stocks
    for (const stock of stocks) {
      try {
        await sleep(250); // Rate limit

        // Income statements
        const incomeData = await getIncomeStatements(stock.fmp_symbol, 'annual', 5);
        if (incomeData && Array.isArray(incomeData)) {
          for (const stmt of incomeData) {
            const { error } = await supabase.from('income_statements').upsert(
              {
                security_id: stock.id,
                period: mapPeriod(stmt.period),
                date: stmt.date,
                fiscal_year: stmt.calendarYear || null,
                reported_currency: stmt.reportedCurrency || 'MYR',
                revenue: stmt.revenue,
                gross_profit: stmt.grossProfit,
                operating_income: stmt.operatingIncome,
                operating_expenses: stmt.operatingExpenses,
                net_income: stmt.netIncome,
                eps: stmt.eps,
                eps_diluted: stmt.epsdiluted,
                ebitda: stmt.ebitda,
              },
              { onConflict: 'security_id,date,period' }
            );
            if (error) console.error(`[sync-financials] income upsert ${stock.fmp_symbol}:`, error.message);
          }
        }

        // Balance sheets
        const balanceData = await getBalanceSheets(stock.fmp_symbol, 'annual', 5);
        if (balanceData && Array.isArray(balanceData)) {
          for (const stmt of balanceData) {
            const { error } = await supabase.from('balance_sheets').upsert(
              {
                security_id: stock.id,
                period: mapPeriod(stmt.period),
                date: stmt.date,
                fiscal_year: stmt.calendarYear || null,
                reported_currency: stmt.reportedCurrency || 'MYR',
                total_assets: stmt.totalAssets,
                total_liabilities: stmt.totalLiabilities,
                total_stockholders_equity: stmt.totalStockholdersEquity,
                total_debt: stmt.totalDebt,
                net_debt: stmt.netDebt,
                cash_and_cash_equivalents: stmt.cashAndCashEquivalents,
              },
              { onConflict: 'security_id,date,period' }
            );
            if (error) console.error(`[sync-financials] balance upsert ${stock.fmp_symbol}:`, error.message);
          }
        }

        // Cash flow statements
        const cashFlowData = await getCashFlowStatements(stock.fmp_symbol, 'annual', 5);
        if (cashFlowData && Array.isArray(cashFlowData)) {
          for (const stmt of cashFlowData) {
            const { error } = await supabase.from('cash_flow_statements').upsert(
              {
                security_id: stock.id,
                period: mapPeriod(stmt.period),
                date: stmt.date,
                fiscal_year: stmt.calendarYear || null,
                reported_currency: stmt.reportedCurrency || 'MYR',
                operating_cash_flow: stmt.operatingCashFlow,
                capital_expenditure: stmt.capitalExpenditure,
                free_cash_flow: stmt.freeCashFlow,
                dividends_paid: stmt.dividendsPaid,
              },
              { onConflict: 'security_id,date,period' }
            );
            if (error) console.error(`[sync-financials] cashflow upsert ${stock.fmp_symbol}:`, error.message);
          }
        }

        // Key metrics
        const metricsData = await getKeyMetrics(stock.fmp_symbol, 'annual', 5);
        if (metricsData && Array.isArray(metricsData)) {
          for (const m of metricsData) {
            const { error } = await supabase.from('key_metrics').upsert(
              {
                security_id: stock.id,
                date: m.date,
                pe_ratio: m.peRatio,
                ps_ratio: m.priceToSalesRatio,
                pb_ratio: m.pbRatio,
                eps: m.netIncomePerShare,
                dividend_yield: m.dividendYield,
                roe: m.roe,
                roa: m.returnOnTangibleAssets,
                debt_to_equity: m.debtToEquity,
                current_ratio: m.currentRatio,
                market_cap: m.marketCap,
                enterprise_value: m.enterpriseValue,
                revenue_per_share: m.revenuePerShare,
                net_income_per_share: m.netIncomePerShare,
                book_value_per_share: m.bookValuePerShare,
              },
              { onConflict: 'security_id,date' }
            );
            if (error) console.error(`[sync-financials] metrics upsert ${stock.fmp_symbol}:`, error.message);
          }
        }

        // Stock peers
        const peersData = await getStockPeers(stock.fmp_symbol);
        if (peersData && Array.isArray(peersData) && peersData.length > 0) {
          const peers = peersData[0]?.peersList || [];
          for (const peerSymbol of peers) {
            const { error } = await supabase.from('stock_peers').upsert(
              {
                security_id: stock.id,
                peer_fmp_symbol: peerSymbol,
              },
              { onConflict: 'security_id,peer_fmp_symbol' }
            );
            if (error) console.error(`[sync-financials] peer upsert ${stock.fmp_symbol}:`, error.message);
          }
        }

        processed++;
      } catch (innerErr) {
        console.error(`[sync-financials] Error processing stock ${stock.fmp_symbol}:`, innerErr.message);
      }
    }

    // Process ETFs
    for (const etf of etfs) {
      try {
        await sleep(250); // Rate limit

        // ETF holdings
        const holdingsData = await getETFHoldings(etf.fmp_symbol);
        if (holdingsData && Array.isArray(holdingsData)) {
          for (const holding of holdingsData) {
            const { error } = await supabase.from('etf_holdings').upsert(
              {
                etf_security_id: etf.id,
                holding_symbol: holding.asset || null,
                holding_name: holding.name || null,
                weight_percentage: holding.weightPercentage || null,
                shares: holding.sharesNumber || null,
                market_value: holding.marketValue || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'etf_security_id,holding_symbol' }
            );
            if (error) console.error(`[sync-financials] holding upsert ${etf.fmp_symbol}:`, error.message);
          }
        }

        // ETF sector weights
        const sectorData = await getETFSectorWeights(etf.fmp_symbol);
        if (sectorData && Array.isArray(sectorData)) {
          for (const sw of sectorData) {
            const weightStr = sw.weightPercentage || '0';
            const weight = parseFloat(weightStr.replace('%', ''));
            const { error } = await supabase.from('etf_sector_weights').upsert(
              {
                security_id: etf.id,
                sector: sw.sector,
                weight_percentage: isNaN(weight) ? 0 : weight,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'security_id,sector' }
            );
            if (error) console.error(`[sync-financials] sector weight upsert ${etf.fmp_symbol}:`, error.message);
          }
        }

        processed++;
      } catch (innerErr) {
        console.error(`[sync-financials] Error processing ETF ${etf.fmp_symbol}:`, innerErr.message);
      }
    }

    await logSyncComplete(supabase, logId, processed);
    return NextResponse.json({ status: 'ok', records: processed });
  } catch (err) {
    console.error('[sync-financials] Fatal error:', err.message);
    await logSyncFail(supabase, logId, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
