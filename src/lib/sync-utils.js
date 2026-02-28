import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { KLSE_MARKET_HOURS } from '@/lib/constants';

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Create a sync_log entry with status 'running'.
 * @returns {{ supabase, logId }} — supabase client and the log row id
 */
export async function createSyncLog(supabase, jobName) {
  const { data, error } = await supabase
    .from('sync_log')
    .insert({
      job_name: jobName,
      started_at: new Date().toISOString(),
      status: 'running',
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create sync_log: ${error.message}`);
  return data.id;
}

/**
 * Mark a sync_log entry as completed.
 */
export async function completeSyncLog(supabase, logId, recordCount) {
  const { error } = await supabase
    .from('sync_log')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      records_processed: recordCount,
    })
    .eq('id', logId);

  if (error) console.error(`Failed to update sync_log: ${error.message}`);
}

/**
 * Mark a sync_log entry as failed.
 */
export async function failSyncLog(supabase, logId, errorMessage) {
  const { error } = await supabase
    .from('sync_log')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', logId);

  if (error) console.error(`Failed to update sync_log: ${error.message}`);
}

/**
 * Validate the CRON_SECRET from the Authorization header.
 * In development, also accepts ?secret= query param for manual testing.
 * @returns {boolean}
 */
export function validateCronSecret(request) {
  if (!process.env.CRON_SECRET) return false;
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (bearer && safeCompare(bearer, process.env.CRON_SECRET)) {
    return true;
  }

  // Allow query param in development
  if (process.env.NODE_ENV === 'development') {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    return secret ? safeCompare(secret, process.env.CRON_SECRET) : false;
  }

  return false;
}

/**
 * Get the current time in MYT (Malaysia Time, UTC+8).
 * Uses Intl.DateTimeFormat with formatToParts for reliable timezone conversion.
 * @returns {Date} — a Date object representing the current time in Asia/Kuala_Lumpur
 */
export function getMytNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map(({ type, value }) => [type, value])
  );
  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
  );
}

/**
 * Get the current date in MYT as a YYYY-MM-DD string.
 * @returns {string}
 */
export function getMytDateString() {
  const formatter = new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Check if the current time is within KLSE market hours.
 * Morning session: 9:00-12:30 MYT, Afternoon session: 14:30-17:00 MYT, Mon-Fri.
 * @returns {boolean}
 */
export function isMarketHours() {
  const myt = getMytNow();
  const day = myt.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hour = myt.getHours();
  const minute = myt.getMinutes();
  const currentMinutes = hour * 60 + minute;

  const { morning, afternoon } = KLSE_MARKET_HOURS;
  const morningOpen = morning.open.hour * 60 + morning.open.minute;
  const morningClose = morning.close.hour * 60 + morning.close.minute;
  const afternoonOpen = afternoon.open.hour * 60 + afternoon.open.minute;
  const afternoonClose = afternoon.close.hour * 60 + afternoon.close.minute;

  return (
    (currentMinutes >= morningOpen && currentMinutes < morningClose) ||
    (currentMinutes >= afternoonOpen && currentMinutes < afternoonClose)
  );
}

/**
 * Chunk an array into groups of a given size.
 */
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Fetch all rows from a Supabase table, paginating past the 1000-row default limit.
 * @param {Function} buildQuery — fn that returns a fresh Supabase query builder each call
 * @param {number} pageSize — rows per page (max 1000)
 * @returns {Promise<any[]>} — all matching rows
 */
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  const allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(`fetchAllRows: ${error.message}`);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}
