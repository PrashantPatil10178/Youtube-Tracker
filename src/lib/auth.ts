import 'server-only';

import { authSchema, db } from '@/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
  emailAndPassword: {
    enabled: true,
    // Local-first setup: no mail transport is wired up, so requiring
    // verification would lock every new account out. Turn this on once
    // sendVerificationEmail is implemented.
    requireEmailVerification: false,
    minPasswordLength: 8
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 }
  },
  // Must be last in the plugin list — it flushes Set-Cookie headers on
  // server-action and route-handler responses.
  plugins: [nextCookies()]
});

export type Session = typeof auth.$Infer.Session;
