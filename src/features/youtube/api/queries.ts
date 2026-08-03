import { queryOptions } from '@tanstack/react-query';

import {
  getChannelAnalytics,
  getChannelDigest,
  getLeaderboard,
  getWatchFeed,
  getWorkspaceInsights,
  getWorkspaceVideos
} from './service';

export const youtubeKeys = {
  all: ['youtube'] as const,
  analytics: (query: string) => [...youtubeKeys.all, 'analytics', query] as const,
  digest: (query: string) => [...youtubeKeys.all, 'digest', query] as const,
  workspaceVideos: (std: string) => [...youtubeKeys.all, 'workspace-videos', std] as const,
  workspaceInsights: (std: string) => [...youtubeKeys.all, 'workspace-insights', std] as const,
  watch: (std: string) => [...youtubeKeys.all, 'watch', std] as const,
  leaderboard: (ws: string, days: number) => [...youtubeKeys.all, 'leaderboard', ws, days] as const
};

export const channelAnalyticsOptions = (query: string) =>
  queryOptions({
    queryKey: youtubeKeys.analytics(query),
    queryFn: () => getChannelAnalytics(query),
    enabled: query.length > 0,
    // Channel stats barely move minute to minute; avoid refetch storms when
    // several tracked channels mount at once.
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

export const workspaceVideosOptions = (std: string) =>
  queryOptions({
    queryKey: youtubeKeys.workspaceVideos(std),
    queryFn: () => getWorkspaceVideos(std),
    // Fans out across every channel in the workspace, so it is the most
    // expensive read in the app — cache it hard.
    staleTime: 10 * 60 * 1000,
    retry: 1
  });

export const workspaceInsightsOptions = (std: string) =>
  queryOptions({
    queryKey: youtubeKeys.workspaceInsights(std),
    queryFn: () => getWorkspaceInsights(std),
    // Aggregates every channel's full history; the server caches samples for
    // hours, so there is nothing to gain from refetching often.
    staleTime: 30 * 60 * 1000,
    retry: 1
  });

export const watchFeedOptions = (std: string) =>
  queryOptions({
    queryKey: youtubeKeys.watch(std),
    queryFn: () => getWatchFeed(std),
    // Shorter than the benchmarks: this is the page you refresh to see whether
    // a rival just shipped something.
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

export const leaderboardOptions = (ws: string, days: number) =>
  queryOptions({
    queryKey: youtubeKeys.leaderboard(ws, days),
    queryFn: () => getLeaderboard(ws, days),
    staleTime: 10 * 60 * 1000,
    retry: 1
  });

export const channelDigestOptions = (query: string) =>
  queryOptions({
    queryKey: youtubeKeys.digest(query),
    queryFn: () => getChannelDigest(query),
    enabled: query.length > 0,
    // The digest costs a model call — keep it cached far longer than raw stats.
    staleTime: 30 * 60 * 1000,
    retry: 0
  });
