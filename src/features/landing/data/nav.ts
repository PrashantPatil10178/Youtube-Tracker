export const PRIMARY_NAV = ['Product', 'Solutions', 'Leaderboard', 'Resources'] as const;

export type NavLink = { label: string; href: string };
export type NavSection = { title: string; links: NavLink[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Product',
    links: [
      { label: 'Channel Tracking', href: '/product/channel-tracking' },
      { label: 'Thumbnail A/B', href: '/product/thumbnails' },
      { label: 'Video Analytics', href: '/product/video-analytics' },
      { label: 'Competitor Watch', href: '/product/competitors' },
      { label: 'AI Insights', href: '/product/ai-insights' },
      { label: 'Alerts & Digests', href: '/product/alerts' },
      { label: 'Reports', href: '/product/reports' }
    ]
  },
  {
    title: 'Solutions',
    links: [
      { label: 'For Creators', href: '/solutions/creators' },
      { label: 'For Agencies', href: '/solutions/agencies' },
      { label: 'For Networks', href: '/solutions/networks' },
      { label: 'For Brands', href: '/solutions/brands' },
      { label: 'Multi-channel Teams', href: '/solutions/teams' }
    ]
  },
  {
    title: 'Developers',
    links: [
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Node SDK', href: '/docs/sdk/node' },
      { label: 'Python SDK', href: '/docs/sdk/python' },
      { label: 'Webhooks', href: '/docs/webhooks' },
      { label: 'Data Export', href: '/docs/export' },
      { label: 'Status', href: '/status' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'Benchmarks', href: '/benchmarks' },
      { label: 'Thumbnail Guide', href: '/guides/thumbnails' },
      { label: 'Help Center', href: '/help' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Leaderboard', href: '/dashboard/leaderboard' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' }
    ]
  }
];

export const SOCIAL_LINKS = [
  { label: 'YouTube', href: '#', hoverColor: '#FF0000' },
  { label: 'X', href: '#', hoverColor: '#000000' },
  { label: 'LinkedIn', href: '#', hoverColor: '#0A66C2' },
  { label: 'GitHub', href: '#', hoverColor: '#181717' },
  { label: 'Discord', href: '#', hoverColor: '#5865F2' },
  { label: 'Instagram', href: '#', hoverColor: '#E4405F' }
] as const;
