import { NextResponse } from 'next/server';
import { getQuoteSummary } from '@/lib/yahoo/client';
import {
  transformIncomeStatement,
  transformBalanceSheet,
  transformCashFlow,
  transformKeyMetrics,
  transformEtfHoldings,
  transformEtfSectorWeights,
} from '@/lib/yahoo/transforms';
import {
  verifyCronSecret,
  createServiceClient,
  logSyncStart,
  logSyncComplete,
  logSyncFail,
  sleep,
} from '@/lib/cron-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
      .select('id, yahoo_symbol, type')
      .eq('is_actively_trading', true)
      .not('yahoo_symbol', 'is', null);

    if (fetchErr) throw new Error(`Failed to fetch securities: ${fetchErr.message}`);

    const stocks = (securities || []).filter((s) => s.type === 'stock');
    const etfs = (securities || []).filter((s) => s.type === 'etf' || s.type === 'fund');

    let processed = 0;

    // Process stocks — single quoteSummary call fetches all financial data
    for (const stock of stocks) {
      try {
        await sleep(250);

        const summary = await getQuoteSummary(stock.yahoo_symbol, [
          'incomeStatementHistory',
          'balanceSheetHistory',
          'cashflowStatementHistory',
          'defaultKeyStatistics',
          'financialData',
        ]);

        if (!summary) {
          console.warn(`[sync-financials] No summary for ${stock.yahoo_symbol}`);
          continue;
        }

        // Income statements
        const incomeStmts = summary.incomeStatementHistory?.incomeStatementHistory || [];
        for (const stmt of incomeStmts) {
          const row = transformIncomeStatement(stmt, stock.id);
          if (!row || !row.date) continue;
          const { error } = await supabase.from('income_statements').upsert(row, {
            onConflict: 'security_id,date,period',
          });
          if (error) console.error(`[sync-financials] income upsert ${stock.yahoo_symbol}:`, error.message);
        }

        // Balance sheets
        const balanceStmts = summary.balanceSheetHistory?.balanceSheetStatements || [];
        for (const stmt of balanceStmts) {
          const row = transformBalanceSheet(stmt, stock.id);
          if (!row || !row.date) continue;
          const { error } = await supabase.from('balance_sheets').upsert(row, {
            onConflict: 'security_id,date,period',
          });
          if (error) console.error(`[sync-financials] balance upsert ${stock.yahoo_symbol}:`, error.message);
        }

        // Cash flow statements
        const cashFlowStmts = summary.cashflowStatementHistory?.cashflowStatements || [];
        for (const stmt of cashFlowStmts) {
          const row = transformCashFlow(stmt, stock.id);
          if (!row || !row.date) continue;
          const { error } = await supabase.from('cash_flow_statements').upsert(row, {
            onConflict: 'security_id,date,period',
          });
          if (error) console.error(`[sync-financials] cashflow upsert ${stock.yahoo_symbol}:`, error.message);
        }

        // Key metrics
        const latestIncomeDate = incomeStmts[0]?.endDate instanceof Date
          ? incomeStmts[0].endDate.toISOString().split('T')[0]
          : incomeStmts[0]?.endDate;

        if (summary.defaultKeyStatistics || summary.financialData) {
          const metrics = transformKeyMetrics(summary, stock.id, latestIncomeDate);
          if (metrics.date) {
            const { error } = await supabase.from('key_metrics').upsert(metrics, {
              onConflict: 'security_id,date',
            });
            if (error) console.error(`[sync-financials] metrics upsert ${stock.yahoo_symbol}:`, error.message);
          }
        }

        processed++;
      } catch (innerErr) {
        console.error(`[sync-financials] Error processing stock ${stock.yahoo_symbol}:`, innerErr.message);
      }
    }

    // Process ETFs/funds
    for (const etf of etfs) {
      try {
        await sleep(250);

        const summary = await getQuoteSummary(etf.yahoo_symbol, [
          'topHoldings',
          'fundProfile',
          'defaultKeyStatistics',
        ]);

        if (!summary) {
          console.warn(`[sync-financials] No summary for ETF ${etf.yahoo_symbol}`);
          continue;
        }

        // ETF holdings
        const holdings = transformEtfHoldings(summary, etf.id);
        for (const holding of holdings) {
          if (!holding.holding_symbol && !holding.holding_name) continue;
          const { error } = await supabase.from('etf_holdings').upsert(
            {
              etf_security_id: etf.id,
              holding_symbol: holding.holding_symbol,
              holding_name: holding.holding_name,
              weight_percentage: holding.weight_pct,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'etf_security_id,holding_symbol' }
          );
          if (error) console.error(`[sync-financials] holding upsert ${etf.yahoo_symbol}:`, error.message);
        }

        // ETF sector weights
        const sectorWeights = transformEtfSectorWeights(summary, etf.id);
        for (const sw of sectorWeights) {
          if (!sw.sector) continue;
          const { error } = await supabase.from('etf_sector_weights').upsert(
            {
              security_id: etf.id,
              sector: sw.sector,
              weight_percentage: sw.weight_pct,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'security_id,sector' }
          );
          if (error) console.error(`[sync-financials] sector weight upsert ${etf.yahoo_symbol}:`, error.message);
        }

        processed++;
      } catch (innerErr) {
        console.error(`[sync-financials] Error processing ETF ${etf.yahoo_symbol}:`, innerErr.message);
      }
    }

    await logSyncComplete(supabase, logId, processed);
    return NextResponse.json({ status: 'ok', records: processed });
  } catch (err) {
    console.error('[sync-financials] Fatal error:', err.message);
    await logSyncFail(supabase, logId, err.message);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
