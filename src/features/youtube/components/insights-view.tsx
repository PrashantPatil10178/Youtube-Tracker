'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';

import { workspaceInsightsOptions } from '../api/queries';
import { CoverageNotice } from './coverage-notice';
import type { InsightAxis, InsightBucket, WorkspaceInsights } from '../api/types';

const AXES: Array<{ key: 'format' | 'intent' | 'subject' | 'exam'; title: string; hint: string }> =
  [
    { key: 'format', title: 'Format', hint: 'How the video is taught' },
    { key: 'intent', title: 'Intent', hint: 'Why the video exists' },
    { key: 'subject', title: 'Subject', hint: 'What it covers' },
    { key: 'exam', title: 'Exam', hint: 'Which exam it targets' }
  ];

export function InsightsView() {
  // Read-only here: the sidebar switcher owns writing this param, and views
  // only need to know which scope to query.
  const [workspaceParam] = useQueryState('ws', parseAsString.withDefault('all'));

  const { data, isPending, isError, error } = useQuery(workspaceInsightsOptions(workspaceParam));

  return (
    <div className='flex flex-col gap-6'>
      {isError && <p className='text-destructive text-sm'>{(error as Error).message}</p>}

      {isPending ? (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-64' />
          ))}
        </div>
      ) : (
        data && (
          <>
            <CoverageNotice failed={data.failed} total={data.channelCount} />

            <p className='text-muted-foreground text-sm'>
              {data.sampleSize} mature videos across {data.channelCount} channels. A score of 1.0
              means typical for that channel; buckets under {data.minBucket} videos are listed but
              not ranked.
            </p>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              {AXES.map((axis) => (
                <AxisCard
                  key={axis.key}
                  title={axis.title}
                  hint={axis.hint}
                  axis={data[axis.key]}
                />
              ))}
            </div>

            <MixCard mix={data.contentMix} />

            <Card>
              <CardContent className='flex flex-col gap-3 py-6'>
                <div>
                  <h3 className='font-medium'>Biggest outperformers</h3>
                  <p className='text-muted-foreground text-sm'>
                    The videos that most beat their own channel&apos;s median.
                  </p>
                </div>
                <ul className='flex flex-col divide-y'>
                  {data.top.map((video) => (
                    <li key={video.url} className='flex items-center gap-3 py-2'>
                      <Badge
                        variant='outline'
                        className='bg-chart-3/15 text-chart-3 shrink-0 tabular-nums'
                      >
                        {video.score}×
                      </Badge>
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
                          {video.channelLabel}
                          {video.format && ` · ${video.format}`}
                          {video.intent !== 'Teaching' && ` · ${video.intent}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
}

function AxisCard({ title, hint, axis }: { title: string; hint: string; axis: InsightAxis }) {
  // Bars are scaled to the strongest bucket rather than to an absolute range,
  // so the comparison stays readable whether the spread is 3x or 1.2x.
  const max = Math.max(...axis.ranked.map((b) => b.median), 1);

  return (
    <Card>
      <CardContent className='flex flex-col gap-4 py-6'>
        <div>
          <h3 className='font-medium'>{title}</h3>
          <p className='text-muted-foreground text-sm'>{hint}</p>
        </div>

        <ul className='flex flex-col gap-2.5'>
          {axis.ranked.map((bucket) => (
            <BucketRow key={bucket.key} bucket={bucket} max={max} />
          ))}
        </ul>

        {axis.thin.length > 0 && (
          <p className='text-muted-foreground text-xs'>
            Too few to rank: {axis.thin.map((b) => `${b.key} (${b.count})`).join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BucketRow({ bucket, max }: { bucket: InsightBucket; max: number }) {
  const strong = bucket.median >= 1.25;
  const weak = bucket.median < 0.85;

  return (
    <li className='flex flex-col gap-1'>
      <div className='flex items-baseline justify-between gap-2 text-sm'>
        <span className='truncate'>{bucket.key}</span>
        <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
          <span
            className={cn(
              'font-medium',
              strong && 'text-chart-3',
              weak && 'text-destructive',
              !strong && !weak && 'text-foreground'
            )}
          >
            {bucket.median}×
          </span>{' '}
          · n={bucket.count} · {bucket.share}%
        </span>
      </div>
      <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
        <div
          className={cn(
            'h-full rounded-full',
            strong ? 'bg-chart-3' : weak ? 'bg-destructive/60' : 'bg-chart-1'
          )}
          style={{ width: `${Math.max((bucket.median / max) * 100, 2)}%` }}
        />
      </div>
    </li>
  );
}

function MixCard({ mix }: { mix: WorkspaceInsights['contentMix'] }) {
  return (
    <Card>
      <CardContent className='flex flex-col gap-4 py-6'>
        <div>
          <h3 className='font-medium'>What you publish vs what they publish</h3>
          <p className='text-muted-foreground text-sm'>
            Share of output by format — your {mix.ownSample} videos against {mix.rivalSample} from
            everyone else.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
          {(
            [
              ['Yours', mix.own],
              ['Everyone else', mix.rival]
            ] as const
          ).map(([label, rows]) => (
            <div key={label} className='flex flex-col gap-2'>
              <p className='text-muted-foreground text-xs tracking-wide uppercase'>{label}</p>
              {rows.map((row) => (
                <div key={row.key} className='flex flex-col gap-1'>
                  <div className='flex items-baseline justify-between text-sm'>
                    <span className='truncate'>{row.key}</span>
                    <span className='text-muted-foreground text-xs tabular-nums'>{row.share}%</span>
                  </div>
                  <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
                    <div
                      className='bg-chart-1 h-full rounded-full'
                      style={{ width: `${row.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
