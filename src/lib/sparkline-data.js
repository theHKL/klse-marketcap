/**
 * Fetch 7-day sparkline close prices for a batch of security IDs.
 * Returns { [security_id]: [close1, close2, ...close7] } sorted oldest→newest.
 */
export async function fetchSparklineData(supabase, securityIds) {
  if (!securityIds || securityIds.length === 0) return {};

  const { data, error } = await supabase
    .from('daily_prices')
    .select('security_id, date, close')
    .in('security_id', securityIds)
    .gte('date', new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10))
    .order('date', { ascending: true })
    .limit(securityIds.length * 12);

  if (error || !data) return {};

  const map = {};
  for (const row of data) {
    if (!map[row.security_id]) map[row.security_id] = [];
    if (row.close != null) map[row.security_id].push(Number(row.close));
  }

  return map;
}

/**
 * Enrich an array of securities with sparkline_7d data.
 * Each security must have an `id` field.
 */
export async function enrichWithSparklines(supabase, securities) {
  if (!securities || securities.length === 0) return securities;

  const ids = securities.map((s) => s.id).filter(Boolean);
  const sparklines = await fetchSparklineData(supabase, ids);

  return securities.map((s) => ({
    ...s,
    sparkline_7d: sparklines[s.id] || null,
  }));
}
