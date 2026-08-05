'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/youtube/metrics';
import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';

import { watchFeedOptions } from '../api/queries';
import { CoverageNotice } from './coverage-notice';
import type { WatchEvent } from '../api/types';

function relativeTime(iso: string): string {
  const hours = (Date.now() - Date.parse(iso)) / 36e5;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function WatchView() {
  // Read-only here: the sidebar switcher owns writing this param, and views
  // only need to know which scope to query.
  const [workspaceParam] = useQueryState('ws', parseAsString.withDefault('all'));

  const { data, isPending, isError, error } = useQuery(watchFeedOptions(workspaceParam));

  return (
    <div className='flex flex-col gap-6'>
      {isError && <p className='text-destructive text-sm'>{(error as Error).message}</p>}

      {isPending ? (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className='h-14' />
          ))}
        </div>
      ) : (
        data && (
          <>
            <CoverageNotice failed={data.failed} total={data.channelCount} />

            <p className='text-muted-foreground text-sm'>
              {data.uploadCount} uploads in the last {data.windowHours}h and {data.editCount}{' '}
              detected edit{data.editCount === 1 ? '' : 's'} across {data.channelCount} channels.
            </p>

            {data.growth.length > 0 && (
              <Card>
                <CardContent className='flex flex-col gap-2 py-6'>
                  <h3 className='font-medium'>Subscriber movement</h3>
                  <p className='text-muted-foreground text-sm'>
                    Only changes larger than YouTube&apos;s display rounding are shown.
                  </p>
                  <ul className='mt-2 flex flex-col gap-1.5'>
                    {data.growth.map((row) => (
                      <li key={row.channelLabel} className='flex justify-between text-sm'>
                        <span className='truncate'>{row.channelLabel}</span>
                        <span className='text-chart-3 shrink-0 tabular-nums'>
                          +{formatCompact(row.subscribers)} · {row.spanHours}h
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className='flex flex-col divide-y py-0'>
                {data.events.map((event, index) => (
                  <EventRow key={`${event.kind}-${event.at}-${index}`} event={event} />
                ))}
                {data.events.length === 0 && (
                  <p className='text-muted-foreground py-8 text-center text-sm'>
                    No activity in the last {data.windowHours} hours.
                  </p>
                )}
              </CardContent>
            </Card>

            <p className='text-muted-foreground text-xs'>
              Edits are detected by comparing snapshots taken when a channel is viewed, so an empty
              list means &ldquo;not yet observed&rdquo; rather than &ldquo;nothing changed&rdquo;.
              YouTube does not expose a creator&apos;s own A/B tests to anyone else — a title swap
              on a live video is the closest observable signal.
            </p>
          </>
        )
      )}
    </div>
  );
}

function EventRow({ event }: { event: WatchEvent }) {
  if (event.kind === 'edit') {
    return (
      <div className='flex items-start gap-3 py-3'>
        <Badge variant='outline' className='bg-chart-1/15 text-chart-1 border-chart-1/30 shrink-0'>
          {event.field} swap
        </Badge>
        <div className='min-w-0 flex-1'>
          <p className='text-sm'>
            <span className='text-muted-foreground line-through'>{event.previousValue}</span>
            <br />
            <a
              href={event.url}
              target='_blank'
              rel='noopener noreferrer'
              className='hover:underline'
            >
              {event.newValue}
            </a>
          </p>
          <p className='text-muted-foreground mt-1 text-xs'>
            {event.channelLabel}
            {event.viewsAtChange !== null &&
              ` · at ${formatCompact(event.viewsAtChange)} views`} ·{' '}
            {relativeTime(event.at)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-3 py-3'>
      {event.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.thumbnail}
          alt=''
          className='bg-muted h-10 w-[70px] shrink-0 rounded object-cover'
          loading='lazy'
        />
      ) : (
        <div className='bg-muted h-10 w-[70px] shrink-0 rounded' />
      )}

      <div className='min-w-0 flex-1'>
        <a
          href={event.url}
          target='_blank'
          rel='noopener noreferrer'
          className='block truncate text-sm hover:underline'
        >
          {event.title}
        </a>
        <p className='text-muted-foreground truncate text-xs'>
          <span className={cn(event.isOwn && 'text-foreground font-medium')}>
            {event.channelLabel}
          </span>
          {event.format && ` · ${event.format}`}
          {event.intent !== 'Teaching' && ` · ${event.intent}`} · {relativeTime(event.at)}
        </p>
      </div>

      {event.outlierScore !== null && (
        <Badge variant='outline' className='shrink-0 tabular-nums'>
          {event.outlierScore}×
        </Badge>
      )}
      <span className='text-muted-foreground hidden shrink-0 text-xs tabular-nums sm:block'>
        {formatCompact(event.views)}
      </span>
    </div>
  );
}
