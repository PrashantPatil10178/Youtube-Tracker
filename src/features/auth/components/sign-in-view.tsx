import { Suspense } from 'react';

import { AuthForm } from './auth-form';
import { SarvamAuthShell } from './sarvam-auth-shell';

export default function SignInViewPage() {
  return (
    <SarvamAuthShell title='Welcome back' subtitle='Sign in to your ChannelIQ workspace.'>
      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={null}>
        <AuthForm mode='sign-in' />
      </Suspense>
    </SarvamAuthShell>
  );
}
