'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Mode = 'sign-in' | 'sign-up';

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
    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
      {isSignUp && (
        <div className='grid gap-2'>
          <Label htmlFor='name'>Name</Label>
          <Input
            id='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete='name'
            placeholder='Your name'
          />
        </div>
      )}

      <div className='grid gap-2'>
        <Label htmlFor='email'>Email</Label>
        <Input
          id='email'
          type='email'
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete='email'
          placeholder='you@example.com'
        />
      </div>

      <div className='grid gap-2'>
        <Label htmlFor='password'>Password</Label>
        <Input
          id='password'
          type='password'
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
        />
      </div>

      {error && (
        <p role='alert' className='text-destructive text-sm'>
          {error}
        </p>
      )}

      <Button type='submit' disabled={pending} className='w-full'>
        {pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
      </Button>

      <p className='text-muted-foreground text-center text-sm'>
        {isSignUp ? 'Already have an account? ' : 'Don’t have an account? '}
        <Link
          href={isSignUp ? '/auth/sign-in' : '/auth/sign-up'}
          className='text-primary underline underline-offset-4'
        >
          {isSignUp ? 'Sign in' : 'Sign up'}
        </Link>
      </p>
    </form>
  );
}
