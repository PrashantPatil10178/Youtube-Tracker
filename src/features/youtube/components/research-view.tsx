'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/youtube/metrics';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { researchKeywords } from '../api/service';
import type { KeywordResearch } from '../api/types';

const PRESETS = [
  'class 10 maharashtra board science',
  'class 9 maharashtra board maths',
  'mht cet 2027 preparation',
  'hsc board 2027 physics'
];

export function ResearchView() {
  const [seed, setSeed] = useState('');

  const research = useMutation({
    mutationFn: (query: string) => researchKeywords(query)
  });

  const run = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSeed(trimmed);
    research.mutate(trimmed);
  };

  const results = research.data?.results ?? [];

  return (
    <div className='flex flex-col gap-6'>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(seed);
        }}
        className='flex flex-col gap-3'
      >
        <div className='flex flex-wrap gap-2'>
          <Input
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            placeholder='A topic your audience searches for…'
            aria-label='Seed keyword'
            className='max-w-md'
          />
          <Button type='submit' disabled={research.isPending || !seed.trim()}>
            {research.isPending ? 'Researching…' : 'Research'}
          </Button>
        </div>

        <div className='flex flex-wrap gap-1.5'>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type='button'
              onClick={() => run(preset)}
              className='text-muted-foreground hover:bg-muted rounded-full border px-2.5 py-1 text-xs transition-colors'
            >
              {preset}
            </button>
          ))}
        </div>
      </form>

      {research.isError && (
        <p className='text-destructive text-sm'>{(research.error as Error).message}</p>
      )}

      {research.isPending && (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-24' />
          ))}
        </div>
      )}

      {research.isSuccess && (
        <>
          <p className='text-muted-foreground text-sm'>
            {results.length} keyword{results.length === 1 ? '' : 's'} analysed from{' '}
            {research.data.suggestions.length} autocomplete suggestions for “{research.data.seed}”.
          </p>

          <div className='flex flex-col gap-3'>
            {results.map((result) => (
              <KeywordCard key={result.keyword} result={result} />
            ))}
          </div>

          <Card>
            <CardContent className='flex flex-col gap-2 py-6'>
              <p className='text-muted-foreground text-xs tracking-wide uppercase'>
                How to read this
              </p>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                <span className='text-foreground font-medium'>
                  YouTube does not publish search volume
                </span>
                , so none is shown here. Every figure is measured from what actually ranks:{' '}
                <span className='text-foreground'>demand</span> is the median views of the top
                results, <span className='text-foreground'>entry bar</span> is the weakest top-10
                result, and <span className='text-foreground'>concentration</span> is the share held
                by the single biggest channel. A topic with high demand, a low entry bar and many
                distinct channels is the one worth entering.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KeywordCard({ result }: { result: KeywordResearch }) {
  const open = result.distinctChannels >= 10 && result.topChannelShare <= 25;
  const locked = result.distinctChannels <= 5 || result.topChannelShare >= 40;

  return (
    <Card>
      <CardContent className='flex flex-col gap-4 py-5'>
        <div className='flex flex-wrap items-baseline justify-between gap-2'>
          <p className='font-medium'>{result.keyword}</p>
          {open && (
            <Badge className='bg-chart-3/15 text-chart-3 border-chart-3/30'>Open field</Badge>
          )}
          {locked && !open && <Badge variant='outline'>Concentrated</Badge>}
        </div>

        <div className='grid grid-cols-2 gap-4 sm:grid-cols-5'>
          <Metric label='Demand' value={formatCompact(result.demandProxy)} hint='median views' />
          <Metric
            label='Entry bar'
            value={formatCompact(result.entryBarProxy)}
            hint='weakest top-10'
          />
          <Metric
            label='Channels'
            value={String(result.distinctChannels)}
            hint={`top holds ${result.topChannelShare}%`}
            tone={open ? 'good' : locked ? 'weak' : undefined}
          />
          <Metric label='Fresh' value={`${result.freshShare}%`} hint='under 30 days' />
          <Metric
            label='Competing'
            value={formatCompact(result.estimatedResults)}
            hint='matching videos'
          />
        </div>

        {(result.dominantFormat || result.dominantIntent) && (
          <p className='text-muted-foreground text-xs'>
            What ranks here:{' '}
            {[result.dominantFormat, result.dominantIntent].filter(Boolean).join(' · ')}
          </p>
        )}

        <ul className='flex flex-col divide-y border-t pt-2'>
          {result.videos.slice(0, 3).map((video) => (
            <li key={video.videoId} className='flex items-center gap-3 py-2'>
              <div className='min-w-0 flex-1'>
                <a
                  href={video.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='block truncate text-sm hover:underline'
                >
                  {video.title}
                </a>
                <p className='text-muted-foreground truncate text-xs'>
                  {video.channel}
                  {video.publishedText && ` · ${video.publishedText}`}
                  {video.isShort && ' · Short'}
                </p>
              </div>
              <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                {formatCompact(video.views)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'good' | 'weak';
}) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-muted-foreground text-xs'>{label}</span>
      <span
        className={cn(
          'text-lg font-medium tabular-nums',
          tone === 'good' && 'text-chart-3',
          tone === 'weak' && 'text-destructive'
        )}
      >
        {value}
      </span>
      {hint && <span className='text-muted-foreground text-[11px]'>{hint}</span>}
    </div>
  );
}
