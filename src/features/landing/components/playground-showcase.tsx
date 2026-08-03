'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { TRACKED_CHANNELS } from '../data/landing';
import { BlurButton } from './blur-button';
import {
  IconChannels,
  IconCompetitors,
  IconInsights,
  IconThumbnails,
  IconVideos
} from './product-icons';

const TABS = [
  {
    id: 'channels',
    label: 'Channels',
    Icon: IconChannels,
    cta: 'Explore channel tracking',
    href: '/product/channel-tracking'
  },
  {
    id: 'thumbnails',
    label: 'Thumbnails',
    Icon: IconThumbnails,
    cta: 'Try thumbnail A/B',
    href: '/product/thumbnails'
  },
  {
    id: 'videos',
    label: 'Videos',
    Icon: IconVideos,
    cta: 'See video analytics',
    href: '/product/video-analytics'
  },
  {
    id: 'competitors',
    label: 'Competitors',
    Icon: IconCompetitors,
    cta: 'Set up competitor watch',
    href: '/product/competitors'
  },
  {
    id: 'insights',
    label: 'AI Insights',
    Icon: IconInsights,
    cta: 'See AI insights',
    href: '/product/ai-insights'
  }
] as const;

const RANGES = ['7 days', '28 days', '90 days'] as const;

const TAB_ACTIVE =
  'from-sr-indigo-100 border-sr-indigo-100 text-sr-indigo-900 border bg-gradient-to-b to-white shadow-[inset_0_-1px_0_1px_rgba(0,0,0,0.04)]';
const TAB_IDLE =
  'text-tx-tertiary hover:text-tx-secondary hover:bg-sf-secondary border border-transparent';

export function PlaygroundShowcase() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('channels');
  const [activeChannel, setActiveChannel] = useState(0);
  const [range, setRange] = useState<(typeof RANGES)[number]>('28 days');

  const current = TABS.find((tab) => tab.id === activeTab)!;

  return (
    <div className='flex w-full flex-col'>
      <div className='border-st-secondary relative w-full overflow-hidden rounded-[24px] border bg-white md:rounded-[32px]'>
        {/* Mobile tab rail */}
        <div
          className='border-st-secondary relative z-[2] border-b md:hidden'
          role='tablist'
          aria-label='Product views'
        >
          <div className='relative'>
            <div className='flex snap-x snap-mandatory touch-pan-x gap-2 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type='button'
                  role='tab'
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'font-matter focus-visible:outline-sr-indigo-600 flex min-w-[9rem] shrink-0 cursor-pointer snap-start items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                    activeTab === tab.id ? TAB_ACTIVE : 'text-tx-tertiary border border-transparent'
                  )}
                >
                  <tab.Icon width={16} height={16} />
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white via-white/90 to-transparent'
            />
          </div>
        </div>

        {/* Desktop tab rail */}
        <div
          className='border-st-secondary relative z-[2] hidden items-center gap-2 rounded-b-[32px] border border-t-0 bg-white p-2 md:flex'
          role='tablist'
          aria-label='Product views'
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type='button'
              role='tab'
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'font-matter focus-visible:outline-sr-indigo-600 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-8 py-3 text-[15px] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                activeTab === tab.id ? TAB_ACTIVE : TAB_IDLE
              )}
            >
              <tab.Icon width={18} height={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className='min-h-[460px] md:min-h-[550px]' role='tabpanel'>
          {activeTab === 'channels' ? (
            <ChannelsPanel
              activeChannel={activeChannel}
              onSelect={setActiveChannel}
              range={range}
              onRangeChange={setRange}
            />
          ) : (
            <PlaceholderPanel label={current.label} Icon={current.Icon} />
          )}
        </div>
      </div>

      <div className='flex w-full items-center justify-center pt-5'>
        <BlurButton href={current.href} variant='outline' className='px-8 py-3.5'>
          {current.cta}
        </BlurButton>
      </div>
    </div>
  );
}

type ChannelsPanelProps = {
  activeChannel: number;
  onSelect: (index: number) => void;
  range: (typeof RANGES)[number];
  onRangeChange: (value: (typeof RANGES)[number]) => void;
};

