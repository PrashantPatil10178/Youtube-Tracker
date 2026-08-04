import 'server-only';

import { fetchChannelVideos, fetchPreciseStats } from './client';
import type { ChannelBaseline, VideoMetrics, VideoStat } from './metrics';
import { scoreVideos } from './metrics';

/**
 * A channel's full scored sample, from InnerTube deep history.
 *
 * Used to fetch RSS first and fall back to a deep walk only when RSS's
 * 15-item window couldn't form a baseline. RSS (`fetchChannelFeed`) turned
 * out to have no uptime guarantee of its own — it started returning 404/500
 * for every channel on 2026-08-04 — so deep history is now the only source;
 * see `fetchRecentVideos` in `client.ts` for the same change applied to the
 * shallower "recent uploads" callers.
 *
 * The insights page needs every channel's whole history at once, which is far
 * too expensive to rebuild per request: a deep walk plus per-video precision
 * calls runs ~8s for one channel. Cached, a ten-channel aggregate becomes
 * sub-second.
 *
 * Separate from the baseline cache because the two have different shapes and
 * costs — a baseline is a handful of numbers, this is ~90 scored videos.
 */
const TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Shorter TTL when the sample is degraded by an upstream failure rather than by
 * the channel's own history. Caching a fetch failure for six hours turns a
 * momentary blip into a day of thin data.
 */
const DEGRADED_TTL_MS = 5 * 60 * 1000;

/** Bump when the scoring semantics or the stored shape change. */
const SCHEMA_VERSION = 1;

/** Matches the analytics route, so both paths agree on what "exact" means. */
const PRECISE_LIMIT = 25;

export type ChannelSample = {
  channelId: string;
  baseline: ChannelBaseline;
  videos: VideoMetrics[];
  source: 'rss' | 'deep';
  preciseCount: number;
};

type Entry = { sample: ChannelSample; expiresAt: number; version: number };

const globalForSamples = globalThis as unknown as { channelSampleCache?: Map<string, Entry> };
const cache = (globalForSamples.channelSampleCache ??= new Map<string, Entry>());

export async function getChannelSample(channelId: string): Promise<ChannelSample> {
  const cached = cache.get(channelId);
  if (cached && cached.version === SCHEMA_VERSION && cached.expiresAt > Date.now()) {
    return cached.sample;
  }

  let degraded = false;

  const deep = await fetchChannelVideos(channelId, 90).catch(() => {
    degraded = true;
    return [];
  });
  let source: VideoStat[] = deep
    .filter((v) => v.publishedAt && v.views !== null)
    .map((v) => ({
      videoId: v.videoId,
      title: v.title,
      publishedAt: v.publishedAt as string,
      views: v.views
    }));

  // The deep listing rounds view counts; the newest slice gets exact ones so
  // the numbers driving the benchmarks aren't 7% off.
  const newest = source
    .toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, PRECISE_LIMIT);

  const precise = await fetchPreciseStats(newest.map((v) => v.videoId)).catch(() => {
    degraded = true;
    return new Map<string, { views: number | null; likes: number | null; keywords: string[] }>();
  });

  let preciseCount = 0;
  if (precise.size > 0) {
    // Likes and keywords ride along with the exact view count — the same
    // `getInfo` call already returns them, so there's no extra cost to
    // carrying them into the scored sample for engagement and classification
    // to use downstream.
    source = source.map((v) => {
      const exact = precise.get(v.videoId);
      if (!exact) return v;
      return {
        ...v,
        views: exact.views ?? v.views,
        likes: exact.likes,
        keywords: exact.keywords
      };
    });
    preciseCount = precise.size;
  }

  const { baseline, videos } = scoreVideos(source);
  const sample: ChannelSample = { channelId, baseline, videos, source: 'deep', preciseCount };

  cache.set(channelId, {
    sample,
    expiresAt: Date.now() + (degraded ? DEGRADED_TTL_MS : TTL_MS),
    version: SCHEMA_VERSION
  });
  return sample;
}
