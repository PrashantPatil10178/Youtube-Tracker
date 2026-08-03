import type { SVGProps } from 'react';

/**
 * Product iconography for ChannelIQ. Drawn to match the existing set's
 * 24×24 box and 1.5 stroke weight so they sit correctly beside it.
 */

const base = (props: SVGProps<SVGSVGElement>) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props
});

/** Stacked rows — the multi-channel list. */
export function IconChannels({ width = 20, height = 20, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} width={width} height={height}>
      <rect x='2.75' y='4.25' width='18.5' height='4.5' rx='1.75' />
      <rect x='2.75' y='15.25' width='18.5' height='4.5' rx='1.75' />
      <path d='M6.25 11.75h11.5' />
    </svg>
  );
}

/** Two overlapping frames — the A/B comparison. */
export function IconThumbnails({ width = 20, height = 20, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} width={width} height={height}>
      <rect x='2.75' y='6.75' width='12' height='9' rx='2' />
      <path d='M17.25 8.75h2a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2v-1.5' />
      <path d='m5.25 13.25 2-2 2.25 2.25 1.75-1.5 2.5 2.5' />
    </svg>
  );
}

/** Play glyph inside a frame — per-video analytics. */
export function IconVideos({ width = 20, height = 20, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} width={width} height={height}>
      <rect x='2.75' y='4.75' width='18.5' height='14.5' rx='3.5' />
      <path d='M10.25 9.4v5.2l4.4-2.6z' />
    </svg>
  );
}

/** Target with a tracking ring — competitor watch. */
export function IconCompetitors({ width = 20, height = 20, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} width={width} height={height}>
      <circle cx='12' cy='12' r='8.75' />
      <circle cx='12' cy='12' r='4.5' />
      <circle cx='12' cy='12' r='1' fill='currentColor' stroke='none' />
    </svg>
  );
}

/** Four-point spark — AI-generated explanations. */
export function IconInsights({ width = 20, height = 20, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} width={width} height={height}>
      <path d='M12 3.25c.55 3.9 1.6 4.95 5.5 5.5-3.9.55-4.95 1.6-5.5 5.5-.55-3.9-1.6-4.95-5.5-5.5 3.9-.55 4.95-1.6 5.5-5.5Z' />
      <path d='M17.75 15.25c.28 1.95.8 2.48 2.75 2.75-1.95.28-2.47.8-2.75 2.75-.28-1.95-.8-2.47-2.75-2.75 1.95-.27 2.47-.8 2.75-2.75Z' />
    </svg>
  );
}

/** Rising trend line — growth and forecasting. */
export function IconTrend({ width = 20, height = 20, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} width={width} height={height}>
      <path d='M3.25 16.75l5-5.25 3.5 3.25 4.25-5.5' />
      <path d='M15.25 8.75h4v4' />
      <path d='M3.25 20.75h17.5' />
    </svg>
  );
}
