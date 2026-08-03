import Link from 'next/link';

import { CASE_STUDIES } from '../data/landing';
import { BlurButton } from './blur-button';
import { SectionHeading } from './section-heading';

export function CaseStudiesSection() {
  return (
    <div className='flex flex-col gap-10 md:gap-14'>
      <SectionHeading
        heading='What teams do with it'
        subtext='Creators, agencies and networks running many channels at once.'
        action={
          <BlurButton href='/stories' variant='outline' size='sm'>
            View all stories
          </BlurButton>
        }
      />

      <div className='grid grid-cols-1 gap-2 md:grid-cols-3'>
        {CASE_STUDIES.map((study) => (
          <Link
            key={study.headline}
            href={study.href}
            className='group border-st-secondary flex flex-col gap-5 rounded-2xl border bg-white p-7 transition-shadow duration-300 hover:shadow-[0_6px_32px_rgba(0,0,0,0.07)] md:p-8'
          >
            <div className='mb-2 flex flex-col gap-1'>
              <span className='font-season-mix text-tx text-lg font-medium'>{study.org}</span>
              <span className='font-matter-mono text-tx-tertiary text-[11px] tracking-[0.5px] uppercase'>
                {study.orgType}
              </span>
            </div>
            <p className='font-matter text-tx text-xl leading-snug font-medium tracking-[-0.3px] md:text-2xl'>
              {study.headline}
            </p>
            <p className='font-matter text-tx-secondary text-sm leading-relaxed'>{study.body}</p>
            <span className='font-matter text-sr-indigo-600 group-hover:text-sr-indigo-800 mt-auto text-sm underline underline-offset-2 transition-colors duration-200'>
              Read the story
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
