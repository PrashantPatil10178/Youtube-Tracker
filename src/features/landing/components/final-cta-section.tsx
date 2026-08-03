import Link from 'next/link';

import { Wordmark } from './wordmark';

export function FinalCtaSection() {
  return (
    <div className='border-st rounded-[40px] border bg-white p-3 md:rounded-[64px] md:p-4'>
      <div
        className='relative flex min-h-[450px] flex-col items-center justify-end overflow-hidden rounded-[28px] shadow-[0px_0px_0px_1px_rgba(0,0,0,0.05)] md:rounded-[52px]'
        style={{ background: 'linear-gradient(to bottom, #13121e 0%, #a5bbfc 116.55%)' }}
      >
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 rotate-180 mix-blend-soft-light'
          style={{
            backgroundImage: 'url(/sarvam/misc/white-noise.webp)',
            backgroundSize: '512px 512px',
            backgroundPosition: 'top left',
            opacity: 0.5
          }}
        />

        <div className='font-season-mix absolute top-[50px] left-1/2 z-10 w-10/12 -translate-x-1/2 px-4 text-center text-2xl leading-normal text-white not-italic md:top-16 md:text-[32px]'>
          <p className='md:hidden'>Know what your next video will do</p>
          <p className='mb-0 hidden md:block'>Know what your next</p>
          <p className='hidden md:block'>video will do</p>
        </div>

        {/* Rising bars stand in for the brand motif that used to sit here. */}
        <div
          aria-hidden='true'
          className='absolute top-1/2 left-1/2 z-0 flex h-[190px] w-[300px] -translate-x-1/2 -translate-y-[46%] items-end gap-3 md:h-[230px] md:w-[420px]'
        >
          {[0.3, 0.46, 0.38, 0.62, 0.54, 0.8, 0.68, 1].map((height, index) => (
            <div
              key={index}
              className='flex-1 rounded-t-md'
              style={{
                height: `${height * 100}%`,
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.05) 100%)'
              }}
            />
          ))}
        </div>

        <div className='absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2'>
          <Wordmark inverted className='text-[26px] md:text-[32px]' />
        </div>

        <div className='absolute bottom-[50px] left-1/2 z-10 flex -translate-x-1/2 flex-wrap items-center justify-center gap-3 md:bottom-[60px]'>
          <Link
            href='/auth/sign-up'
            className='font-season-mix text-sr-indigo-950 relative inline-flex items-center justify-center overflow-hidden rounded-full border border-white/45 px-5 py-2.5 text-base font-medium whitespace-nowrap backdrop-blur-[6px] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97] md:px-6 md:py-3 md:text-lg'
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.28) 100%)'
            }}
          >
            Start tracking free
            <span
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 rounded-full'
              style={{ boxShadow: 'inset 0px 0px 4px 0px rgba(255,255,255,0.55)' }}
            />
          </Link>
        </div>

        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 rounded-[inherit]'
          style={{ boxShadow: 'inset 0px -32px 65px 0px #d5e2ff' }}
        />
      </div>
    </div>
  );
}
