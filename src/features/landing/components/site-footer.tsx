import Link from 'next/link';

import { NAV_SECTIONS, SOCIAL_LINKS } from '../data/nav';
import { IconDiscord, IconGitHub, IconInstagram, IconLinkedIn, IconX, IconYouTube } from './icons';
import { Wordmark } from './wordmark';

const SOCIAL_ICON = {
  LinkedIn: IconLinkedIn,
  X: IconX,
  YouTube: IconYouTube,
  GitHub: IconGitHub,
  Discord: IconDiscord,
  Instagram: IconInstagram
} as const;

const CAPABILITY_CHIPS = ['API access', 'Data export'];

export function SiteFooter() {
  return (
    <footer className='to-sf-secondary border-st-secondary relative mx-auto flex w-screen flex-col items-center justify-between gap-12 overflow-hidden border-t bg-gradient-to-b from-white pt-12 md:gap-24 md:pt-20'>
      <div className='2xl:max-w-width-mx relative z-10 mx-auto w-10/12'>
        <div className='flex flex-col items-start justify-between gap-8 md:flex-row md:gap-8 lg:gap-24'>
          {/* Brand column */}
          <div className='relative z-10 flex w-full shrink-0 flex-col gap-8 md:w-[182px] md:gap-10'>
            <div className='flex flex-col gap-5 md:gap-4'>
              <Link href='/' className='w-fit'>
                <Wordmark className='text-[26px]' />
              </Link>
              <p className='font-matter text-tx-tertiary w-fit text-xs leading-none font-normal'>
                YouTube analytics, decided by AI
              </p>
              <div className='flex w-fit flex-wrap gap-2'>
                {CAPABILITY_CHIPS.map((chip) => (
                  <span
                    key={chip}
                    className='border-st-secondary font-matter text-tx-tertiary rounded-full border px-3 py-1 text-[11px]'
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className='flex flex-col gap-4 md:gap-3'>
              <p className='font-matter text-tx-tertiary text-xs leading-[18px] font-normal'>
                Find us at
              </p>
              <div className='flex items-center gap-3'>
                {SOCIAL_LINKS.map((social) => {
                  const Icon = SOCIAL_ICON[social.label];
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-label={social.label}
                      className='group text-tx-tertiary transition-colors duration-200'
                      style={{ '--hover-color': social.hoverColor } as React.CSSProperties}
                    >
                      <Icon className='transition-colors duration-200 group-hover:[color:var(--hover-color)]' />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className='border-st w-full border p-3'>
              <div className='font-matter text-tx-tertiary flex w-full flex-col gap-5 text-xs leading-[1.5] font-normal'>
                <p>© {new Date().getFullYear()} ChannelIQ. All rights reserved.</p>
                <p>Not affiliated with, or endorsed by, YouTube or Google LLC.</p>
              </div>
            </div>
          </div>

          {/* Link columns */}
          <div className='flex w-full min-w-0 flex-col gap-12 md:flex-1'>
            <div className='relative w-full py-6 md:py-2'>
              <div className='bg-sf-secondary border-st-secondary absolute inset-0 h-full w-full rounded border' />
              <div className='relative z-10 flex h-full w-full flex-col items-start justify-between gap-2.5 px-6 md:flex-row md:items-center'>
                <p className='font-matter-mono text-tx text-sm uppercase md:whitespace-normal lg:whitespace-nowrap'>
                  New: Competitor Watch is now real-time
                </p>
                <Link
                  href='/blog/competitor-watch-realtime'
                  className='font-matter-mono text-sr-indigo-800 shrink-0 text-sm uppercase underline underline-offset-[3px]'
                >
                  Read the update
                </Link>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-5'>
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className='flex flex-col gap-4'>
                  <h3 className='font-matter-mono text-tx text-xs leading-[18px] font-normal uppercase'>
                    {section.title}
                  </h3>
                  <ul className='flex flex-col gap-2.5'>
                    {section.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className='text-tx-tertiary hover:text-tx block text-base transition-colors duration-200'
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Oversized wordmark, set in type rather than masked footage. */}
      <div className='relative mx-auto w-full overflow-hidden' aria-hidden='true'>
        <div className='flex translate-y-[24%] justify-center'>
          <Wordmark className='text-[21vw] leading-none opacity-[0.06]' />
        </div>
      </div>
    </footer>
  );
}
