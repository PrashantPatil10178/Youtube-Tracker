'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Mode = 'sign-in' | 'sign-up';

const fieldClass =
  'h-14 rounded-full border-tx/10 bg-white px-6 text-[15px] placeholder:text-tx-tertiary/60 focus-visible:border-sr-indigo-600 focus-visible:ring-sr-indigo-600/20';

/** Email + password form backed by Better Auth. */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard/overview';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignUp = mode === 'sign-up';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = isSignUp
      ? await authClient.signUp.email({ name: name.trim() || email, email, password })
      : await authClient.signIn.email({ email, password });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? 'Something went wrong. Try again.');
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
      {isSignUp && (
        <div className='grid gap-2'>
          <Label htmlFor='name' className='sr-only'>
            Name
          </Label>
          <Input
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete='name'
            placeholder='Your name'
            className={fieldClass}
          />
        </div>
      )}

      <div className='grid gap-2'>
        <Label htmlFor='email' className='sr-only'>
          Email
        </Label>
        <Input
          id='email'
          type='email'
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete='email'
          placeholder='e.g., name@company.com'
          className={fieldClass}
        />
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='password' className='sr-only'>
          Password
        </Label>
        <Input
          id='password'
          type='password'
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder={isSignUp ? 'At least 8 characters' : 'Password'}
          className={fieldClass}
        />
      </div>

      {error && (
        <p role='alert' className='text-destructive px-1 text-sm'>
          {error}
        </p>
      )}

      <Button
        type='submit'
        disabled={pending}
        className='bg-tx hover:bg-tx/85 mt-1 h-14 w-full rounded-full text-[15px] font-medium text-white'
      >
        {pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
      </Button>

      <p className='font-matter text-tx-tertiary mt-1 text-center text-sm'>
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <Link
          href={isSignUp ? '/auth/sign-in' : '/auth/sign-up'}
          className='text-sr-indigo-600 underline-offset-4 hover:underline'
        >
          {isSignUp ? 'Sign in' : 'Create one'}
        </Link>
      </p>
    </form>
  );
}
