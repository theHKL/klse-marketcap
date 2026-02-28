/**
 * Environment variable validation.
 * Import this module early to fail fast on missing config.
 */
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}`
  );
}

if (missing.length > 0) {
  console.warn(
    `Warning: Missing environment variables: ${missing.join(', ')}`
  );
}

const optional = ['LOGO_DEV_TOKEN', 'NEXT_PUBLIC_SITE_URL'];
const missingOptional = optional.filter((key) => !process.env[key]);
if (missingOptional.length > 0) {
  console.warn(`Note: Optional environment variables not set: ${missingOptional.join(', ')}`);
}
