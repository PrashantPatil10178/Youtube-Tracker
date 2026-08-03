import { INTEGRATIONS } from '../data/landing';
import { SectionHeading } from './section-heading';

export function DeploymentSection() {
  return (
    <div className='flex flex-col items-center gap-12'>
      <SectionHeading
        heading={
          <>
            Connects to the data
            <br />
            you already have
          </>
        }
      />

      <div className='grid w-full grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6'>
        {INTEGRATIONS.map((option) => (
          <div
            key={option.title}
            className='border-st-secondary flex w-full flex-row items-center gap-5 overflow-hidden rounded-[26px] border bg-white p-2 md:p-4'
          >
            <div
              className='flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl'
              style={{ background: `${option.accent}14` }}
              aria-hidden='true'
            >
              <span
                className='h-8 w-8 rounded-lg'
                style={{
                  background: `linear-gradient(140deg, ${option.accent} 0%, ${option.accent}66 100%)`
                }}
              />
            </div>
            <div className='flex w-full flex-col gap-2'>
              <h3 className='font-matter text-tx-secondary text-[18px] leading-[1.3] font-medium'>
                {option.title}
              </h3>
              <p className='font-matter text-tx-tertiary text-[16px] leading-normal'>
                {option.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
