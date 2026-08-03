import { BlurButton } from './blur-button';
import { LogoCarousel } from './logo-carousel';

export function HeroSection() {
  return (
    <section className='lg:max-h-height-mx relative flex min-h-screen flex-col gap-8 overflow-x-clip pt-36 md:h-fit md:gap-0 md:pt-40 2xl:min-h-[75vh]'>
      <div
        aria-hidden='true'
        className='absolute top-0 left-0 z-10 h-28 w-full bg-gradient-to-b from-white to-transparent'
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src='/sarvam/pages/home/hero-gradient.svg'
        alt=''
        aria-hidden='true'
        className='pointer-events-none absolute top-[-150%] left-1/2 z-0 max-w-none -translate-x-1/2 scale-60 md:-top-[110%] md:scale-x-90 md:scale-y-80 2xl:-top-full'
      />

      <div className='max-w-width-mx relative z-10 mx-auto flex w-[85%] flex-col items-center justify-center pb-[14vh] md:w-9/12 md:flex-1'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-[80px] md:h-[400px] md:w-[600px] md:opacity-40 md:blur-[100px]'
          style={{
            background: 'radial-gradient(ellipse, #A5BBFC 0%, #D5E2FF 40%, transparent 70%)'
          }}
        />

        <div className='flex w-fit flex-col items-center gap-1.5 md:gap-2.5'>
          <div
            aria-hidden='true'
            className='h-px w-full'
            style={{ background: 'radial-gradient(circle, #6a88e2 0%, transparent 100%)' }}
          />
          <p className='font-matter text-sr-indigo-900 px-8 text-center text-sm leading-normal tracking-wide md:text-base'>
            AI-powered YouTube analytics
          </p>
          <div
            aria-hidden='true'
            className='h-px w-full'
            style={{ background: 'radial-gradient(circle, #6a88e2 0%, transparent 100%)' }}
          />
        </div>

        <h1 className='font-season-mix text-tx mt-5 max-w-4xl text-center text-[44px] leading-[1.05] tracking-tight md:mt-8 md:text-[64px]'>
          Every channel.
          <br className='hidden md:block' /> One&nbsp;dashboard.
        </h1>

        <p className='font-matter text-tx-secondary mt-2.5 w-full text-center text-base leading-[1.75] md:mt-3.5 md:text-[20px]'>
          Track views across every channel you run. Test thumbnails before you&nbsp;publish.
          <br className='hidden md:block' /> Let AI explain what actually moved the&nbsp;numbers.
        </p>

        <div className='mt-5 flex flex-wrap items-center justify-center gap-4 md:mt-8 md:gap-5'>
          <BlurButton
            href='/auth/sign-up'
            ariaLabel='Start tracking your channels'
            className='px-6 py-3.5'
          >
            Start tracking free
          </BlurButton>
          <BlurButton
            href='/auth/sign-in'
            variant='outline'
            ariaLabel='Sign in to your account'
            className='px-6 py-3.5'
          >
            Sign in
          </BlurButton>
        </div>

        <p className='font-matter text-tx-tertiary mt-4 text-center text-[13px] md:mt-5'>
          Connect your first channel in under a minute. No card required.
        </p>
      </div>

      <div className='relative z-10 flex w-full shrink-0 flex-col items-center gap-5 md:gap-8 md:pb-12'>
        <p className='font-matter text-tx-tertiary text-xs font-medium tracking-[2px] uppercase'>
          Everything in one workspace
        </p>
        <LogoCarousel />
      </div>
    </section>
  );
}
