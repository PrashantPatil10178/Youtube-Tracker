'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { NAV_SECTIONS, PRIMARY_NAV } from '../data/nav';
import { BlurButton } from './blur-button';
import { Wordmark } from './wordmark';

/**
 * Frosted pill navigation. The top gradient scrim and the primary CTA both
 * fade in once the hero has scrolled away, matching sarvam.ai.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header className='fixed top-0 right-0 left-0 z-[10000] w-full'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute top-0 right-0 left-0 h-8 transition-opacity duration-300 lg:h-10'
        style={{
          opacity: scrolled ? 1 : 0,
          background: 'linear-gradient(to bottom, #fafafa 40%, transparent)',
          maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 15%, black 85%, transparent)'
        }}
      />

      <div className='relative mx-auto w-full max-w-[1400px] px-2 pt-2 lg:px-8 lg:pt-3'>
        <div
          data-menu-open={menuOpen}
          className='overflow-hidden rounded-[34px]'
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.55)',
            border: '1px solid rgba(220, 220, 220, 0.4)',
            backdropFilter: 'blur(24px) saturate(1.3) brightness(1.04)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.3) brightness(1.04)',
            boxShadow: '0 2px 24px rgba(0,0,0,0.02), inset 0 1px 3px rgba(0,0,0,0.04)',
            transition:
              'background-color 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease, box-shadow 0.4s ease'
          }}
        >
          {/* Desktop */}
          <nav className='hidden w-full items-center justify-between py-2.5 pr-2.5 pl-9 lg:flex'>
            <div className='mx-auto flex max-w-width-mx flex-1 items-center justify-between'>
              <Link href='/' className='flex flex-1 items-center gap-2 transition-opacity'>
                <Wordmark className='text-[19px] md:text-[21px]' />
              </Link>

              <div className='hidden flex-[2] items-center justify-center gap-4 lg:flex'>
                {PRIMARY_NAV.map((item) => (
                  <button
                    key={item}
                    type='button'
                    className='flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 transition-colors duration-200 hover:bg-black/5'
                  >
                    <span className='font-matter text-xs font-medium tracking-[1px] text-black uppercase'>
                      {item}
                    </span>
                  </button>
                ))}
              </div>

              <div className='hidden flex-1 items-center justify-end gap-3 md:flex'>
                <BlurButton
                  href='/auth/sign-up'
                  className={cn(
                    'w-fit text-nowrap transition-opacity duration-150',
                    scrolled ? 'opacity-100' : 'pointer-events-none opacity-0'
                  )}
                >
                  Sign up
                </BlurButton>
                <BlurButton href='/auth/sign-in' variant='outline' className='w-fit text-nowrap'>
                  Sign in
                </BlurButton>
              </div>
            </div>
          </nav>

          {/* Mobile */}
          <div className='flex flex-col lg:hidden'>
            <div className='flex items-center justify-between px-4 py-2 pl-5'>
              <Link href='/' className='relative flex items-center gap-2'>
                <Wordmark className='text-[18px]' />
              </Link>

              <div className='flex items-center gap-3'>
                <div
                  className={cn(
                    'transition-opacity duration-150',
                    scrolled ? 'opacity-100' : 'pointer-events-none opacity-0'
                  )}
                >
                  <BlurButton href='/auth/sign-up' variant='outline' size='sm'>
                    Sign up
                  </BlurButton>
                </div>

                <button
                  type='button'
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label='Toggle menu'
                  aria-expanded={menuOpen}
                  className='flex h-7 w-7 flex-col items-center justify-center space-y-[3px] focus:outline-none'
                >
                  <span
                    className={cn(
                      'h-[1.5px] w-[18px] origin-center bg-black transition-all duration-300 ease-out',
                      menuOpen && 'translate-y-[4.5px] rotate-45'
                    )}
                  />
                  <span
                    className={cn(
                      'h-[1.5px] w-[18px] bg-black transition-all duration-300 ease-out',
                      menuOpen && 'opacity-0'
                    )}
                  />
                  <span
                    className={cn(
                      'h-[1.5px] w-[18px] origin-center bg-black transition-all duration-300 ease-out',
                      menuOpen && '-translate-y-[4.5px] -rotate-45'
                    )}
                  />
                </button>
              </div>
            </div>

            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.2,0,0,1)]',
                menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className='overflow-hidden'>
                <div className='max-h-[70vh] overflow-y-auto px-5 pt-2 pb-6'>
                  {NAV_SECTIONS.map((section) => (
                    <div
                      key={section.title}
                      className='border-st-secondary border-t py-4 first:border-t-0'
                    >
                      <p className='font-matter-mono text-tx text-xs uppercase'>{section.title}</p>
                      <div className='mt-3 flex flex-col gap-2.5'>
                        {section.links.map((link) => (
                          <Link
                            key={link.label}
                            href={link.href}
                            className='font-matter text-tx-tertiary hover:text-tx text-base transition-colors'
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className='mt-4 flex flex-col gap-3'>
                    <BlurButton href='/auth/sign-up' className='w-full'>
                      Sign up
                    </BlurButton>
                    <BlurButton href='/auth/sign-in' variant='outline' className='w-full'>
                      Sign in
                    </BlurButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
