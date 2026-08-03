import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIX = '/dashboard';

/**
 * Route protection.
 *
 * This is an *optimistic* check: it only looks for the presence of a session
 * cookie, which is all that's possible on the Edge runtime. It stops signed-out
 * users from loading the dashboard shell — it is not the authorization
 * boundary. Anything returning real data must verify the session itself via
 * `getCurrentSession()` in src/lib/session.ts.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signIn = new URL('/auth/sign-in', request.url);
    // Preserve the destination so sign-in can bounce them back.
    signIn.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
};
