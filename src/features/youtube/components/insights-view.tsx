'use client';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { workspaceInsightsOptions } from '../api/queries';
import { CoverageNotice } from './coverage-notice';
import type { InsightAxis, InsightBucket, WorkspaceInsights } from '../api/types';

const AXES: Array<{
  key: 'format' | 'intent' | 'subject' | 'exam';
  title: string;
  hint: string;
  icon: keyof typeof Icons;
  /** How this axis's top bucket reads as a sentence in the headline banner. */
  phrase: (key: string) => string;
}> = [
  {
    key: 'format',
    title: 'Format',
    hint: 'How the video is taught',
    icon: 'video',
    phrase: (key) => `${key} is this workspace's strongest format`
  },
  {
    key: 'intent',
    title: 'Intent',
    hint: 'Why the video exists',
    icon: 'info',
    phrase: (key) => `${key} videos are this workspace's strongest intent`
  },
  {
    key: 'subject',
    title: 'Subject',
    hint: 'What it covers',
    icon: 'post',
    phrase: (key) => `${key} is this workspace's strongest subject`
  },
  {
    key: 'exam',
    title: 'Exam',
    hint: 'Which exam it targets',
    icon: 'badgeCheck',
    phrase: (key) => `${key}-targeted videos are this workspace's strongest exam angle`
  }
];

/** Below this a top bucket is barely above typical — not worth leading with. */
const HEADLINE_THRESHOLD = 1.15;

export function InsightsView() {
  // Read-only here: the sidebar switcher owns writing this param, and views
  // only need to know which scope to query.
  const [workspaceParam] = useQueryState('ws', parseAsString.withDefault('all'));

  const { data, isPending, isError, error } = useQuery(workspaceInsightsOptions(workspaceParam));

  // The single most characteristic finding across all four axes, if any axis
  // clears the bar — a workspace with no standout bucket gets no banner rather
  // than a hollow "1.0x is your strongest format".
  const headline = useMemo(() => {
    if (!data) return null;
    const candidates = AXES.map((axis) => ({ axis, bucket: data[axis.key].ranked[0] })).filter(
      (c): c is { axis: (typeof AXES)[number]; bucket: InsightBucket } => Boolean(c.bucket)
    );
    if (candidates.length === 0) return null;
    const top = candidates.toSorted((a, b) => b.bucket.median - a.bucket.median)[0];
    return top.bucket.median >= HEADLINE_THRESHOLD ? top : null;
  }, [data]);

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

            {headline && (
              <Card className='border-chart-3/30 bg-chart-3/6'>
                <CardContent className='flex items-start gap-3 py-5'>
                  <div className='bg-chart-3/15 flex size-9 shrink-0 items-center justify-center rounded-full'>
                    <Icons.trendingUp className='text-chart-3 size-4.5' />
                  </div>
                  <div>
                    <p className='text-sm font-medium'>
                      {headline.axis.phrase(headline.bucket.key)}
                    </p>
                    <p className='text-muted-foreground text-sm'>
                      <span className='text-chart-3 font-medium tabular-nums'>
                        {headline.bucket.median}×
                      </span>{' '}
                      the channel median across n={headline.bucket.count} videos (
                      {headline.bucket.share}% of the sample).
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              {AXES.map((axis) => (
                <AxisCard
                  key={axis.key}
                  title={axis.title}
                  hint={axis.hint}
                  icon={axis.icon}
                  axis={data[axis.key]}
                />
              ))}
            </div>

            <MixChart mix={data.contentMix} />

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

function AxisCard({
  title,
  hint,
  icon,
  axis
}: {
  title: string;
  hint: string;
  icon: keyof typeof Icons;
  axis: InsightAxis;
}) {
  // Bars are scaled to the strongest bucket rather than to an absolute range,
  // so the comparison stays readable whether the spread is 3x or 1.2x.
  const max = Math.max(...axis.ranked.map((b) => b.median), 1);
  const Icon = Icons[icon];

  return (
    <Card>
      <CardContent className='flex flex-col gap-4 py-6'>
        <div className='flex items-center gap-2.5'>
          <div className='bg-muted flex size-8 shrink-0 items-center justify-center rounded-md'>
            <Icon className='text-muted-foreground size-4' />
          </div>
          <div>
            <h3 className='font-medium'>{title}</h3>
            <p className='text-muted-foreground text-sm'>{hint}</p>
          </div>
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

const MIX_CONFIG = {
  yours: { label: 'Yours', color: 'var(--chart-1)' },
  rival: { label: 'Everyone else', color: 'var(--chart-2)' }
} satisfies ChartConfig;

function MixChart({ mix }: { mix: WorkspaceInsights['contentMix'] }) {
  // `own` and `rival` are each independently sliced to their own top formats,
  // so the two sets of keys can differ — union them and fill in 0 rather than
  // silently dropping a format one side doesn't use.
  const rows = useMemo(() => {
    const ownByKey = new Map(mix.own.map((r) => [r.key, r.share]));
    const rivalByKey = new Map(mix.rival.map((r) => [r.key, r.share]));
    const keys = new Set([...ownByKey.keys(), ...rivalByKey.keys()]);

    return [...keys]
      .map((key) => ({
        key,
        yours: ownByKey.get(key) ?? 0,
        rival: rivalByKey.get(key) ?? 0
      }))
      .toSorted((a, b) => b.yours + b.rival - (a.yours + a.rival))
      .slice(0, 8);
  }, [mix]);

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

        <ChartContainer config={MIX_CONFIG} className='max-h-80 w-full'>
          <BarChart data={rows} layout='vertical' margin={{ left: 4 }}>
            <CartesianGrid horizontal={false} strokeDasharray='3 3' />
            <XAxis
              type='number'
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              type='category'
              dataKey='key'
              tickLine={false}
              axisLine={false}
              width={100}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)' }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `${value}%`,
                    name === 'yours' ? 'Yours' : 'Everyone else'
                  ]}
                />
              }
            />
            <Bar dataKey='yours' fill='var(--color-yours)' radius={3} />
            <Bar dataKey='rival' fill='var(--color-rival)' radius={3} />
          </BarChart>
        </ChartContainer>

        <div className='flex items-center gap-4 text-xs'>
          <span className='flex items-center gap-1.5'>
            <span className='bg-chart-1 size-2.5 shrink-0 rounded-[3px]' />
            <span className='text-muted-foreground'>Yours</span>
          </span>
          <span className='flex items-center gap-1.5'>
            <span className='bg-chart-2 size-2.5 shrink-0 rounded-[3px]' />
            <span className='text-muted-foreground'>Everyone else</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