function ChannelsPanel({ activeChannel, onSelect, range, onRangeChange }: ChannelsPanelProps) {
  const channel = TRACKED_CHANNELS[activeChannel];
  const totalViews = '4.88M';

  return (
    <div className='border-st-secondary flex flex-col rounded-[22px] border bg-white p-5 md:grid md:h-[550px] md:grid-cols-[minmax(0,1fr)_1px_400px] md:grid-rows-[minmax(0,1fr)_auto] md:items-stretch md:gap-x-12 md:gap-y-5 md:overflow-hidden md:rounded-[40px] md:p-12'>
      {/* Channel list */}
      <div className='order-1 flex w-full shrink-0 flex-col gap-5 md:col-start-3 md:row-start-1 md:row-end-3 md:min-h-0 md:w-[400px] md:gap-8'>
        <div className='flex flex-row items-center justify-between gap-3 px-0.5 md:px-0'>
          <h3 className='font-season-mix text-tx text-xl font-medium md:text-[28px]'>Channels</h3>
          <Link
            href='/product/channel-tracking'
            className='bg-sr-indigo-100 font-matter text-sr-indigo-800 rounded-full px-3 py-1 text-xs'
          >
            View all
          </Link>
        </div>

        <div
          className='-mx-2 flex flex-col gap-0 md:gap-1'
          role='listbox'
          aria-label='Tracked channels'
        >
          {TRACKED_CHANNELS.map((item, index) => (
            <button
              key={item.handle}
              type='button'
              role='option'
              aria-selected={activeChannel === index}
              onClick={() => onSelect(index)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3.5 rounded-[16px] border px-2 py-2 text-left transition-all md:gap-4 md:rounded-[20px]',
                activeChannel === index
                  ? 'border-sr-indigo-100 bg-sr-indigo-50'
                  : 'hover:bg-sf border-transparent'
              )}
            >
              <span
                aria-hidden='true'
                className='font-season-mix relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] text-base font-medium text-white transition-all md:h-14 md:w-14 md:rounded-[14px]'
                style={{
                  background: item.gradient,
                  border: activeChannel === index ? '1px solid #a7c0f1' : '1px solid transparent'
                }}
              >
                {item.name.charAt(0)}
              </span>

              <span className='block min-w-0 flex-1'>
                <span className='mb-1 flex items-center gap-3'>
                  <span className='font-season-mix text-tx text-base font-medium'>{item.name}</span>
                  <Delta value={item.delta} />
                </span>
                <span className='font-matter text-tx-tertiary/60 hidden text-[13px] md:block'>
                  {item.handle} ・ {item.category}
                </span>
              </span>

              <Sparkline points={item.spark} positive={item.delta >= 0} />
            </button>
          ))}
        </div>

        <div className='hidden flex-row items-center justify-between gap-4 pt-2 md:flex'>
          <p className='font-matter text-tx-tertiary/75 text-sm'>Track unlimited channels</p>
          <BlurButton href='/auth/sign-up' size='sm' className='min-h-0! px-5! py-1.5! text-xs!'>
            Add a channel
          </BlurButton>
        </div>
      </div>

      <div
        className='border-st-secondary order-2 -mx-5 my-3 w-auto shrink-0 border-t md:hidden'
        aria-hidden='true'
      />

      {/* Range + export controls */}
      <div className='order-3 flex shrink-0 flex-row items-center justify-between gap-4 py-1 md:col-start-1 md:row-start-2 md:py-0'>
        <div className='border-st-secondary flex items-center gap-1 rounded-full border p-1'>
          {RANGES.map((option) => (
            <button
              key={option}
              type='button'
              onClick={() => onRangeChange(option)}
              className={cn(
                'font-matter cursor-pointer rounded-full px-3 py-1.5 text-[13px] transition-colors md:px-4 md:text-sm',
                range === option
                  ? 'bg-sr-indigo-50 text-sr-indigo-900 font-medium'
                  : 'text-tx-tertiary hover:text-tx'
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <BlurButton ariaLabel='Export report' className='px-4 py-2.5 md:px-7 md:py-3.5'>
          Export
        </BlurButton>
      </div>

      <div
        className='border-st-secondary order-4 -mx-5 my-3 w-auto shrink-0 border-t md:hidden'
        aria-hidden='true'
      />

      {/* Detail chart */}
      <div className='order-5 flex flex-1 flex-col justify-between gap-4 md:col-start-1 md:row-start-1 md:min-h-0 md:gap-5'>
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div className='flex flex-col gap-1'>
            <span className='font-matter text-tx-tertiary text-sm'>
              Total views ・ last {range}
            </span>
            <span className='font-season-mix text-tx text-[36px] leading-none font-medium tabular-nums md:text-[52px]'>
              {totalViews}
            </span>
          </div>
          <div className='flex flex-col items-start gap-1 md:items-end'>
            <span className='font-matter text-tx-tertiary text-sm'>{channel.name}</span>
            <span className='font-matter text-tx text-lg font-medium tabular-nums'>
              {channel.views}
            </span>
          </div>
        </div>

        <AreaChart points={channel.spark} positive={channel.delta >= 0} />

        <div className='border-st-secondary/80 grid shrink-0 grid-cols-3 gap-3 border-t pt-4 max-md:-mx-5 max-md:px-5 md:mx-0 md:px-0'>
          {[
            { label: 'Avg. CTR', value: '6.4%' },
            { label: 'Avg. view duration', value: '4:12' },
            { label: 'New subscribers', value: '18.2K' }
          ].map((metric) => (
            <div key={metric.label} className='flex flex-col gap-1'>
              <span className='font-matter text-tx-tertiary text-xs md:text-[13px]'>
                {metric.label}
              </span>
              <span className='font-matter text-tx text-base font-medium tabular-nums md:text-lg'>
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className='bg-st-secondary hidden w-px shrink-0 md:col-start-2 md:row-start-1 md:row-end-3 md:block'
        aria-hidden='true'
      />
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        'border-st/25 font-matter rounded-full border px-1.5 py-0 text-[10px] font-normal tabular-nums md:px-2 md:py-0.5 md:text-xs md:font-medium',
        positive ? 'bg-sr-green-50 text-sr-green-700' : 'bg-sr-red-50 text-sr-red-600'
      )}
    >
      {positive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

/** Inline trend line for each channel row. */
function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const path = useMemo(() => toPath(points, 56, 20), [points]);
  return (
    <svg
      width='56'
      height='20'
      viewBox='0 0 56 20'
      fill='none'
      aria-hidden='true'
      className='hidden shrink-0 md:block'
    >
      <path
        d={path}
        stroke={positive ? '#6ea335' : '#c43d2b'}
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

/** Larger filled chart for the selected channel. */
function AreaChart({ points, positive }: { points: number[]; positive: boolean }) {
  const width = 640;
  const height = 200;
  const line = useMemo(() => toPath(points, width, height), [points]);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const stroke = positive ? '#556adc' : '#c43d2b';

  return (
    <div className='relative min-h-0 flex-1'>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio='none'
        className='h-full max-h-[220px] w-full'
        role='img'
        aria-label='Views trend for the selected channel'
      >
        <defs>
          <linearGradient id='ciq-area' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor={stroke} stopOpacity='0.18' />
            <stop offset='100%' stopColor={stroke} stopOpacity='0' />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((y) => (
          <line
            key={y}
            x1='0'
            x2={width}
            y1={height * y}
            y2={height * y}
            stroke='#f0f0f0'
            strokeWidth='1'
          />
        ))}
        <path d={area} fill='url(#ciq-area)' />
        <path
          d={line}
          fill='none'
          stroke={stroke}
          strokeWidth='2.5'
          strokeLinecap='round'
          strokeLinejoin='round'
          vectorEffect='non-scaling-stroke'
        />
      </svg>
    </div>
  );
}

/** Maps normalised 0–1 points to an SVG polyline path. */
function toPath(points: number[], width: number, height: number) {
  const step = width / (points.length - 1);
  const pad = height * 0.12;
  return points
    .map((value, index) => {
      const x = index * step;
      const y = height - pad - value * (height - pad * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function PlaceholderPanel({ label, Icon }: { label: string; Icon: (typeof TABS)[number]['Icon'] }) {
  return (
    <div className='border-st-secondary flex min-h-[460px] flex-col items-center justify-center gap-4 rounded-[22px] border bg-white p-5 text-center md:min-h-[550px] md:rounded-[40px] md:p-12'>
      <div className='bg-sr-indigo-50 border-sr-indigo-100 text-sr-indigo-700 flex h-16 w-16 items-center justify-center rounded-2xl border'>
        <Icon width={28} height={28} />
      </div>
      <h3 className='font-season-mix text-tx text-xl font-medium md:text-[28px]'>{label}</h3>
      <p className='font-matter text-tx-tertiary max-w-sm text-base'>
        Sign in to open the {label.toLowerCase()} view on your own channels.
      </p>
    </div>
  );
}
