import Link from 'next/link';

import { BLOG_POSTS } from '../data/landing';
import { BlurButton } from './blur-button';
import { SectionHeading } from './section-heading';

export function ResearchUpdatesSection() {
  return (
    <>
      <SectionHeading heading='Research &amp; Updates' />

      <div className='grid w-full grid-cols-1 items-start gap-6 md:grid-cols-3 md:gap-8'>
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.title}
            href={post.href}
            aria-label={`Read: ${post.title}`}
            className='group border-sf-tertiary hover:border-sr-indigo-200 flex h-full flex-col justify-between gap-1 rounded-[32px] border bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] md:gap-2.5'
          >
            <div className='flex shrink-0 flex-col gap-2 px-2.5 py-3 md:gap-3'>
              <div className='flex flex-col gap-2'>
                <span
                  className='font-matter-mono text-xs font-medium tracking-wide uppercase'
                  style={{ color: post.accent }}
                >
                  {post.category}
                </span>
                <h3 className='font-matter text-tx line-clamp-2 text-lg leading-snug font-medium md:text-xl'>
                  {post.title}
                </h3>
              </div>
              <span className='font-matter text-tx-tertiary text-sm font-normal'>{post.date}</span>
            </div>

            <div
              className='mt-0 aspect-video w-full shrink-0 overflow-hidden rounded-[20px]'
              style={{ background: `linear-gradient(150deg, ${post.accent}22 0%, #ffffff 75%)` }}
              aria-hidden='true'
            >
              <div className='flex h-full w-full items-end gap-1.5 p-5'>
                {[0.35, 0.55, 0.45, 0.7, 0.6, 0.85, 1].map((height, index) => (
                  <div
                    key={index}
                    className='flex-1 rounded-t-[2px] transition-transform duration-500 group-hover:scale-y-105'
                    style={{
                      height: `${height * 100}%`,
                      background: post.accent,
                      opacity: 0.2 + index * 0.1,
                      transformOrigin: 'bottom'
                    }}
                  />
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <BlurButton href='/blog' variant='outline' size='lg'>
        View all updates
      </BlurButton>
    </>
  );
}
