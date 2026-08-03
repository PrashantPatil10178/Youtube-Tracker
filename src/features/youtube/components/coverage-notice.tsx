'use client';

/**
 * Tells you when the numbers on a page describe fewer channels than you track.
 *
 * The aggregations already isolate a failing channel so one bad entry can't
 * take a page down — but silently dropping it is its own problem: a benchmark
 * computed over 18 of your 19 channels looks identical to one computed over all
 * 19. Naming what fell out is the difference between a degraded answer and a
 * misleading one.
 */
export function CoverageNotice({
  failed,
  total
}: {
  failed: string[];
  /** Channels the page did manage to read, for the "N of M" framing. */
  total?: number;
}) {
  if (failed.length === 0) return null;

  return (
    <div className='border-destructive/30 bg-destructive/5 flex flex-col gap-1 rounded-lg border p-3'>
      <p className='text-sm font-medium'>
        {failed.length} channel{failed.length === 1 ? '' : 's'} could not be read
        {total !== undefined && ` — these figures cover ${total} channel${total === 1 ? '' : 's'}`}
      </p>
      <p className='text-muted-foreground text-xs'>{failed.join(', ')}</p>
      <p className='text-muted-foreground text-xs'>
        Usually a handle that no longer resolves, or a temporary YouTube error. Check the handle on
        the Channels page, or retry in a few minutes.
      </p>
    </div>
  );
}
