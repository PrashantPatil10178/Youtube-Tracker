import { BlurButton } from './blur-button';
import { SectionHeading } from './section-heading';

export function TestimonialSection() {
  return (
    <div className='flex flex-col gap-10 md:gap-12'>
      <SectionHeading heading='What creators say' />

      <div className='flex w-full flex-col gap-8'>
        <figure className='flex w-full flex-col gap-16 overflow-hidden rounded-[24px] border border-[#f0f0f0] bg-white p-6 md:rounded-[48px] md:p-16'>
          <div className='flex flex-col items-start gap-10 py-3 md:py-2'>
            <span className='font-season-mix text-tx text-lg font-medium'>Pixel Forge</span>
            <blockquote className='font-matter text-tx text-xl leading-[160%]'>
              We used to argue about thumbnails from gut feel and ship whichever one the editor
              liked. Now we score both before publishing, and the disagreements last about thirty
              seconds. Our click-through is up across the whole back catalogue we retested.
            </blockquote>
          </div>

          <div className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
            <figcaption className='flex items-center gap-4'>
              <span
                aria-hidden='true'
                className='font-season-mix flex h-12 w-12 items-center justify-center rounded-full text-lg font-medium text-white'
                style={{ background: 'linear-gradient(180deg, #c43d2b 0%, #eba18f 100%)' }}
              >
                R
              </span>
              <div className='flex flex-col gap-1'>
                <p className='font-matter text-tx text-[16px] leading-normal font-medium'>
                  Rhea Kapoor
                </p>
                <p className='font-matter text-tx-tertiary text-[14px] leading-normal'>
                  Head of Content, Pixel Forge
                </p>
              </div>
            </figcaption>

            <BlurButton href='/stories/pixel-forge' variant='outline' className='w-full md:w-auto'>
              Read the story
            </BlurButton>
          </div>
        </figure>
      </div>
    </div>
  );
}
