export const dynamic = 'force-dynamic';

import { createServiceClient } from '@/lib/supabase/server';
import { validateCronSecret } from '@/lib/sync-utils';

/**
 * Merge an old ticker symbol into a new one after a ticker change.
 *
 * This reassigns all historical data (daily_prices, financials, peers, etc.)
 * from the old security to the new one, creates a symbol alias for URL redirects,
 * and deletes the old security row.
 *
 * Usage (POST):
 *   Authorization: Bearer CRON_SECRET
 *   Body: { "old_symbol": "OLD", "new_symbol": "NEW", "changed_date": "2024-11-01" }
 *
 * Or in development:
 *   POST /api/admin/merge-symbol?secret=your-secret
 */
export async function POST(request) {
  if (!validateCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { old_symbol, new_symbol, changed_date } = body;

  if (!old_symbol || !new_symbol) {
    return Response.json(
      { error: 'Both old_symbol and new_symbol are required' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    // Find both securities
    const oldYahoo = old_symbol.toUpperCase().endsWith('.KL')
      ? old_symbol.toUpperCase()
      : `${old_symbol.toUpperCase()}.KL`;
    const newYahoo = new_symbol.toUpperCase().endsWith('.KL')
      ? new_symbol.toUpperCase()
      : `${new_symbol.toUpperCase()}.KL`;

    const [{ data: oldSec }, { data: newSec }] = await Promise.all([
      supabase
        .from('securities')
        .select('id, symbol, yahoo_symbol')
        .eq('yahoo_symbol', oldYahoo)
        .single(),
      supabase
        .from('securities')
        .select('id, symbol, yahoo_symbol')
        .eq('yahoo_symbol', newYahoo)
        .single(),
    ]);

    if (!oldSec) {
      return Response.json(
        { error: `Old symbol "${oldYahoo}" not found in securities table` },
        { status: 404 }
      );
    }

    if (!newSec) {
      return Response.json(
        { error: `New symbol "${newYahoo}" not found in securities table. Run a profile sync first so the new ticker exists.` },
        { status: 404 }
      );
    }

    const oldId = oldSec.id;
    const newId = newSec.id;
    const stats = {};

    // Tables with security_id foreign key to reassign
    const tables = [
      { name: 'daily_prices', fk: 'security_id', conflict: 'security_id,date' },
      { name: 'income_statements', fk: 'security_id', conflict: 'security_id,date,period' },
      { name: 'balance_sheets', fk: 'security_id', conflict: 'security_id,date,period' },
      { name: 'cash_flow_statements', fk: 'security_id', conflict: 'security_id,date,period' },
      { name: 'key_metrics', fk: 'security_id', conflict: 'security_id,date' },
      { name: 'stock_peers', fk: 'security_id', conflict: 'security_id,peer_yahoo_symbol' },
    ];

    for (const table of tables) {
      // Get old security's rows
      const { data: oldRows } = await supabase
        .from(table.name)
        .select('*')
        .eq(table.fk, oldId);

      if (!oldRows || oldRows.length === 0) {
        stats[table.name] = { moved: 0, skipped: 0 };
        continue;
      }

      // Try to update each row, skip on conflict
      let moved = 0;
      let skipped = 0;

      for (const row of oldRows) {
        const { error } = await supabase
          .from(table.name)
          .update({ [table.fk]: newId })
          .eq('id', row.id);

        if (error) {
          // Conflict — new security already has data for this date/period, delete the old row
          await supabase.from(table.name).delete().eq('id', row.id);
          skipped++;
        } else {
          moved++;
        }
      }

      stats[table.name] = { moved, skipped };
    }

    // Handle etf_details if applicable (uses security_id as unique)
    const { data: oldEtfDetail } = await supabase
      .from('etf_details')
      .select('id')
      .eq('security_id', oldId)
      .single();

    if (oldEtfDetail) {
      const { data: newEtfDetail } = await supabase
        .from('etf_details')
        .select('id')
        .eq('security_id', newId)
        .single();

      if (!newEtfDetail) {
        await supabase
          .from('etf_details')
          .update({ security_id: newId })
          .eq('id', oldEtfDetail.id);
        stats.etf_details = { moved: 1 };
      } else {
        await supabase.from('etf_details').delete().eq('id', oldEtfDetail.id);
        stats.etf_details = { skipped: 1 };
      }
    }

    // Create the symbol alias for URL redirects
    const { error: aliasError } = await supabase
      .from('symbol_aliases')
      .upsert(
        {
          old_symbol: oldSec.symbol.toUpperCase(),
          new_symbol: newSec.symbol.toUpperCase(),
          security_id: newId,
          changed_date: changed_date || null,
        },
        { onConflict: 'old_symbol' }
      );

    if (aliasError) {
      console.error('Alias creation error:', aliasError.message);
    }

    // Delete the old security row (cascades any remaining references)
    const { error: deleteError } = await supabase
      .from('securities')
      .delete()
      .eq('id', oldId);

    if (deleteError) {
      return Response.json(
        { error: 'Data merged but failed to delete old security', stats },
        { status: 500 }
      );
    }

    return Response.json({
      status: 'completed',
      message: `Merged ${oldSec.symbol} (${oldYahoo}) into ${newSec.symbol} (${newYahoo})`,
      old_security_id: oldId,
      new_security_id: newId,
      alias_created: !aliasError,
      stats,
    });
  } catch (error) {
    console.error('Merge failed:', error);
    return Response.json(
      { error: 'Merge failed' },
      { status: 500 }
    );
  }
}
