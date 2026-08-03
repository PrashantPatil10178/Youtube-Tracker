'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/youtube/metrics';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';

import { workspaceInsightsOptions, workspaceVideosOptions } from '../api/queries';
import type { WorkspaceVideo } from '../api/types';
import { ChannelShareChart } from './channel-share-chart';
import { CoverageNotice } from './coverage-notice';
import { UploadActivityChart } from './upload-activity-chart';

/** Recent enough that a breakout is still worth reacting to. */
const RECENT_DAYS = 7;

export function OverviewView() {
  // Read-only here: the sidebar switcher owns writing this param, and views
  // only need to know which scope to query.
  const [workspaceParam] = useQueryState('ws', parseAsString.withDefault('all'));

  const videos = useQuery(workspaceVideosOptions(workspaceParam));
  const insights = useQuery(workspaceInsightsOptions(workspaceParam));

  const recent = useMemo(() => {
    const cutoff = Date.now() - RECENT_DAYS * 24 * 36e5;
    return (videos.data?.videos ?? []).filter((v) => Date.parse(v.publishedAt) >= cutoff);
  }, [videos.data]);

  const breakouts = useMemo(
    () =>
      recent
        .filter((v) => (v.outlierScore ?? 0) >= 2)
        .toSorted((a, b) => (b.outlierScore ?? 0) - (a.outlierScore ?? 0)),
    [recent]
  );

  // Own channels are identified from the insights content mix, which already
  // knows which rows are the user's; falling back to none keeps the chart
  // rendering rather than blocking on the slower query.
  const ownLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const video of videos.data?.videos ?? []) {
      if (/easylearning|shubham jha/i.test(video.channelLabel)) labels.add(video.channelLabel);
    }
    return labels;
  }, [videos.data]);

  const subscribersByChannel = useMemo(
    () => new Map(videos.data?.subscribers ?? []),
    [videos.data]
  );

  const bestFormat = insights.data?.format.ranked[0];
  const worstFormat = insights.data?.format.ranked.at(-1);

  // The gap that matters: your biggest output category versus how it performs.
  const ownTopFormat = insights.data?.contentMix.own[0];
  const ownTopFormatScore = insights.data?.format.ranked.find(
    (b) => b.key === ownTopFormat?.key
  )?.median;

  // Only the video query gates the page. Insights is the slow one and only
  // feeds the "Where you stand" line, which renders when it arrives.
  const loading = videos.isPending;

  return (
    <div className='flex flex-col gap-6'>
      {!loading && (
        <CoverageNotice failed={videos.data?.failed ?? []} total={videos.data?.channelCount} />
      )}

      {loading ? (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-28' />
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Kpi
            label='Channels tracked'
            value={String(videos.data?.channelCount ?? 0)}
            hint={`${insights.data?.sampleSize ?? 0} scored videos`}
          />
          <Kpi
            label={`Uploads · last ${RECENT_DAYS}d`}
            value={String(recent.length)}
            hint='across the workspace'
          />
          <Kpi
            label='Breakouts'
            value={String(breakouts.length)}
            hint='2× their channel median'
            tone={breakouts.length > 0 ? 'good' : undefined}
          />
          <Kpi
            label='Best format'
            value={bestFormat ? `${bestFormat.median}×` : '—'}
            hint={bestFormat ? `${bestFormat.key} · n=${bestFormat.count}` : 'not enough data'}
            tone='good'
          />
        </div>
      )}

      {ownTopFormat && ownTopFormatScore !== undefined && (
        <Card>
          <CardContent className='flex flex-col gap-2 py-6'>
            <p className='text-muted-foreground text-xs tracking-wide uppercase'>Where you stand</p>
            <p className='text-sm leading-relaxed'>
              <span className='font-medium'>{ownTopFormat.share}%</span> of your output is{' '}
              <span className='font-medium'>{ownTopFormat.key}</span>, which performs at{' '}
              <span
                className={cn(
                  'font-medium',
                  ownTopFormatScore >= 1.25
                    ? 'text-chart-3'
                    : ownTopFormatScore < 0.85
                      ? 'text-destructive'
                      : ''
                )}
              >
                {ownTopFormatScore}×
              </span>
              {bestFormat && bestFormat.key !== ownTopFormat.key && (
                <>
                  , while <span className='font-medium'>{bestFormat.key}</span> performs at{' '}
                  <span className='text-chart-3 font-medium'>{bestFormat.median}×</span> across the
                  workspace.
                </>
              )}
            </p>
            {worstFormat && (
              <p className='text-muted-foreground text-xs'>
                Weakest format here: {worstFormat.key} at {worstFormat.median}× (n=
                {worstFormat.count}).{' '}
                <Link href='/dashboard/insights' className='underline'>
                  See full benchmarks
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && videos.data && (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          <ChannelShareChart
            videos={videos.data.videos}
            subscribersByChannel={subscribersByChannel}
          />
          <UploadActivityChart videos={videos.data.videos} ownLabels={ownLabels} />
        </div>
      )}

      <Card>
        <CardContent className='flex flex-col gap-3 py-6'>
          <div className='flex items-baseline justify-between gap-2'>
            <div>
              <h3 className='font-medium'>Breakouts this week</h3>
              <p className='text-muted-foreground text-sm'>
                Recent uploads beating their own channel&apos;s median by 2× or more.
              </p>
            </div>
            <Link href='/dashboard/videos' className='text-muted-foreground text-sm underline'>
              All videos
            </Link>
          </div>

          {loading ? (
            <div className='flex flex-col gap-2'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-12' />
              ))}
            </div>
          ) : breakouts.length === 0 ? (
            <p className='text-muted-foreground py-6 text-center text-sm'>
              No breakouts in the last {RECENT_DAYS} days.
            </p>
          ) : (
            <ul className='flex flex-col divide-y'>
              {breakouts.slice(0, 8).map((video) => (
                <BreakoutRow key={`${video.channelId}-${video.videoId}`} video={video} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'good';
}) {
  return (
    <Card>
      <CardContent className='flex flex-col gap-1 py-6'>
        <span className='text-muted-foreground text-xs'>{label}</span>
        <span
          className={cn('text-2xl font-medium tabular-nums', tone === 'good' && 'text-chart-3')}
        >
          {value}
        </span>
        {hint && <span className='text-muted-foreground text-[11px]'>{hint}</span>}
      </CardContent>
    </Card>
  );
}

function BreakoutRow({ video }: { video: WorkspaceVideo }) {
  return (
    <li className='flex items-center gap-3 py-2'>
      <Badge
        variant='outline'
        className='bg-chart-3/15 text-chart-3 border-chart-3/30 shrink-0 tabular-nums'
      >
        {video.outlierScore}×{video.provisional ? '*' : ''}
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
      <span className='text-muted-foreground hidden shrink-0 text-xs tabular-nums sm:block'>
        {formatCompact(video.views)} views
      </span>
    </li>
  );
}
