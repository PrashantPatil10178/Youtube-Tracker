'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompact } from '@/lib/youtube/metrics';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

import { channelAnalyticsOptions } from '../api/queries';
import type { RosterChannel, RosterGroup } from '../config/roster';
import { ChannelSettings } from './channel-settings';
import { ChannelDigest } from './channel-digest';
import type { ScoredVideo } from '../api/types';

const PERFORMANCE_STYLES: Record<string, string> = {
  breakout: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  over: 'bg-chart-1/15 text-chart-1 border-chart-1/30',
  typical: 'bg-muted text-muted-foreground',
  under: 'bg-destructive/10 text-destructive border-destructive/25'
};

export function ChannelCard({
  query,
  note,
  channel: tracked,
  busy,
  onUpdate,
  onRemove
}: {
  query: string;
  /** Why this channel is tracked — rendered under the handle. */
  note?: string;
  /** The stored record, for the filing controls. */
  channel?: RosterChannel;
  busy?: boolean;
  onUpdate?: (patch: { group?: RosterGroup }) => void;
  onRemove: () => void;
}) {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(
    channelAnalyticsOptions(query)
  );

  if (isPending) return <ChannelCardSkeleton />;

  if (isError) {
    return (
      <Card>
        <CardContent className='flex flex-col gap-3 py-6'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='font-medium'>{query}</p>
              <p className='text-destructive mt-1 text-sm'>{error.message}</p>
            </div>
            <Button variant='ghost' size='sm' onClick={onRemove}>
              Remove
            </Button>
          </div>
          <div>
            <Button variant='outline' size='sm' onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { channel, baseline, cadenceDays, projection, breakouts, videos, delta, recentChanges } =
    data;
  const latest = videos[0];

  return (
    <Card>
      <CardContent className='flex flex-col gap-5 py-6'>
        <div className='flex items-start gap-4'>
          {channel.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.avatar}
              alt=''
              className='size-12 shrink-0 rounded-full object-cover'
              loading='lazy'
            />
          ) : (
            <div className='bg-muted size-12 shrink-0 rounded-full' />
          )}

          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <p className='truncate font-medium'>{channel.title}</p>
              {isFetching && <span className='text-muted-foreground text-xs'>updating…</span>}
            </div>
            <p className='text-muted-foreground truncate text-sm'>
              {channel.handle ?? channel.channelId}
            </p>
            {note && <p className='text-muted-foreground truncate text-xs'>{note}</p>}
          </div>

          <div className='flex shrink-0 items-center gap-1'>
            {tracked && onUpdate && (
              <ChannelSettings channel={tracked} onUpdate={onUpdate} disabled={busy} />
            )}
            <Button variant='ghost' size='sm' onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
          <Stat
            label='Subscribers'
            value={formatCompact(channel.subscribers)}
            hint={
              delta
                ? `${(delta.subscribers ?? 0) >= 0 ? '+' : ''}${formatCompact(delta.subscribers)} in ${delta.spanHours}h`
                : 'tracking started'
            }
          />
          <Stat label='Total views' value={formatCompact(channel.totalViews)} />
          <Stat label='Videos' value={formatCompact(channel.videoCount)} />
          <Stat
            label='Upload cadence'
            value={cadenceDays === null ? '—' : `${cadenceDays}d`}
            hint='median gap'
          />
        </div>

        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
          <Stat
            label='Typical video'
            value={formatCompact(baseline.medianViews)}
            hint={baseline.reliable ? `median of ${baseline.sampleSize}` : 'not enough data'}
          />
          <Stat
            label='Projected 30d'
            value={formatCompact(projection.next30?.projected ?? null)}
            hint={projection.next30 ? `${formatCompact(projection.next30.perDay)}/day` : undefined}
          />
          <Stat label='Breakouts' value={String(breakouts.length)} hint='vs own baseline' />
        </div>

        {latest && (
          <div className='border-t pt-4'>
            <p className='text-muted-foreground mb-3 text-xs tracking-wide uppercase'>
              Recent uploads
            </p>
            <ul className='flex flex-col gap-2'>
              {videos.slice(0, 4).map((video) => (
                <VideoRow key={video.videoId} video={video} />
              ))}
            </ul>
          </div>
        )}

        {recentChanges.length > 0 && (
          <div className='border-t pt-4'>
            <p className='text-muted-foreground mb-3 text-xs tracking-wide uppercase'>
              Detected edits
            </p>
            <ul className='flex flex-col gap-2'>
              {recentChanges.slice(0, 3).map((change) => (
                <li key={change.id} className='text-xs'>
                  <Badge variant='outline' className='mr-2'>
                    {change.field}
                  </Badge>
                  {change.field === 'title' ? (
                    <span className='text-muted-foreground'>
                      <span className='line-through'>{change.previousValue}</span> →{' '}
                      <span className='text-foreground'>{change.newValue}</span>
                    </span>
                  ) : (
                    <span className='text-muted-foreground'>
                      thumbnail swapped at {formatCompact(change.viewsAtChange)} views
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <ChannelDigest query={query} />
      </CardContent>
    </Card>
  );
}

function VideoRow({ video }: { video: ScoredVideo }) {
  return (
    <li className='flex items-center gap-3'>
      {video.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnail}
          alt=''
          className='bg-muted h-9 w-16 shrink-0 rounded object-cover'
          loading='lazy'
        />
      ) : (
        <div className='bg-muted h-9 w-16 shrink-0 rounded' />
      )}

      <div className='min-w-0 flex-1'>
        <a
          href={video.url ?? '#'}
          target='_blank'
          rel='noopener noreferrer'
          className='block truncate text-sm hover:underline'
        >
          {video.title}
        </a>
        <p className='text-muted-foreground text-xs tabular-nums'>
          {formatCompact(video.views)} views · {formatCompact(video.vph)}/hr
        </p>
      </div>

      {video.performance && (
        <Badge
          variant='outline'
          className={cn('shrink-0 tabular-nums', PERFORMANCE_STYLES[video.performance])}
          title={
            video.provisional
              ? 'Too new to judge on total views — scored on velocity instead'
              : 'Versus this channel’s median video'
          }
        >
          {video.outlierScore}×{video.provisional ? '*' : ''}
        </Badge>
      )}
    </li>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-muted-foreground text-xs'>{label}</span>
      <span className='text-lg font-medium tabular-nums'>{value}</span>
      {hint && <span className='text-muted-foreground text-[11px]'>{hint}</span>}
    </div>
  );
}

function ChannelCardSkeleton() {
  return (
    <Card>
      <CardContent className='flex flex-col gap-5 py-6'>
        <div className='flex items-center gap-4'>
          <Skeleton className='size-12 rounded-full' />
          <div className='flex flex-1 flex-col gap-2'>
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-3 w-24' />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-12' />
          ))}
        </div>
        <Skeleton className='h-24' />
      </CardContent>
    </Card>
  );
}
