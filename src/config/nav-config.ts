import { NavGroup } from '@/types';

/**
 * Sidebar + Cmd+K navigation.
 *
 * Trimmed to the ChannelIQ product surface — the starter template's demo
 * routes (mock products/users, kanban, chat, form showcases, the React Query
 * demo, the icon gallery) are no longer listed. Those page files still exist
 * under src/app/dashboard if you want any of them back; re-add an entry here.
 *
 * `access` predicates are vestigial since the Clerk removal — see
 * src/hooks/use-nav.ts. Real authorization is requireSession(), not this file.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Track',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Channels',
        url: '/dashboard/channels',
        icon: 'media',
        isActive: false,
        shortcut: ['c', 'c'],
        items: []
      },
      {
        title: 'Videos',
        url: '/dashboard/videos',
        icon: 'page',
        isActive: false,
        shortcut: ['v', 'v'],
        items: []
      },
      {
        title: 'Watch',
        url: '/dashboard/watch',
        icon: 'search',
        isActive: false,
        shortcut: ['w', 'w'],
        items: []
      },
      {
        title: 'Leaderboard',
        url: '/dashboard/leaderboard',
        icon: 'trendingUp',
        isActive: false,
        shortcut: ['l', 'l'],
        items: []
      },
      {
        title: 'Insights',
        url: '/dashboard/insights',
        icon: 'trendingUp',
        isActive: false,
        shortcut: ['i', 'i'],
        items: []
      },
      {
        title: 'Ideas',
        url: '/dashboard/ideas',
        icon: 'sparkles',
        isActive: false,
        shortcut: ['g', 'i'],
        items: []
      },
      {
        title: 'Research',
        url: '/dashboard/research',
        icon: 'search',
        isActive: false,
        shortcut: ['r', 'r'],
        items: []
      },
      {
        title: 'Thumbnail A/B',
        url: '/dashboard/thumbnails',
        icon: 'sparkles',
        isActive: false,
        shortcut: ['t', 't'],
        items: []
      }
    ]
  },
  {
    label: 'Account',
    items: [
      {
        title: 'Profile',
        url: '/dashboard/profile',
        icon: 'account',
        isActive: false,
        shortcut: ['p', 'p'],
        items: []
      }
    ]
  }
];
