import Link from 'next/link';

import { CAPABILITIES } from '../data/landing';
import { BlurButton } from './blur-button';
import { IconArrowUpRight } from './icons';
import { SectionHeading } from './section-heading';

export function StackLayersSection() {
  return (
    <div className='flex flex-col gap-12 md:gap-16'>
      <div className='flex flex-col items-center gap-6 md:gap-8'>
        <p className='font-matter-mono text-tx-tertiary text-center text-xs leading-[175%] font-medium tracking-[2px] uppercase'>
          For Creators | Agencies | Networks
        </p>
        <SectionHeading heading='Track. Compare. Predict.' />
      </div>

      <div className='grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-3'>
        {CAPABILITIES.map((layer) => (
          <div key={layer.id} className='flex flex-col gap-6'>
            <CapabilityCover accent={layer.accent} />

            <div className='flex flex-col gap-3.5'>
              <h3
                className='font-matter text-tx text-xl font-medium tracking-[-0.3px]'
                style={{ textWrap: 'balance' }}
              >
                {layer.title}
              </h3>
              <p className='font-matter text-tx-tertiary text-base' style={{ textWrap: 'pretty' }}>
                {layer.description}
              </p>
            </div>

            <div className='flex flex-col'>
              {layer.links?.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className='group border-st-secondary font-matter text-tx-secondary hover:text-tx hover:border-sr-indigo-200 inline-flex items-center justify-between border-b py-3 tracking-[-0.14px] transition-colors duration-200 last:border-b-0'
                >
                  <span className='flex items-center gap-2'>
                    <span
                      aria-hidden='true'
                      className='h-1.5 w-1.5 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-150'
                      style={{ background: layer.accent }}
                    />
                    <span>{link.label}</span>
                  </span>
                  <span className='flex shrink-0 items-center gap-1.5 md:gap-2.5'>
                    <span className='font-matter-mono text-tx-tertiary text-[10px] transition-colors duration-200'>
                      {link.sublabel}
                    </span>
                    <IconArrowUpRight
                      width={14}
                      height={14}
                      className='text-st group-hover:text-sr-indigo-500 shrink-0 transition-colors duration-200'
                    />
                  </span>
                </Link>
              ))}

              {layer.stats?.map((stat) => (
                <div
                  key={stat.label}
                  className='border-st-secondary flex items-baseline justify-between border-b py-3 last:border-b-0'
                >
                  <span className='font-matter text-tx-tertiary text-sm'>{stat.label}</span>
                  <span
                    className='font-matter text-tx text-xl font-medium tracking-[-0.5px]'
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className='flex justify-center'>
        <BlurButton href='/auth/sign-up' variant='outline'>
          Start tracking free
        </BlurButton>
      </div>
    </div>
  );
}

/** Generated cover art — keeps the original layout's image slot without
 *  shipping stock photography. */
function CapabilityCover({ accent }: { accent: string }) {
  const bars = [0.42, 0.58, 0.5, 0.72, 0.64, 0.88, 0.8, 1];

  return (
    <div
      className='border-st-secondary relative flex h-42 w-full items-end gap-2 overflow-hidden rounded-lg border p-5'
      style={{ background: `linear-gradient(170deg, ${accent}14 0%, #ffffff 70%)` }}
      aria-hidden='true'
    >
      {bars.map((height, index) => (
        <div
          key={index}
          className='flex-1 rounded-t-[3px]'
          style={{
            height: `${height * 100}%`,
            background: accent,
            opacity: 0.18 + (index / bars.length) * 0.72
          }}
        />
      ))}
      <div
        className='pointer-events-none absolute inset-0'
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />
    </div>
  );
}
