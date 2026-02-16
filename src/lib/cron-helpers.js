import { createClient } from '@supabase/supabase-js';

/**
 * Verify the CRON_SECRET from the Authorization header.
 * Returns true if valid, false otherwise.
 */
export function verifyCronSecret(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === process.env.CRON_SECRET;
}

/**
 * Create a Supabase client using the service role key (bypasses RLS).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Log the start of a sync job.
 * Returns the log row id so it can be updated on completion.
 */
export async function logSyncStart(supabase, jobName) {
  const { data, error } = await supabase
    .from('sync_log')
    .insert({
      job_name: jobName,
      started_at: new Date().toISOString(),
      status: 'running',
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[sync_log] Failed to log start for ${jobName}:`, error.message);
    return null;
  }
  return data.id;
}

/**
 * Log the completion of a sync job.
 */
export async function logSyncComplete(supabase, logId, recordsProcessed) {
  if (!logId) return;
  const { error } = await supabase
    .from('sync_log')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      records_processed: recordsProcessed,
    })
    .eq('id', logId);

  if (error) {
    console.error(`[sync_log] Failed to log completion:`, error.message);
  }
}

/**
 * Log a failed sync job.
 */
export async function logSyncFail(supabase, logId, errorMessage) {
  if (!logId) return;
  const { error } = await supabase
    .from('sync_log')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', logId);

  if (error) {
    console.error(`[sync_log] Failed to log failure:`, error.message);
  }
}

/**
 * Helper: get current date/time in MYT (UTC+8).
 */
export function getMYTDate() {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })
  );
}

/**
 * Format a Date as YYYY-MM-DD string.
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check if current time is within KLSE market hours.
 * Morning session: 9:00 - 12:30 MYT
 * Afternoon session: 14:30 - 17:00 MYT
 * Only Mon-Fri.
 */
export function isMarketHours() {
  const now = getMYTDate();
  const day = now.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const morningOpen = 9 * 60;       // 09:00
  const morningClose = 12 * 60 + 30; // 12:30
  const afternoonOpen = 14 * 60 + 30; // 14:30
  const afternoonClose = 17 * 60;     // 17:00

  return (
    (timeInMinutes >= morningOpen && timeInMinutes <= morningClose) ||
    (timeInMinutes >= afternoonOpen && timeInMinutes <= afternoonClose)
  );
}

/**
 * Sleep helper for rate limiting.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
