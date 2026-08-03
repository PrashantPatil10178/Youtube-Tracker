'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

import { useReveal } from '../hooks/use-reveal';

type SectionHeadingProps = {
  heading: ReactNode;
  subtext?: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function SectionHeading({ heading, subtext, className, action }: SectionHeadingProps) {
  const ref = useReveal<HTMLDivElement>({ threshold: 0.3 });

  return (
    <div
      ref={ref}
      className={cn(
        'section-heading-reveal flex w-full flex-col items-center gap-6 text-center',
        className
      )}
    >
      <div className='flex w-full flex-col items-center gap-6 text-center'>
        <div className='flex w-full flex-col items-center gap-4 text-center'>
          <h2 className='font-season-mix text-tx w-full px-3 text-3xl leading-[135%] font-normal whitespace-pre-line md:px-0 md:text-[36px]'>
            {heading}
          </h2>
          {subtext && (
            <p className='font-matter text-tx-tertiary max-w-[700px] text-[14px] leading-[155%] md:text-[18px]'>
              {subtext}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
