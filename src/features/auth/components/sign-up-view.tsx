import { Suspense } from 'react';

import { AuthForm } from './auth-form';
import { SarvamAuthShell } from './sarvam-auth-shell';

export default function SignUpViewPage() {
  return (
    <SarvamAuthShell
      title='Create your account'
      subtitle='Start tracking your channels in under a minute.'
    >
      <Suspense fallback={null}>
        <AuthForm mode='sign-up' />
      </Suspense>
    </SarvamAuthShell>
  );
}
