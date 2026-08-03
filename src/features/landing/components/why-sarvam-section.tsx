'use client';

import { WHY_FEATURES } from '../data/landing';
import { useReveal } from '../hooks/use-reveal';
import { BlurButton } from './blur-button';
import { IconChannels, IconInsights, IconThumbnails } from './product-icons';
import { SectionHeading } from './section-heading';
import { Wordmark } from './wordmark';

const FEATURE_ICONS = [IconChannels, IconThumbnails, IconInsights];

export function WhySarvamSection() {
  const markRef = useReveal<HTMLDivElement>({ threshold: 0.4 });

  return (
    <div className='flex flex-col gap-8'>
      <div className='flex flex-col items-center gap-8 md:gap-16'>
        <SectionHeading heading='Stop stitching together five tabs' />

        <div className='border-st-secondary flex w-full min-w-0 flex-col gap-4 overflow-hidden rounded-[24px] border bg-white p-3 sm:p-4 md:flex-row md:items-stretch md:gap-4 md:rounded-[48px] md:p-6'>
          {/* Cover panel — built from tokens rather than a stock image. */}
          <div
            className='border-st relative h-auto min-h-[220px] w-full overflow-hidden rounded-2xl border md:min-h-0 md:w-[45%] md:flex-none md:rounded-3xl'
            style={{ background: 'linear-gradient(160deg, #13121e 0%, #33409c 62%, #a5bbfc 100%)' }}
          >
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 mix-blend-soft-light'
              style={{
                backgroundImage: 'url(/sarvam/misc/white-noise.webp)',
                backgroundSize: '512px 512px',
                opacity: 0.45
              }}
            />
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0'
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
                backgroundSize: '48px 48px'
              }}
            />
            <div
              ref={markRef}
              className='mark-bloom absolute inset-0 flex items-center justify-center'
            >
              <Wordmark inverted className='text-[28px] md:text-[34px]' />
            </div>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0'
              style={{ boxShadow: 'inset 0px -32px 65px 0px rgba(213,226,255,0.35)' }}
            />
          </div>

          <div className='flex w-full min-w-0 flex-col justify-start gap-8 px-5 py-4 sm:py-3 md:w-[55%] md:gap-10 md:px-10 md:py-8 lg:px-12 lg:py-10'>
            {WHY_FEATURES.map((feature, index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <div key={feature.id} className='flex min-w-0 items-start gap-2 md:gap-5'>
                  <Icon className='text-sr-indigo-600 mt-1 shrink-0' width={26} height={26} />
                  <div className='flex min-w-0 flex-1 flex-col gap-1 md:gap-2.5'>
                    <h3 className='font-matter text-tx text-lg leading-snug font-medium text-balance sm:text-xl md:text-[22px] md:leading-normal'>
                      {feature.title}
                    </h3>
                    <p className='font-matter text-tx-tertiary text-[15px] leading-[155%] sm:text-base sm:leading-[165%]'>
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className='flex justify-center pt-2'>
        <BlurButton href='/auth/sign-up'>Get started free</BlurButton>
      </div>
    </div>
  );
}
