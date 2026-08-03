'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/youtube/metrics';
import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';

import { workspaceVideosOptions } from '../api/queries';
import { CoverageNotice } from './coverage-notice';
import type { WorkspaceVideo } from '../api/types';

const SORTS = {
  recent: {
    label: 'Newest',
    compare: (a: WorkspaceVideo, b: WorkspaceVideo) =>
      Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  },
  outlier: {
    label: 'Outlier score',
    compare: (a: WorkspaceVideo, b: WorkspaceVideo) =>
      (b.outlierScore ?? -1) - (a.outlierScore ?? -1)
  },
  views: {
    label: 'Views',
    compare: (a: WorkspaceVideo, b: WorkspaceVideo) => (b.views ?? 0) - (a.views ?? 0)
  },
  vph: {
    label: 'Views/hour',
    compare: (a: WorkspaceVideo, b: WorkspaceVideo) => (b.vph ?? 0) - (a.vph ?? 0)
  }
} as const;

type SortKey = keyof typeof SORTS;

const PERFORMANCE_STYLES: Record<string, string> = {
  breakout: 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  over: 'bg-chart-1/15 text-chart-1 border-chart-1/30',
  typical: 'bg-muted text-muted-foreground',
  under: 'bg-destructive/10 text-destructive border-destructive/25'
};

export function VideosView() {
  // Read-only here: the sidebar switcher owns writing this param, and views
  // only need to know which scope to query.
  const [workspaceParam] = useQueryState('ws', parseAsString.withDefault('all'));
  const [sort, setSort] = useState<SortKey>('outlier');
  const [search, setSearch] = useState('');
  const [facet, setFacet] = useState<string | null>(null);

  const { data, isPending, isError, error } = useQuery(workspaceVideosOptions(workspaceParam));

  const videos = useMemo(() => {
    const rows = data?.videos ?? [];
    const term = search.trim().toLowerCase();

    return rows
      .filter((v) => !term || v.title.toLowerCase().includes(term))
      .filter((v) => !facet || v.format === facet || v.intent === facet || v.subject === facet)
      .toSorted(SORTS[sort].compare);
  }, [data, search, facet, sort]);

  // Facet counts come from the unfiltered set so a chip never reads zero after
  // you click it.
  const facets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of data?.videos ?? []) {
      for (const key of [v.format, v.intent, v.subject]) {
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts].toSorted((a, b) => b[1] - a[1]).slice(0, 12);
  }, [data]);

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Filter by title…'
          aria-label='Filter videos by title'
          className='max-w-xs'
        />
        {(Object.keys(SORTS) as SortKey[]).map((key) => (
          <Button
            key={key}
            type='button'
            size='sm'
            variant={sort === key ? 'default' : 'outline'}
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
          >
            {SORTS[key].label}
          </Button>
        ))}
      </div>

      {facets.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {facets.map(([key, count]) => (
            <button
              key={key}
              type='button'
              onClick={() => setFacet(facet === key ? null : key)}
              aria-pressed={facet === key}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                facet === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {key} <span className='tabular-nums opacity-70'>{count}</span>
            </button>
          ))}
        </div>
      )}

      {isError && <p className='text-destructive text-sm'>{(error as Error).message}</p>}

      {isPending ? (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className='h-16' />
          ))}
        </div>
      ) : (
        <>
          <CoverageNotice failed={data?.failed ?? []} total={data?.channelCount} />

          <p className='text-muted-foreground text-sm'>
            {videos.length} of {data?.videoCount ?? 0} videos across {data?.channelCount ?? 0}{' '}
            channels
          </p>

          <Card>
            <CardContent className='flex flex-col divide-y py-0'>
              {videos.map((video) => (
                <VideoRow key={`${video.channelId}-${video.videoId}`} video={video} />
              ))}
              {videos.length === 0 && (
                <p className='text-muted-foreground py-8 text-center text-sm'>
                  No videos match those filters.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <p className='text-muted-foreground text-xs'>
        Scores marked <span className='font-medium'>*</span> are provisional — the video is too new
        to judge on total views, so it&apos;s compared against the channel&apos;s other uploads of a
        similar age.
      </p>
    </div>
  );
}

function VideoRow({ video }: { video: WorkspaceVideo }) {
  const tags = [video.grade && `Class ${video.grade}`, video.subject, video.format, video.exam]
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div className='flex items-center gap-3 py-3'>
      {video.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnail}
          alt=''
          className='bg-muted h-10 w-[70px] shrink-0 rounded object-cover'
          loading='lazy'
        />
      ) : (
        <div className='bg-muted h-10 w-[70px] shrink-0 rounded' />
      )}

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
          {tags.length > 0 && ` · ${tags.join(' · ')}`}
        </p>
      </div>

      <div className='hidden shrink-0 text-right sm:block'>
        <p className='text-sm tabular-nums'>{formatCompact(video.views)}</p>
        <p className='text-muted-foreground text-xs tabular-nums'>{formatCompact(video.vph)}/hr</p>
      </div>

      {video.outlierScore !== null && (
        <Badge
          variant='outline'
          className={cn(
            'shrink-0 tabular-nums',
            PERFORMANCE_STYLES[video.performance ?? 'typical']
          )}
        >
          {video.outlierScore}×{video.provisional ? '*' : ''}
        </Badge>
      )}
    </div>
  );
}
