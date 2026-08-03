'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { formatCompact } from '@/lib/youtube/metrics';
import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart } from 'recharts';

import type { WorkspaceVideo } from '../api/types';

/**
 * Share of the workspace held by each channel.
 *
 * Two dimensions rather than one: subscribers describe accumulated position,
 * uploads describe current effort. Showing them side by side is what makes the
 * gap legible — a channel can hold a small share of the audience while
 * producing a large share of the output, which is exactly EasyLearning's shape.
 */

/** Recharts needs concrete colours; these follow the theme's chart tokens. */
const PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)'
];

const DIMENSIONS = [
  { key: 'subscribers' as const, label: 'Subscribers' },
  { key: 'uploads' as const, label: 'Uploads' }
];

type Slice = { name: string; value: number; fill: string };

export function ChannelShareChart({
  videos,
  subscribersByChannel
}: {
  videos: WorkspaceVideo[];
  /** Channel label → subscriber count. */
  subscribersByChannel: Map<string, number | null>;
}) {
  const [dimension, setDimension] = useState<'subscribers' | 'uploads'>('subscribers');

  const { slices, total } = useMemo(() => {
    const totals = new Map<string, number>();

    if (dimension === 'uploads') {
      for (const video of videos) {
        totals.set(video.channelLabel, (totals.get(video.channelLabel) ?? 0) + 1);
      }
    } else {
      for (const [label, subs] of subscribersByChannel) {
        if (subs) totals.set(label, subs);
      }
    }

    const sorted = [...totals].toSorted((a, b) => b[1] - a[1]);
    const sum = sorted.reduce((acc, [, v]) => acc + v, 0);

    // How many slices to show is adaptive, not fixed. A fixed top-N works when
    // one channel dominates, but on a flat distribution — every channel
    // publishing a similar number of videos — it pushes most of the chart into
    // a single "others" wedge that hides exactly what the reader wants to see.
    // So: keep adding slices until they cover most of the total, capped at what
    // stays legible.
    const COVERAGE_TARGET = 0.85;
    const MAX_SLICES = 12;

    let covered = 0;
    let cut = 0;
    while (cut < sorted.length && cut < MAX_SLICES && covered / sum < COVERAGE_TARGET) {
      covered += sorted[cut][1];
      cut++;
    }

    const head = sorted.slice(0, cut);
    const tail = sorted.slice(cut);
    const tailSum = tail.reduce((acc, [, v]) => acc + v, 0);

    const result: Slice[] = head.map(([name, value], i) => ({
      name,
      value,
      fill: PALETTE[i % PALETTE.length]
    }));

    if (tailSum > 0) {
      result.push({
        name: `${tail.length} smaller channels`,
        value: tailSum,
        fill: 'var(--muted-foreground)'
      });
    }

    return { slices: result, total: sum };
  }, [videos, subscribersByChannel, dimension]);

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        slices.map((s) => [s.name, { label: s.name, color: s.fill }])
      ) satisfies ChartConfig,
    [slices]
  );

  return (
    <Card>
      <CardContent className='flex flex-col gap-4 py-6'>
        <div className='flex flex-wrap items-start justify-between gap-2'>
          <div>
            <h3 className='font-medium'>Share of workspace</h3>
            <p className='text-muted-foreground text-sm'>
              {formatCompact(total)} total across {slices.length} groups
            </p>
          </div>

          <div className='flex gap-1'>
            {DIMENSIONS.map((d) => (
              <button
                key={d.key}
                type='button'
                aria-pressed={dimension === d.key}
                onClick={() => setDimension(d.key)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  dimension === d.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className='grid grid-cols-1 items-center gap-4 sm:grid-cols-2'>
          <ChartContainer config={config} className='mx-auto aspect-square max-h-[240px] w-full'>
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name) => [`${formatCompact(Number(value))}  `, name]}
                  />
                }
              />
              <Pie data={slices} dataKey='value' nameKey='name' innerRadius={45} paddingAngle={3}>
                {slices.map((slice) => (
                  <Cell key={slice.name} fill={slice.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <ul className='flex flex-col gap-1.5'>
            {slices.map((slice) => (
              <li key={slice.name} className='flex items-center gap-2 text-sm'>
                <span
                  className='size-2.5 shrink-0 rounded-[3px]'
                  style={{ backgroundColor: slice.fill }}
                />
                <span className='min-w-0 flex-1 truncate'>{slice.name}</span>
                <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                  {total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0'}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
