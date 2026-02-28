import { createServiceClient } from '@/lib/supabase/server';
import { fetchSparklineData } from '@/lib/sparkline-data';
import { fetchAllRows, chunk } from '@/lib/sync-utils';
import { SECURITIES_SELECT, FUND_SECURITIES_SELECT } from '@/lib/constants';
import { unstable_cache } from 'next/cache';

// =====================================================
// Cached helpers — avoid redundant Supabase roundtrips
// =====================================================

/** Cache event metadata for 5 minutes */
const getCachedEventMeta = unstable_cache(
  async (eventId) => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('market_events')
      .select('name, event_date')
      .eq('id', eventId)
      .single();
    return data;
  },
  ['event-meta'],
  { revalidate: 300 }
);

/** Cache last sync time for 1 minute */
const getCachedLastSync = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('sync_log')
      .select('completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1);
    return data?.[0]?.completed_at || null;
  },
  ['last-sync'],
  { revalidate: 60 }
);

/** Cache closest trading day for 24 hours — historical dates never change */
const getCachedClosestTradingDay = unstable_cache(
  async (targetDate) => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('daily_prices')
      .select('date')
      .lte('date', targetDate)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    return data?.date || null;
  },
  ['closest-trading-day'],
  { revalidate: 86400 }
);

/** Cache all historical close prices for a given trading day (24h) */
const getCachedHistoricalPrices = unstable_cache(
  async (tradingDate) => {
    const supabase = createServiceClient();
    const allPrices = await fetchAllRows(() =>
      supabase
        .from('daily_prices')
        .select('security_id, close')
        .eq('date', tradingDate)
    );
    const priceMap = {};
    for (const p of allPrices) {
      if (p.close != null && p.close !== 0) {
        priceMap[p.security_id] = Number(p.close);
      }
    }
    return priceMap;
  },
  ['historical-prices'],
  { revalidate: 86400 }
);

