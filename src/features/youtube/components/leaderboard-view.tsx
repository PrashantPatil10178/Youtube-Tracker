'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/youtube/metrics';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';

import { leaderboardOptions } from '../api/queries';
import type { LeaderboardRow } from '../api/types';
import { CoverageNotice } from './coverage-notice';

const WINDOWS = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' }
];

type Board = {
  key: 'uploads' | 'windowViews' | 'subscriberGain';
  title: string;
  hint: string;
};

const BOARDS: Board[] = [
  { key: 'uploads', title: 'Videos published', hint: 'Uploads inside the window' },
  { key: 'windowViews', title: 'Views on new uploads', hint: 'Views earned by those uploads' },
  {
    key: 'subscriberGain',
    title: 'Subscriber gain',
    hint: 'Only movement larger than YouTube’s rounding'
  }
];

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardView() {
  const [workspaceParam] = useQueryState('ws', parseAsString.withDefault('all'));
  const [days, setDays] = useQueryState('days', parseAsInteger.withDefault(7));

  const { data, isPending, isError, error } = useQuery(leaderboardOptions(workspaceParam, days));

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center gap-2'>
        {WINDOWS.map((w) => (
          <Button
            key={w.days}
            type='button'
            size='sm'
            variant={days === w.days ? 'default' : 'outline'}
            aria-pressed={days === w.days}
            onClick={() => setDays(w.days)}
            className={cn(days !== w.days && 'text-muted-foreground')}
          >
            {w.label}
          </Button>
        ))}
      </div>

      {isError && <p className='text-destructive text-sm'>{(error as Error).message}</p>}

      {isPending ? (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-80' />
          ))}
        </div>
      ) : (
        data && (
          <>
            <CoverageNotice failed={data.failed} total={data.rows.length} />

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
              {BOARDS.map((board) => (
                <BoardCard key={board.key} board={board} rows={data.rows} />
              ))}
            </div>

            <Card>
              <CardContent className='flex flex-col gap-2 py-6'>
                <p className='text-muted-foreground text-xs tracking-wide uppercase'>
                  How these are measured
                </p>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  <span className='text-foreground'>Videos published</span> is a floor when marked
                  “≥” — YouTube&apos;s feed returns at most 15 recent uploads and its video listing
                  omits Shorts, so a channel publishing more than that cannot be counted exactly
                  from a single read. <span className='text-foreground'>Views on new uploads</span>{' '}
                  counts only videos published inside the window, not views arriving on the back
                  catalogue. <span className='text-foreground'>Subscriber gain</span> is shown only
                  where the movement exceeds YouTube&apos;s three-significant-figure rounding —{' '}
                  {data.measuredCount} of {data.rows.length} channels currently qualify. Everything
                  else reads “not enough history”, never a misleading zero.
                </p>
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
}

function BoardCard({ board, rows }: { board: Board; rows: LeaderboardRow[] }) {
  // Rows with nothing measurable sink to the bottom rather than tying at zero,
  // which would rank "unknown" alongside "genuinely flat".
  const ranked = rows.toSorted((a, b) => {
    const av = a[board.key];
    const bv = b[board.key];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av;
  });

  return (
    <Card>
      <CardContent className='flex flex-col gap-3 py-6'>
        <div>
          <h3 className='font-medium'>{board.title}</h3>
          <p className='text-muted-foreground text-sm'>{board.hint}</p>
        </div>

        <ol className='flex flex-col divide-y'>
          {ranked.slice(0, 10).map((row, index) => (
            <li key={row.channelId} className='flex items-center gap-2 py-2'>
              <span className='w-6 shrink-0 text-sm tabular-nums'>
                {MEDALS[index] ?? `#${index + 1}`}
              </span>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm'>{row.label}</p>
                <p className='text-muted-foreground truncate text-xs'>{row.handle}</p>
              </div>
              <Value board={board} row={row} />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function Value({ board, row }: { board: Board; row: LeaderboardRow }) {
  if (board.key === 'uploads') {
    return (
      <span className='shrink-0 text-sm tabular-nums'>
        {row.uploadsTruncated && <span className='text-muted-foreground'>≥</span>}
        {row.uploads}
      </span>
    );
  }

  if (board.key === 'windowViews') {
    return <span className='shrink-0 text-sm tabular-nums'>{formatCompact(row.windowViews)}</span>;
  }

  if (row.gainStatus === 'measured' && row.subscriberGain !== null) {
    return (
      <span className='text-chart-3 shrink-0 text-sm tabular-nums'>
        +{formatCompact(row.subscriberGain)}
      </span>
    );
  }

  return (
    <Badge variant='outline' className='text-muted-foreground shrink-0 text-[10px]'>
      {row.gainStatus === 'within-rounding' ? 'within rounding' : 'no history'}
    </Badge>
  );
}
