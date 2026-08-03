import { AGENCY_CARDS, GOVERNANCE_BADGES } from '../data/landing';
import { IconCheckBadge } from './icons';

/** Capability badges only — deliberately not certification claims. */
const BADGE_STYLES = [
  'text-sr-indigo-600 bg-sr-indigo-50 border-sr-indigo-200/75 shadow-[inset_0px_-0.5px_1px_0px_var(--color-sr-indigo-200)]',
  'text-sr-green-600 bg-sr-green-50/75 border-sr-green-200/75 shadow-[inset_0px_-0.5px_1px_0px_var(--color-sr-green-200)]',
  'text-sr-orange-600 bg-sr-orange-50 border-sr-orange-200/75 shadow-[inset_0px_-0.5px_1px_0px_var(--color-sr-orange-200)]',
  'text-sr-pink-400 bg-sr-pink-50/50 border-sr-pink-100 shadow-[inset_0px_-0.5px_1px_0px_var(--color-sr-pink-100)]',
  'text-sr-yellow-700/90 bg-sr-yellow-50/50 border-sr-yellow-200 shadow-[inset_0px_-0.5px_1px_0px_var(--color-sr-yellow-300)]',
  'text-sr-red-300 bg-sr-red-50/50 border-sr-red-100 shadow-[inset_0px_-0.5px_1px_0px_var(--color-sr-red-100)]'
];

export function EnterpriseSection() {
  return (
    <div className='flex flex-col gap-2'>
      <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
        {AGENCY_CARDS.map((card) => (
          <div
            key={card.title}
            className='border-st-secondary flex flex-col rounded-xl border bg-white p-8 md:rounded-2xl md:p-10'
          >
            <h3 className='font-matter text-tx text-lg leading-[130%] font-medium tracking-[-1%] text-balance md:text-[21px]'>
              {card.title}
            </h3>
            <p className='font-matter text-tx-tertiary mt-1.5 text-base leading-[160%] text-pretty md:mt-2.5'>
              {card.description}
            </p>
            <ul className='mt-5 flex flex-col gap-2.5 md:mt-7 md:gap-3.5'>
              {card.bullets.map((bullet) => (
                <li key={bullet} className='flex items-start gap-3'>
                  <IconCheckBadge className='text-sr-indigo-600 mt-0.5 shrink-0' />
                  <span className='font-matter text-tx-secondary text-base leading-[155%]'>
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className='border-st-secondary rounded-xl border bg-white p-8 md:rounded-2xl md:p-10'>
        <div className='flex flex-col gap-8 md:flex-row'>
          <div className='flex h-auto flex-col justify-between gap-1.5 md:flex-1 md:gap-2.5'>
            <h3 className='font-matter text-tx text-lg leading-[130%] font-medium tracking-[-1%] text-balance md:text-[21px]'>
              Access and governance
            </h3>
            <p className='font-matter text-tx-tertiary max-w-lg text-base leading-[160%] text-pretty'>
              Control who sees which channels, keep a record of what changed, and export everything
              on demand. Built in from the start rather than bolted on for enterprise plans.
            </p>
          </div>

          <div className='flex flex-wrap gap-2 md:flex-1 md:justify-end'>
            {GOVERNANCE_BADGES.map((badge, index) => (
              <span
                key={badge}
                className={`font-matter hover:animate-wiggle inline-flex cursor-default items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold ${BADGE_STYLES[index % BADGE_STYLES.length]}`}
              >
                <IconCheckBadge width={15} height={15} />
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
