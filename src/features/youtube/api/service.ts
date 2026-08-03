// ============================================================
// YouTube Service — Data Access Layer
// ============================================================
// Route handlers under src/app/api/youtube/* own the network calls, because
// youtubei.js is server-only. This layer is the single place the client talks
// to them, so swapping in a database or a background sync later means editing
// only this file.
// ============================================================

import type {
  ChannelAnalytics,
  ChannelDigest,
  ChannelSearchResponse,
  ThumbnailCandidateInput,
  ThumbnailComparison,
  IdeasResult,
  Leaderboard,
  TopicResearch,
  WatchFeed,
  WorkspaceInsights,
  WorkspaceVideos
} from './types';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (HTTP ${res.status})`;
    throw new Error(message);
  }

  return body as T;
}

export function getChannelAnalytics(query: string): Promise<ChannelAnalytics> {
  return getJson<ChannelAnalytics>(`/api/youtube/analytics?q=${encodeURIComponent(query)}`);
}

export function searchChannels(query: string): Promise<ChannelSearchResponse> {
  return getJson<ChannelSearchResponse>(`/api/youtube/search?q=${encodeURIComponent(query)}`);
}

export function getWorkspaceVideos(std: string): Promise<WorkspaceVideos> {
  return getJson<WorkspaceVideos>(`/api/youtube/videos?std=${encodeURIComponent(std)}`);
}

export function getWorkspaceInsights(std: string): Promise<WorkspaceInsights> {
  return getJson<WorkspaceInsights>(`/api/youtube/insights?std=${encodeURIComponent(std)}`);
}

export function getWatchFeed(std: string): Promise<WatchFeed> {
  return getJson<WatchFeed>(`/api/youtube/watch?std=${encodeURIComponent(std)}`);
}

export function researchKeywords(seed: string): Promise<TopicResearch> {
  return getJson<TopicResearch>(`/api/youtube/keywords?q=${encodeURIComponent(seed)}`);
}

export function generateIdeas(std: string, seed?: string): Promise<IdeasResult> {
  const params = new URLSearchParams({ std });
  if (seed) params.set('seed', seed);
  return getJson<IdeasResult>(`/api/ai/ideas?${params.toString()}`);
}

export function getLeaderboard(ws: string, days: number): Promise<Leaderboard> {
  return getJson<Leaderboard>(`/api/youtube/leaderboard?ws=${encodeURIComponent(ws)}&days=${days}`);
}

export function getChannelDigest(query: string): Promise<ChannelDigest> {
  return getJson<ChannelDigest>(`/api/ai/digest?q=${encodeURIComponent(query)}`);
}

export async function compareThumbnails(
  candidates: ThumbnailCandidateInput[]
): Promise<ThumbnailComparison> {
  const res = await fetch('/api/ai/thumbnails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidates })
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (HTTP ${res.status})`
    );
  }
  return body as ThumbnailComparison;
}