// =====================================================
// Main GET handler
// =====================================================

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const sector = searchParams.get('sector');
  const sort = searchParams.get('sort') || 'market_cap';
  const order = searchParams.get('order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const eventId = searchParams.get('event_id');
  const customDate = searchParams.get('custom_date');
  const watchlistParam = searchParams.get('watchlist');
  const watchlist = !!watchlistParam;

  const allowedSorts = ['market_cap', 'price', 'change_1d_pct', 'change_7d_pct', 'change_1y_pct', 'change_5y_pct', 'name', 'sector', 'change_since_event', 'volume', 'beta', 'pe_ratio', 'eps', 'dividend_yield', 'year_high', 'year_low', 'price_avg_50', 'price_avg_200', 'aum', 'expense_ratio'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'market_cap';
  const safeOrder = order === 'asc' ? 'asc' : 'desc';

  // Validate custom_date is not in the future
  if (customDate) {
    const target = new Date(customDate);
    if (isNaN(target.getTime()) || target > new Date()) {
      return Response.json({ error: 'Invalid or future date' }, { status: 400 });
    }
  }

  // --- Watchlist filter: get user's watchlist security IDs ---
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let watchlistSecurityIds = null;
  if (watchlist) {
    const { createAuthServerClient } = await import('@/lib/supabase/server');
    const authSupabase = await createAuthServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Support ?watchlist=<uuid> for specific list, or ?watchlist=true for default
    let watchlistId = null;
    if (watchlistParam && UUID_RE.test(watchlistParam)) {
      watchlistId = watchlistParam;
    }

    let itemsQuery = authSupabase
      .from('watchlist_items')
      .select('security_id')
      .eq('user_id', user.id);

    if (watchlistId) {
      itemsQuery = itemsQuery.eq('watchlist_id', watchlistId);
    }

    const { data: watchlistItems } = await itemsQuery;

    watchlistSecurityIds = (watchlistItems || []).map((w) => w.security_id);

    if (watchlistSecurityIds.length === 0) {
      return Response.json({
        data: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      });
    }
  }

  const supabase = createServiceClient();

  // Start sync log fetch early — it's independent of everything else
  const lastSyncPromise = getCachedLastSync();

  // --- Event column metadata to include in response ---
  let eventColumn = null;

  // --- Pre-computed event returns (event_id) ---
  if (eventId) {
    // Fetch event metadata from cache
    const eventMeta = await getCachedEventMeta(eventId);

    if (eventMeta) {
      eventColumn = { label: eventMeta.name, date: eventMeta.event_date, type: 'event' };
    }

    if (safeSort === 'change_since_event') {
      return await handleEventSorted(supabase, {
        eventId, type, sector, safeOrder, page, limit, eventColumn, lastSyncPromise,
      });
    }

    // Normal sort — fetch securities, then enrich sparklines + event returns in parallel
    const result = await fetchSecurities(supabase, { type, sector, safeSort, safeOrder, page, limit, securityIds: watchlistSecurityIds });
    if (result.error) return result.error;

    const ids = result.data.map((s) => s.id);
    const [sparklines, eventReturnsMap, lastSync] = await Promise.all([
      fetchSparklineData(supabase, ids),
      fetchEventReturnsMap(supabase, ids, eventId),
      lastSyncPromise,
    ]);

    // If no pre-computed event returns, fall back to on-the-fly from daily_prices
    let finalReturnsMap = eventReturnsMap;
    if (Object.keys(eventReturnsMap).length === 0 && eventMeta) {
      const tradingDate = await getCachedClosestTradingDay(eventMeta.event_date);
      if (tradingDate) {
        const prices = await fetchHistoricalPricesForIds(supabase, ids, tradingDate);
        finalReturnsMap = {};
        for (const s of result.data) {
          const eventClose = prices[s.id];
          if (eventClose != null && s.price != null) {
            finalReturnsMap[s.id] = parseFloat((((s.price - eventClose) / eventClose) * 100).toFixed(4));
          }
        }
      }
    }

    const enrichedData = result.data.map((s) => ({
      ...s,
      sparkline_7d: sparklines[s.id] || null,
      change_since_event: finalReturnsMap[s.id] ?? null,
    }));

    return buildResponse(enrichedData, result.count, page, limit, lastSync, eventColumn, { isPrivate: watchlist });
  }

  // --- Custom date on-the-fly calculation ---
  if (customDate) {
    eventColumn = { label: `Since ${customDate}`, date: customDate, type: 'custom' };

    if (safeSort === 'change_since_event') {
      return await handleCustomDateSorted(supabase, {
        customDate, type, sector, safeOrder, page, limit, eventColumn, lastSyncPromise,
      });
    }

    // Fetch closest trading day (cached 24h) and securities in parallel
    const [tradingDate, result] = await Promise.all([
      getCachedClosestTradingDay(customDate),
      fetchSecurities(supabase, { type, sector, safeSort, safeOrder, page, limit, securityIds: watchlistSecurityIds }),
    ]);

    if (result.error) return result.error;

    if (!tradingDate) {
      const enrichedData = result.data.map((s) => ({ ...s, change_since_event: null }));
      const withSparklines = await enrichWithSparklinesOnly(supabase, enrichedData);
      const lastSync = await lastSyncPromise;
      return buildResponse(withSparklines, result.count, page, limit, lastSync, eventColumn, { isPrivate: watchlist });
    }

    // Fetch sparklines and historical prices for just this page's securities in parallel
    const ids = result.data.map((s) => s.id);
    const [sparklines, prices, lastSync] = await Promise.all([
      fetchSparklineData(supabase, ids),
      fetchHistoricalPricesForIds(supabase, ids, tradingDate),
      lastSyncPromise,
    ]);

    const enrichedData = result.data.map((s) => {
      const eventClose = prices[s.id];
      return {
        ...s,
        sparkline_7d: sparklines[s.id] || null,
        change_since_event:
          eventClose != null && s.price != null
            ? parseFloat((((s.price - eventClose) / eventClose) * 100).toFixed(4))
            : null,
      };
    });

    return buildResponse(enrichedData, result.count, page, limit, lastSync, eventColumn, { isPrivate: watchlist });
  }

  // --- Default path (no event) ---
  const result = await fetchSecurities(supabase, { type, sector, safeSort, safeOrder, page, limit, securityIds: watchlistSecurityIds });
  if (result.error) return result.error;

  const ids = result.data.map((s) => s.id);
  const [sparklines, lastSync] = await Promise.all([
    fetchSparklineData(supabase, ids),
    lastSyncPromise,
  ]);

  const enrichedData = result.data.map((s) => ({
    ...s,
    sparkline_7d: sparklines[s.id] || null,
  }));

  return buildResponse(enrichedData, result.count, page, limit, lastSync, null, { isPrivate: watchlist });
}

// =====================================================
// Helper: Standard securities query
// =====================================================
async function fetchSecurities(supabase, { type, sector, safeSort, safeOrder, page, limit, securityIds }) {
  const needsEtfJoin = type === 'fund' || type === 'etf';
  const selectStr = needsEtfJoin ? FUND_SECURITIES_SELECT : SECURITIES_SELECT;
  const sortField = (needsEtfJoin && (safeSort === 'aum' || safeSort === 'expense_ratio'))
    ? `etf_details(${safeSort})`
    : safeSort;

  let query = supabase
    .from('securities')
    .select(selectStr, { count: 'exact' })
    .eq('is_actively_trading', true);

  if (securityIds) {
    query = query.in('id', securityIds);
  }

  if (type === 'reit') {
    query = query.eq('type', 'stock').eq('sector', 'Real Estate').ilike('industry', '%REIT%');
  } else if (type !== 'all') {
    query = query.eq('type', type);
  } else {
    query = query.not('type', 'in', '("hybrid","fund")');
  }

  if (type !== 'reit' && sector) {
    const sectorList = sector.split(',').map((s) => s.trim()).filter(Boolean);
    if (sectorList.length === 1) {
      query = query.eq('sector', sectorList[0]);
    } else if (sectorList.length > 1) {
      query = query.in('sector', sectorList);
    }
  }

  query = query
    .order(sortField, { ascending: safeOrder === 'asc', nullsFirst: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Failed to fetch securities:', error);
    return { error: Response.json({ error: 'Failed to fetch securities' }, { status: 500 }) };
  }

  // Flatten etf_details join for fund/etf types
  const rows = needsEtfJoin
    ? (data || []).map(({ etf_details, ...rest }) => ({
        ...rest,
        aum: etf_details?.aum ?? null,
        expense_ratio: etf_details?.expense_ratio ?? null,
      }))
    : data || [];

  return { data: rows, count };
}

// =====================================================
// Helper: Fetch event returns as a plain object map
// =====================================================
async function fetchEventReturnsMap(supabase, securityIds, eventId) {
  if (securityIds.length === 0) return {};

  const { data: returns } = await supabase
    .from('event_returns')
    .select('security_id, change_pct')
    .eq('event_id', eventId)
    .in('security_id', securityIds);

  const map = {};
  if (returns) {
    for (const r of returns) {
      map[r.security_id] = r.change_pct;
    }
  }
  return map;
}

// =====================================================
// Helper: Fetch historical prices for specific security IDs
// =====================================================
async function fetchHistoricalPricesForIds(supabase, securityIds, tradingDate) {
  if (securityIds.length === 0) return {};

  const { data: prices } = await supabase
    .from('daily_prices')
    .select('security_id, close')
    .eq('date', tradingDate)
    .in('security_id', securityIds);

  const map = {};
  if (prices) {
    for (const p of prices) {
      if (p.close != null && p.close !== 0) {
        map[p.security_id] = Number(p.close);
      }
    }
  }
  return map;
}

// =====================================================
// Helper: Enrich with sparklines only (no event data)
// =====================================================
async function enrichWithSparklinesOnly(supabase, securities) {
  if (securities.length === 0) return securities;
  const ids = securities.map((s) => s.id);
  const sparklines = await fetchSparklineData(supabase, ids);
  return securities.map((s) => ({
    ...s,
    sparkline_7d: sparklines[s.id] || null,
  }));
}

// =====================================================
// Helper: Sort by event returns (pre-computed)
// =====================================================
async function handleEventSorted(supabase, { eventId, type, sector, safeOrder, page, limit, eventColumn, lastSyncPromise }) {
  // Query event_returns sorted by change_pct, then fetch matching securities
  let erQuery = supabase
    .from('event_returns')
    .select('security_id, change_pct')
    .eq('event_id', eventId)
    .order('change_pct', { ascending: safeOrder === 'asc', nullsFirst: false });

  // We need to filter by type/sector, so fetch a broader set and filter after join
  const allReturns = await fetchAllRows(() => erQuery);

  // If no pre-computed returns, fall back to custom-date sorted path
  if (allReturns.length === 0) {
    const eventMeta = await getCachedEventMeta(eventId);
    if (eventMeta) {
      return await handleCustomDateSorted(supabase, {
        customDate: eventMeta.event_date, type, sector, safeOrder, page, limit, eventColumn, lastSyncPromise,
      });
    }
    const lastSync = await lastSyncPromise;
    return buildResponse([], 0, page, limit, lastSync, eventColumn);
  }

  // Fetch all matching security IDs to filter by type/sector
  const secIds = allReturns.map((r) => r.security_id);
  const secIdChunks = chunk(secIds, 500);
  const chunkPromises = secIdChunks.map((idBatch) => {
    let secQuery = supabase
      .from('securities')
      .select(SECURITIES_SELECT)
      .eq('is_actively_trading', true)
      .in('id', idBatch);

    if (type === 'reit') {
      secQuery = secQuery.eq('type', 'stock').eq('sector', 'Real Estate').ilike('industry', '%REIT%');
    } else if (type !== 'all') {
      secQuery = secQuery.eq('type', type);
    } else {
      secQuery = secQuery.not('type', 'in', '("hybrid","fund")');
    }

    if (type !== 'reit' && sector) {
      const sectorList = sector.split(',').map((s) => s.trim()).filter(Boolean);
      if (sectorList.length === 1) secQuery = secQuery.eq('sector', sectorList[0]);
      else if (sectorList.length > 1) secQuery = secQuery.in('sector', sectorList);
    }

    return secQuery;
  });

  // Fetch all chunks in parallel
  const chunkResults = await Promise.all(chunkPromises);
  const allSecurities = chunkResults.flatMap((r) => r.data || []);

  // Build lookup map
  const secMap = new Map();
  for (const sec of allSecurities) {
    secMap.set(sec.id, sec);
  }

  // Merge and maintain event_returns sort order
  const merged = allReturns
    .filter((r) => secMap.has(r.security_id))
    .map((r) => ({
      ...secMap.get(r.security_id),
      change_since_event: r.change_pct,
    }));

  const total = merged.length;
  const paged = merged.slice((page - 1) * limit, page * limit);

  // Sparklines + sync log in parallel
  const ids = paged.map((s) => s.id);
  const [sparklines, lastSync] = await Promise.all([
    fetchSparklineData(supabase, ids),
    lastSyncPromise,
  ]);

  const enrichedData = paged.map((s) => ({
    ...s,
    sparkline_7d: sparklines[s.id] || null,
  }));

  return buildResponse(enrichedData, total, page, limit, lastSync, eventColumn);
}

// =====================================================
// Helper: Sort by custom-date returns (computed)
// =====================================================
async function handleCustomDateSorted(supabase, { customDate, type, sector, safeOrder, page, limit, eventColumn, lastSyncPromise }) {
  // Find closest trading day (cached 24h)
  const tradingDate = await getCachedClosestTradingDay(customDate);

  if (!tradingDate) {
    const lastSync = await lastSyncPromise;
    return buildResponse([], 0, page, limit, lastSync, eventColumn);
  }

  // Fetch all securities and all historical prices in parallel (prices cached 24h)
  let secQuery = supabase
    .from('securities')
    .select('id, symbol, name, type, sector, industry, market_cap, price, change_1d_pct, change_7d_pct, volume, logo_url')
    .eq('is_actively_trading', true)
    .not('price', 'is', null);

  if (type === 'reit') {
    secQuery = secQuery.eq('type', 'stock').eq('sector', 'Real Estate').ilike('industry', '%REIT%');
  } else if (type !== 'all') {
    secQuery = secQuery.eq('type', type);
  } else {
    secQuery = secQuery.not('type', 'in', '("hybrid","fund")');
  }

  if (type !== 'reit' && sector) {
    const sectorList = sector.split(',').map((s) => s.trim()).filter(Boolean);
    if (sectorList.length === 1) secQuery = secQuery.eq('sector', sectorList[0]);
    else if (sectorList.length > 1) secQuery = secQuery.in('sector', sectorList);
  }

  const [allSecurities, priceMap] = await Promise.all([
    fetchAllRows(() => secQuery),
    getCachedHistoricalPrices(tradingDate),
  ]);

  // Compute returns and sort
  const withReturns = allSecurities
    .map((s) => {
      const eventClose = priceMap[s.id];
      const changePct = eventClose != null && s.price != null
        ? parseFloat((((s.price - eventClose) / eventClose) * 100).toFixed(4))
        : null;
      return { ...s, change_since_event: changePct };
    })
    .filter((s) => s.change_since_event != null);

  withReturns.sort((a, b) =>
    safeOrder === 'asc'
      ? a.change_since_event - b.change_since_event
      : b.change_since_event - a.change_since_event
  );

  const total = withReturns.length;
  const paged = withReturns.slice((page - 1) * limit, page * limit);

  // Sparklines + sync log in parallel
  const ids = paged.map((s) => s.id);
  const [sparklines, lastSync] = await Promise.all([
    fetchSparklineData(supabase, ids),
    lastSyncPromise,
  ]);

  const enrichedData = paged.map((s) => ({
    ...s,
    sparkline_7d: sparklines[s.id] || null,
  }));

  return buildResponse(enrichedData, total, page, limit, lastSync, eventColumn);
}

// =====================================================
// Helper: Build standard JSON response
// =====================================================
function buildResponse(data, total, page, limit, lastSync, eventColumn, { isPrivate } = {}) {
  const response = {
    data,
    pagination: {
      page,
      limit,
      total: total || 0,
      totalPages: Math.ceil((total || 0) / limit),
    },
    lastSync,
  };

  if (eventColumn) {
    response.eventColumn = eventColumn;
  }

  return Response.json(response, {
    headers: {
      'Cache-Control': isPrivate
        ? 'private, no-store'
        : 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
