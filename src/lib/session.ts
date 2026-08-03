import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from './auth';

/**
 * The real authorization check — verifies the session against the database.
 *
 * The middleware only looks for a cookie's presence, so every server component
 * or route handler that returns user data must call this rather than trusting
 * the redirect it performed.
 */
export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Same, but redirects to sign-in instead of returning null. */
export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) redirect('/auth/sign-in');
  return session;
}
