import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/server';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://klsemarketcap.com';

const allowedHosts = [
  SITE_URL,
  'klsemarketcap.com',
  'www.klsemarketcap.com',
  'localhost:3000',
].filter(Boolean).map(h => h.replace(/^https?:\/\//, ''));

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Validate redirect path to prevent open redirect attacks
  const rawNext = searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (code) {
    const supabase = await createAuthServerClient();

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';
        const isAllowed = forwardedHost && allowedHosts.some(
          h => forwardedHost === h || forwardedHost.endsWith('.' + h)
        );

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`);
        } else if (isAllowed) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          // Fallback to configured site URL (origin can be localhost behind proxy)
          return NextResponse.redirect(`${SITE_URL}${next}`);
        }
      }
    } catch (err) {
      console.error('Auth callback error:', err.message);
    }
  }

  const isLocalEnv = process.env.NODE_ENV === 'development';
  const errorBase = isLocalEnv ? origin : SITE_URL;
  return NextResponse.redirect(`${errorBase}/?auth_error=true`);
}
