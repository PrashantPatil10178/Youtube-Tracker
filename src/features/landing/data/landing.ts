/**
 * Landing page content for ChannelIQ.
 *
 * All figures, channel names, quotes and case studies below are placeholder
 * marketing copy for an unreleased product — swap them for real, verifiable
 * numbers before this page goes public.
 */

/** Capability strip that replaces the old customer-logo marquee. */
export const MARQUEE_ITEMS = [
  'Channel tracking',
  'Thumbnail A/B testing',
  'CTR prediction',
  'Competitor watch',
  'Retention curves',
  'Shorts analytics',
  'Traffic sources',
  'Daily digests',
  'Revenue estimates',
  'Bulk CSV export',
  'Team workspaces',
  'API access'
] as const;

export type TrackedChannel = {
  name: string;
  handle: string;
  category: string;
  views: string;
  delta: number;
  /** Normalised 0–1 sparkline points. */
  spark: number[];
  /** Tailwind gradient used for the avatar tile. */
  gradient: string;
};

export const TRACKED_CHANNELS: TrackedChannel[] = [
  {
    name: 'Northwind Tech',
    handle: '@northwindtech',
    category: 'Technology',
    views: '2.41M',
    delta: 12.4,
    spark: [0.32, 0.38, 0.35, 0.5, 0.58, 0.54, 0.72, 0.86],
    gradient: 'linear-gradient(180deg, #4250d5 0%, #6a88e2 100%)'
  },
  {
    name: 'Atlas Kitchen',
    handle: '@atlaskitchen',
    category: 'Food',
    views: '1.08M',
    delta: -4.1,
    spark: [0.78, 0.74, 0.66, 0.61, 0.55, 0.5, 0.46, 0.42],
    gradient: 'linear-gradient(180deg, #496d21 0%, #83c040 100%)'
  },
  {
    name: 'Pixel Forge',
    handle: '@pixelforge',
    category: 'Gaming',
    views: '884K',
    delta: 31.7,
    spark: [0.18, 0.22, 0.3, 0.34, 0.48, 0.62, 0.8, 0.95],
    gradient: 'linear-gradient(180deg, #c43d2b 0%, #eba18f 100%)'
  },
  {
    name: 'Ledger & Co',
    handle: '@ledgerandco',
    category: 'Finance',
    views: '512K',
    delta: 6.2,
    spark: [0.4, 0.44, 0.42, 0.5, 0.52, 0.58, 0.61, 0.68],
    gradient: 'linear-gradient(180deg, #c08827 0%, #feb12b 100%)'
  }
];

export const CODE_SNIPPETS = {
  Node: `import { ChannelIQ } from '@channeliq/sdk';

const iq = new ChannelIQ({ apiKey: process.env.CHANNELIQ_KEY });

const report = await iq.channels.metrics({
  channels: ['@northwindtech', '@pixelforge'],
  range: '28d',
  metrics: ['views', 'ctr', 'avgViewDuration']
});

console.log(report.summary);`,
  Python: `from channeliq import ChannelIQ

iq = ChannelIQ(api_key=os.environ["CHANNELIQ_KEY"])

report = iq.channels.metrics(
    channels=["@northwindtech", "@pixelforge"],
    range="28d",
    metrics=["views", "ctr", "avg_view_duration"],
)

print(report.summary)`,
  cURL: `curl https://api.channeliq.com/v1/channels/metrics \\
  -H "Authorization: Bearer $CHANNELIQ_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channels": ["@northwindtech", "@pixelforge"],
    "range": "28d",
    "metrics": ["views", "ctr", "avgViewDuration"]
  }'`
} as const;

export type CodeLanguage = keyof typeof CODE_SNIPPETS;

export const FEATURE_CARDS = [
  {
    title: 'Thumbnail A/B',
    description: 'Score two thumbnails before you publish',
    href: '/product/thumbnails'
  },
  {
    title: 'Channel Tracking',
    description: 'Unlimited channels on one dashboard',
    href: '/product/channel-tracking'
  },
  {
    title: 'Competitor Watch',
    description: 'Get alerted the moment rivals publish',
    href: '/product/competitors'
  },
  {
    title: 'AI Insights',
    description: 'Plain-English answers on what moved the numbers',
    href: '/product/ai-insights'
  }
] as const;

export const WHY_FEATURES = [
  {
    id: 'unified',
    title: 'Every channel in one view',
    description:
      'Track as many channels as you manage. Views, CTR, retention and subscribers roll up into a single comparable dashboard.'
  },
  {
    id: 'thumbnails',
    title: 'Test thumbnails before publishing',
    description:
      'Upload two options and the model scores predicted click-through, then tells you which visual cues drove the difference.'
  },
  {
    id: 'ai',
    title: 'Answers, not just charts',
    description:
      'Ask why a video underperformed and get a written explanation grounded in your own retention and traffic-source data.'
  }
] as const;

