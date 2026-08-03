'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Browser-side auth client. baseURL is left unset so it derives from the
 * current origin — that keeps localhost, preview deploys and production
 * working without per-environment configuration.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
