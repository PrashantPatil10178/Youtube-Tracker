import { Wordmark } from '@/features/landing/components/wordmark';
import Link from 'next/link';
import type { ReactNode } from 'react';

type SarvamAuthShellProps = {
  /** Season Mix headline, e.g. "Log into your account". */
  title?: string;
  /** Matter subtext under the headline. */
  subtitle?: string;
  children: ReactNode;
};

/**
 * Split auth layout: the gradient/noise brand panel from the landing CTA on
 * the left, a centered pill-field form (circular mark, serif headline) on
 * the right.
 */
export function SarvamAuthShell({ title, subtitle, children }: SarvamAuthShellProps) {
  return (
    <div className='font-matter bg-sf flex min-h-screen flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
      {/* Brand panel */}
      <div className='relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-4'>
        <div
          className='relative flex h-full flex-col justify-between overflow-hidden rounded-[52px] p-12 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.05)]'
          style={{ background: 'linear-gradient(to bottom, #13121e 0%, #a5bbfc 116.55%)' }}
        >
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 rotate-180 mix-blend-soft-light'
            style={{
              backgroundImage: 'url(/sarvam/misc/white-noise.webp)',
              backgroundSize: '512px 512px',
              opacity: 0.5
            }}
          />

          <Link href='/' className='relative z-10 w-fit'>
            <Wordmark inverted className='text-[22px]' />
          </Link>

          <div
            aria-hidden='true'
            className='pointer-events-none absolute top-1/2 left-1/2 z-0 flex h-[200px] w-[280px] -translate-x-1/2 -translate-y-[58%] items-end gap-2.5'
          >
            {[0.3, 0.46, 0.38, 0.62, 0.54, 0.8, 0.68, 1].map((height, index) => (
              <div
                key={index}
                className='flex-1 rounded-t-md'
                style={{
                  height: `${height * 100}%`,
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.04) 100%)'
                }}
              />
            ))}
          </div>
          <div className='relative z-10 flex flex-col gap-6'>
            <p className='font-season-mix text-[28px] leading-[1.25] text-white'>
              Every channel. One dashboard.
            </p>
            <p className='font-matter max-w-md text-[15px] leading-[165%] text-white/70'>
              Track views across every channel you run, test thumbnails before you publish, and let
              AI explain what moved the numbers.
            </p>
          </div>

          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 rounded-[inherit]'
            style={{ boxShadow: 'inset 0px -32px 65px 0px #d5e2ff' }}
          />
        </div>
      </div>

      {/* Form rail — centered, pill fields */}
      <div className='flex flex-1 flex-col items-center justify-center px-6 py-16'>
        <div className='flex w-full max-w-[400px] flex-col items-center gap-8'>
          <Link
            href='/'
            aria-label='ChannelIQ home'
            className='border-tx/12 text-tx flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-colors hover:border-tx/25'
          >
            <span className='font-season-mix text-[15px] tracking-[-0.02em]'>
              iq<span className='text-sr-indigo-600'>.</span>
            </span>
          </Link>

          {title && (
            <div className='flex flex-col items-center gap-2.5 text-center'>
              <h1 className='font-season-mix text-tx text-[30px] leading-[1.15] tracking-tight'>
                {title}
              </h1>
              {subtitle && (
                <p className='font-matter text-tx-tertiary text-[15px] leading-[155%]'>
                  {subtitle}
                </p>
              )}
            </div>
          )}

          <div className='w-full'>{children}</div>

          <p className='font-matter text-tx-tertiary/70 text-center text-xs'>
            By continuing you agree to our{' '}
            <Link href='/terms-of-service' className='hover:text-tx underline underline-offset-2'>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href='/privacy-policy' className='hover:text-tx underline underline-offset-2'>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