export type Capability = {
  id: string;
  title: string;
  description: string;
  /** Accent used by the generated cover panel. */
  accent: string;
  links?: { label: string; sublabel: string; href: string }[];
  stats?: { label: string; value: string }[];
};

export const CAPABILITIES: Capability[] = [
  {
    id: 'track',
    title: 'Track every channel you run',
    description:
      'Connect your channels once and ChannelIQ keeps pulling daily metrics, backfilling history and watching for anomalies.',
    accent: '#556adc',
    links: [
      { label: 'Channel Tracking', sublabel: 'Daily sync', href: '/product/channel-tracking' },
      { label: 'Video Analytics', sublabel: 'Per-video', href: '/product/video-analytics' },
      { label: 'Shorts & Live', sublabel: 'Formats', href: '/product/formats' },
      { label: 'Alerts', sublabel: 'Anomalies', href: '/product/alerts' }
    ]
  },
  {
    id: 'compare',
    title: 'Compare what actually works',
    description:
      'Put thumbnails, titles and whole channels side by side. Every comparison is scored, so you ship the stronger option.',
    accent: '#e96c2f',
    links: [
      { label: 'Thumbnail A/B', sublabel: 'Predicted CTR', href: '/product/thumbnails' },
      { label: 'Title Testing', sublabel: 'Variants', href: '/product/titles' },
      { label: 'Competitor Watch', sublabel: 'Benchmarks', href: '/product/competitors' },
      { label: 'Reports', sublabel: 'Share-ready', href: '/product/reports' }
    ]
  },
  {
    id: 'predict',
    title: 'Know what happens next',
    description:
      'Forecasts on views and subscriber growth, plus written explanations of what moved — so reviews start from answers.',
    accent: '#6ea335',
    stats: [
      { label: 'channels tracked', value: '40K+' },
      { label: 'thumbnails scored', value: '180K' },
      { label: 'sync latency', value: '<5min' }
    ]
  }
];

export const CASE_STUDIES = [
  {
    org: 'Northwind Media',
    orgType: 'Agency · 32 channels',
    headline: '2.4x faster monthly reporting',
    body: 'Replaced a hand-built spreadsheet with one workspace, so client reports now generate from live data instead of manual exports.',
    href: '/stories/northwind-media'
  },
  {
    org: 'Pixel Forge',
    orgType: 'Creator · 880K subs',
    headline: '+31% click-through in one quarter',
    body: 'Ran every thumbnail through A/B scoring before publishing and shipped only the stronger variant.',
    href: '/stories/pixel-forge'
  },
  {
    org: 'Atlas Collective',
    orgType: 'Network · 120 channels',
    headline: '18 hours a week saved',
    body: 'Automated competitor tracking across the roster, so strategists review alerts instead of trawling channels by hand.',
    href: '/stories/atlas-collective'
  }
] as const;

export const AGENCY_CARDS = [
  {
    title: 'Built for many channels',
    description:
      'Workspaces, roles and per-client separation come standard. Add a channel and it inherits the right permissions immediately.',
    bullets: [
      'Unlimited channels per workspace',
      'Per-client access boundaries',
      'Shared thumbnail test history',
      'Scheduled report delivery'
    ]
  },
  {
    title: 'Your data stays portable',
    description:
      'Everything ChannelIQ collects is exportable. Pull raw metrics into your own warehouse whenever you want it.',
    bullets: [
      'Bulk CSV and JSON export',
      'REST API on every plan',
      'Webhooks for anomalies',
      'No lock-in on historical data'
    ]
  }
] as const;

export const GOVERNANCE_BADGES = [
  'Role-based access',
  'Audit trail',
  'SSO ready',
  'Full data export',
  'Scoped API keys',
  'Regional data storage'
] as const;

export const INTEGRATIONS = [
  {
    title: 'YouTube Data API',
    description: 'Official connection — views, CTR, retention and traffic sources',
    accent: '#556adc'
  },
  {
    title: 'Shorts & Live',
    description: 'Format-aware metrics so short-form is not averaged away',
    accent: '#e96c2f'
  },
  {
    title: 'Warehouse export',
    description: 'Scheduled CSV, JSON or webhook delivery into your own stack',
    accent: '#6ea335'
  }
] as const;

export const BLOG_POSTS = [
  {
    category: 'RESEARCH',
    title: 'What 180,000 thumbnails say about click-through',
    date: 'April 2, 2026',
    accent: '#556adc',
    href: '/blog/thumbnail-study'
  },
  {
    category: 'PRODUCT',
    title: 'Competitor Watch is now real-time',
    date: 'March 6, 2026',
    accent: '#e96c2f',
    href: '/blog/competitor-watch-realtime'
  },
  {
    category: 'GUIDE',
    title: 'Reading retention curves without fooling yourself',
    date: 'February 20, 2026',
    accent: '#6ea335',
    href: '/blog/retention-curves'
  }
] as const;
