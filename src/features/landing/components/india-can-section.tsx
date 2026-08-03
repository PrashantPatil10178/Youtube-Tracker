'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';

import { BlurButton } from './blur-button';
import { IconCheckBadge } from './icons';

type Variant = {
  id: 'a' | 'b';
  label: string;
  ctr: number;
  views: string;
  /** Stand-in artwork — swap for real uploaded thumbnails. */
  gradient: string;
  caption: string;
};

const VARIANTS: Variant[] = [
  {
    id: 'a',
    label: 'Variant A',
    ctr: 4.2,
    views: '128K',
    gradient: 'linear-gradient(135deg, #4250d5 0%, #81a0e9 55%, #d2dff9 100%)',
    caption: 'Wide shot ・ 7 words'
  },
  {
    id: 'b',
    label: 'Variant B',
    ctr: 7.8,
    views: '241K',
    gradient: 'linear-gradient(135deg, #e6651b 0%, #f59970 55%, #fddcce 100%)',
    caption: 'Close-up ・ 3 words'
  }
];

export function IndiaCanSection() {
  const [selected, setSelected] = useState<'a' | 'b'>('b');
  const winner = VARIANTS.reduce((best, v) => (v.ctr > best.ctr ? v : best));

  return (
    <div className='flex flex-col items-center gap-10 md:flex-row md:gap-16'>
      <div className='flex h-full shrink-0 flex-col items-center justify-between gap-3 py-4 text-center md:w-[25%] md:items-start md:gap-4 md:text-left'>
        <h2 className='font-season-mix text-tx text-2xl leading-tight font-medium tracking-[-0.5px] md:text-3xl'>
          Test the thumbnail first
        </h2>
        <p className='font-matter text-tx-secondary text-base leading-[150%] md:text-[17px]'>
          Upload two options and get a predicted click-through rate for each, plus the reason one
          wins — before a single viewer sees either.
        </p>
        <div className='mt-4'>
          <BlurButton href='/auth/sign-up'>Score a thumbnail</BlurButton>
        </div>
      </div>

      <div className='border-st-secondary relative w-full overflow-hidden rounded-3xl border bg-white p-4 md:w-[75%] md:p-6'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {VARIANTS.map((variant) => {
            const isWinner = variant.id === winner.id;
            const isSelected = variant.id === selected;
            return (
              <button
                key={variant.id}
                type='button'
                aria-pressed={isSelected}
                onClick={() => setSelected(variant.id)}
                className={cn(
                  'group flex cursor-pointer flex-col gap-3 rounded-2xl border p-3 text-left transition-all duration-300',
                  isSelected
                    ? 'border-sr-indigo-300 bg-sr-indigo-50/60'
                    : 'border-st-secondary hover:border-sr-indigo-200 bg-white'
                )}
              >
                <div
                  className='relative w-full overflow-hidden rounded-xl'
                  style={{ aspectRatio: '16/9', background: variant.gradient }}
                >
                  {isWinner && (
                    <span className='font-matter absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#1e2033] backdrop-blur-sm'>
                      <IconCheckBadge width={13} height={13} className='text-sr-green-600' />
                      Predicted winner
                    </span>
                  )}
                </div>

                <div className='flex items-end justify-between gap-3 px-1 pb-1'>
                  <div className='flex flex-col gap-0.5'>
                    <span className='font-matter text-tx text-sm font-medium'>{variant.label}</span>
                    <span className='font-matter text-tx-tertiary text-xs'>{variant.caption}</span>
                  </div>
                  <div className='flex flex-col items-end gap-0.5'>
                    <span className='font-season-mix text-tx text-2xl leading-none font-medium tabular-nums'>
                      {variant.ctr}%
                    </span>
                    <span className='font-matter text-tx-tertiary text-[11px]'>predicted CTR</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className='bg-sf-secondary border-st-secondary mt-4 flex items-start gap-3 rounded-2xl border p-4'>
          <span className='bg-sr-indigo-100 text-sr-indigo-800 font-matter-mono mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] tracking-[1px] uppercase'>
            AI
          </span>
          <p className='font-matter text-tx-secondary text-[15px] leading-[160%]'>
            Variant B is predicted to earn{' '}
            <strong className='text-tx font-medium'>86% more clicks</strong>. The tighter crop makes
            the face readable at feed size, and cutting the overlay from seven words to three keeps
            the text legible on mobile.
          </p>
        </div>
      </div>
    </div>
  );
}
