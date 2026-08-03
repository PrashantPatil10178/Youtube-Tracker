'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import type { WorkspaceVideo } from '../api/types';

/**
 * Daily uploads across the workspace, split by yours versus everyone else's.
 *
 * Stacked rather than two separate charts so the comparison is direct: on a day
 * where the whole segment publishes heavily, the question is what share was
 * yours.
 */
const DAYS = 14;

const config = {
  own: { label: 'Your channels', color: 'var(--chart-1)' },
  rival: { label: 'Competitors', color: 'var(--chart-3)' }
} satisfies ChartConfig;

export function UploadActivityChart({
  videos,
  ownLabels
}: {
  videos: WorkspaceVideo[];
  /** Labels counted as "yours" — everything else is a competitor. */
  ownLabels: Set<string>;
}) {
  const data = useMemo(() => {
    // Anchored to the newest upload in the data, and formatted in UTC, so the
    // server and the client compute identical buckets. Using `new Date()` and
    // `toLocaleDateString` here produced a hydration mismatch: the two
    // environments disagreed about the current day and about locale formatting.
    const newest = videos.reduce((max, v) => Math.max(max, Date.parse(v.publishedAt) || 0), 0);
    const anchor = newest > 0 ? newest : 0;
    const anchorDay = Math.floor(anchor / 864e5);

    const buckets = new Map<string, { day: string; own: number; rival: number }>();

    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date((anchorDay - i) * 864e5);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, {
        day: `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}`,
        own: 0,
        rival: 0
      });
    }

    for (const video of videos) {
      const key = new Date(video.publishedAt).toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (ownLabels.has(video.channelLabel)) bucket.own += 1;
      else bucket.rival += 1;
    }

    return [...buckets.values()];
  }, [videos, ownLabels]);

  const totalOwn = data.reduce((sum, d) => sum + d.own, 0);
  const totalRival = data.reduce((sum, d) => sum + d.rival, 0);

  return (
    <Card>
      <CardContent className='flex flex-col gap-4 py-6'>
        <div>
          <h3 className='font-medium'>Upload activity · last {DAYS} days</h3>
          <p className='text-muted-foreground text-sm'>
            {totalOwn} from your channels, {totalRival} from competitors
          </p>
        </div>

        <ChartContainer config={config} className='h-[220px] w-full'>
          <BarChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray='3 3' />
            <XAxis
              dataKey='day'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval='preserveStartEnd'
              fontSize={11}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey='own' stackId='a' fill='var(--color-own)' radius={[0, 0, 2, 2]} />
            <Bar dataKey='rival' stackId='a' fill='var(--color-rival)' radius={[2, 2, 0, 0]} />
          </BarChart>
        </ChartContainer>

        <p className='text-muted-foreground text-xs'>
          Counted from the feed window, so days beyond a fast-publishing channel&apos;s most recent
          15 uploads may be undercounted.
        </p>
      </CardContent>
    </Card>
  );
}
