'use client';

import { MARQUEE_ITEMS } from '../data/landing';

/**
 * Capability marquee. This replaces the customer-logo carousel that shipped
 * with the original layout — real company logos there would have implied
 * endorsements that don't exist.
 */
export function LogoCarousel() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className='mx-auto w-full' role='region' aria-label='Platform capabilities'>
      <div className='group relative w-full overflow-x-clip'>
        <div className='animate-marquee flex w-max items-center group-hover:paused motion-reduce:animate-none'>
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              aria-hidden={index >= MARQUEE_ITEMS.length}
              className='flex shrink-0 items-center gap-6 pr-6'
            >
              <span className='font-matter text-tx-tertiary text-sm whitespace-nowrap'>{item}</span>
              <span className='bg-sr-indigo-300 h-1 w-1 shrink-0 rounded-full' aria-hidden='true' />
            </div>
          ))}
        </div>

        {/* Feathered edges so the loop seam never reads as a hard cut. */}
        <div
          aria-hidden='true'
          className='from-sf pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r to-transparent'
        />
        <div
          aria-hidden='true'
          className='from-sf pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l to-transparent'
        />
      </div>
    </div>
  );
}
