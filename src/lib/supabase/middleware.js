import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function updateSession(request) {
  // Skip auth roundtrip for anonymous visitors (no Supabase cookies)
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );
  if (!hasAuthCookie) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Only call getUser() when the auth token is close to expiry (< 5 min)
  const authCookie = request.cookies.getAll().find(
    (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  );
  if (authCookie) {
    try {
      const tokenValue = JSON.parse(authCookie.value);
      const accessToken = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue;
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const fiveMin = 5 * 60 * 1000;
      if (expiresAt - Date.now() > fiveMin) {
        return supabaseResponse; // Token still fresh, skip network call
      }
    } catch {
      // If parsing fails, fall through to getUser() as safety net
    }
  }

  await supabase.auth.getUser();

  return supabaseResponse;
}
