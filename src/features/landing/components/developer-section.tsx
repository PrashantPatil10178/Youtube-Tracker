'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';

import { CODE_SNIPPETS, FEATURE_CARDS, type CodeLanguage } from '../data/landing';
import { BlurButton } from './blur-button';
import { IconCopy } from './icons';
import { IconChannels, IconCompetitors, IconInsights, IconThumbnails } from './product-icons';
import { SectionHeading } from './section-heading';

const LANGUAGES = Object.keys(CODE_SNIPPETS) as CodeLanguage[];
const FEATURE_ICONS = [IconThumbnails, IconChannels, IconCompetitors, IconInsights];

/** Python keyword / string highlighting kept deliberately minimal — matches the
 *  two-colour treatment on the source page rather than a full tokenizer. */
function highlight(code: string) {
  return code.split('\n').map((line, lineIndex) => {
    const parts = line.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
    return (
      <span key={lineIndex}>
        {parts.map((part, partIndex) => {
          if (/^["']/.test(part)) {
            return (
              <span key={partIndex} className='text-sr-green-600'>
                {part}
              </span>
            );
          }
          const keywords = part.split(/\b(from|import|const|await|new|export)\b/g);
          return (
            <span key={partIndex}>
              {keywords.map((chunk, chunkIndex) =>
                /^(from|import|const|await|new|export)$/.test(chunk) ? (
                  <span key={chunkIndex} className='text-sr-indigo-600'>
                    {chunk}
                  </span>
                ) : (
                  <span key={chunkIndex}>{chunk}</span>
                )
              )}
            </span>
          );
        })}
        {'\n'}
      </span>
    );
  });
}

export function DeveloperSection() {
  const [language, setLanguage] = useState<CodeLanguage>('Node');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(CODE_SNIPPETS[language]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className='flex flex-col gap-10 md:gap-14'>
      <SectionHeading
        heading='Pull your numbers into anything'
        subtext='Every metric ChannelIQ collects is available over the API.'
      />

      <div className='grid grid-cols-1 gap-2 lg:grid-cols-[50fr_50fr]'>
        {/* Code panel */}
        <div className='border-st-secondary/50 relative row-span-2 hidden flex-col gap-4 overflow-hidden rounded-2xl border bg-white p-6 md:p-12 lg:flex'>
          <h3 className='font-matter text-tx text-lg leading-tight font-medium tracking-[-1px] md:text-2xl lg:text-[26px]'>
            Query <span className='text-sr-indigo-600'>every channel</span>
            <br />
            from your own stack
          </h3>

          <div className='relative mt-8 -mb-16'>
            <div className='border-st-secondary overflow-hidden rounded-sm border'>
              <div className='bg-sf-secondary border-st-secondary flex items-stretch overflow-x-auto border-b'>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type='button'
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      'font-matter border-st-secondary relative flex shrink-0 cursor-pointer items-center gap-1.5 border-r px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors duration-150',
                      language === lang
                        ? 'text-tx bg-white'
                        : 'text-tx-tertiary hover:text-tx-secondary'
                    )}
                  >
                    {language === lang && (
                      <span className='bg-sr-indigo-500 absolute top-0 right-0 left-0 h-[2px]' />
                    )}
                    {lang}
                  </button>
                ))}
                <div className='flex-1' />
                <button
                  type='button'
                  onClick={copy}
                  title='Copy code'
                  className='text-tx-tertiary hover:text-tx-secondary border-st-secondary flex shrink-0 cursor-pointer items-center gap-1.5 border-l px-3 py-2.5 text-xs transition-colors duration-150'
                >
                  <IconCopy width={14} height={14} />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className='h-[340px] overflow-auto bg-white p-4'>
                <pre className='text-tx font-mono text-[12px] leading-[180%] whitespace-pre md:text-[13px]'>
                  {highlight(CODE_SNIPPETS[language])}
                </pre>
              </div>
            </div>
          </div>

          <div className='pointer-events-none absolute right-0 bottom-0 left-0 flex h-fit flex-col justify-end bg-[linear-gradient(to_top,var(--color-sr-indigo-100)_0%,var(--color-sr-indigo-50)_50%,transparent_100%)]'>
            <div className='pointer-events-auto p-12 pt-40'>
              <BlurButton href='/auth/sign-up' className='w-full'>
                Get your API key
              </BlurButton>
            </div>
          </div>
        </div>

        {/* Model cards */}
        <div className='grid grid-cols-2 gap-2'>
          {FEATURE_CARDS.map((card, index) => {
            const Icon = FEATURE_ICONS[index];
            const featured = index === 0;
            return (
              <a
                key={card.title}
                href={card.href}
                className={cn(
                  'group relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-6 text-left transition-colors duration-150 md:p-8',
                  featured ? 'border-sr-indigo-200' : 'border-st-secondary/50'
                )}
              >
                <span
                  aria-hidden='true'
                  className={cn(
                    'pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full transition-all duration-500 ease-out',
                    featured
                      ? 'scale-100 opacity-100'
                      : 'scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100'
                  )}
                  style={{
                    background:
                      'radial-gradient(circle, var(--color-sr-indigo-200) 0%, transparent 70%)'
                  }}
                />
                <Icon
                  width={22}
                  height={22}
                  className={featured ? 'text-sr-indigo-600' : 'text-tx-tertiary'}
                />
                <div className='mt-3 flex flex-col gap-1'>
                  <span
                    className={cn(
                      'font-matter text-base leading-snug font-medium',
                      featured ? 'text-tx' : 'text-tx-secondary'
                    )}
                  >
                    {card.title}
                  </span>
                  <span className='font-matter text-tx-tertiary text-sm'>{card.description}</span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Footnote cards */}
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
          <div className='border-st-secondary/50 flex flex-col gap-1.5 overflow-hidden rounded-xl border bg-white p-4 md:gap-2 md:p-6'>
            <span className='font-matter text-tx text-base font-medium'>REST API</span>
            <p className='font-matter text-tx-tertiary text-sm'>
              One endpoint per metric, cursor paginated
            </p>
          </div>
          <div className='border-st-secondary/50 flex flex-col gap-1.5 overflow-hidden rounded-xl border bg-white p-4 md:gap-2 md:p-6'>
            <span className='font-matter text-tx text-base font-medium'>Typed SDKs</span>
            <p className='font-matter text-tx-tertiary text-sm'>
              One line to install{' '}
              <code className='text-tx-secondary hover:text-sr-indigo-600 cursor-pointer font-mono text-[11px] underline underline-offset-2 transition-colors duration-150'>
                npm i @channeliq/sdk
              </code>
            </p>
          </div>
          <div className='border-st-secondary/50 flex flex-col gap-1.5 overflow-hidden rounded-xl border bg-white p-4 md:gap-2 md:p-6'>
            <span className='font-matter text-tx text-base font-medium'>Webhooks</span>
            <p className='font-matter text-tx-tertiary text-sm'>
              Push anomalies straight to your tools
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
