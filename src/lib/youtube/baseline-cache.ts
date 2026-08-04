import 'server-only';

import { fetchChannelVideos } from './client';
import type { ChannelBaseline, VideoStat } from './metrics';
import { scoreVideos } from './metrics';

/**
 * Per-channel baselines, cached.
 *
 * A channel's median view count is the denominator of every outlier score, and
 * it moves slowly — over weeks, not hours. Recomputing it per request is what
 * made the cross-channel view unaffordable: a 15-video window alone can't
 * produce one for a daily-uploading channel (nothing in it is old enough to
 * be mature), and a deep walk per channel per request costs minutes.
 *
 * So: compute once from deep history, reuse for a few hours, and score the
 * cheap recent-uploads slice against it.
 *
 * In-process rather than in the database on purpose — it is derived data with
 * a short life, and a cold cache costs one extra fetch rather than a wrong
 * answer. Pinned to globalThis so dev hot-reloads don't clear it.
 */
const TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Much shorter TTL for a result that is degraded because an upstream call
 * failed, rather than because the channel genuinely lacks history.
 *
 * Without this split, one transient InnerTube blip caches an unreliable
 * baseline for six hours — the channel silently loses every outlier score for
 * the rest of the day, with nothing on screen explaining why.
 */
const DEGRADED_TTL_MS = 5 * 60 * 1000;

/**
 * Bumped whenever ChannelBaseline's shape or scoring semantics change. Without
 * it, entries written by an older build survive the reload and are scored
 * against by code that expects fields they don't carry.
 */
const SCHEMA_VERSION = 2;

type Entry = { baseline: ChannelBaseline; expiresAt: number; version: number };

const globalForBaselines = globalThis as unknown as {
  channelBaselineCache?: Map<string, Entry>;
};

const cache = (globalForBaselines.channelBaselineCache ??= new Map<string, Entry>());

/**
 * The channel's baseline, from the caller's already-fetched videos when
 * given, and from deep history otherwise — callers suppress scores when the
 * result comes back unreliable rather than this throwing.
 */
export async function getChannelBaseline(
  channelId: string,
  knownVideos?: VideoStat[]
): Promise<ChannelBaseline> {
  const cached = cache.get(channelId);
  if (cached && cached.version === SCHEMA_VERSION && cached.expiresAt > Date.now()) {
    return cached.baseline;
  }

  const feed =
    knownVideos ??
    (await fetchChannelVideos(channelId, 90)).flatMap((v) =>
      v.publishedAt && v.views !== null
        ? [{ videoId: v.videoId, title: v.title, publishedAt: v.publishedAt, views: v.views }]
        : []
    );
  let { baseline } = scoreVideos(feed);

  let degraded = false;

  if (!baseline.reliable) {
    const deep = await fetchChannelVideos(channelId, 90).catch(() => {
      degraded = true;
      return [];
    });
    const usable = deep
      .filter((v) => v.publishedAt && v.views !== null)
      .map((v) => ({
        videoId: v.videoId,
        title: v.title,
        publishedAt: v.publishedAt as string,
        views: v.views
      }));

    if (usable.length > feed.length) baseline = scoreVideos(usable).baseline;
  }

  // Cached even when unreliable: a channel too small or too new to have a
  // baseline stays that way for hours, and retrying every request is pure cost.
  // A failed fetch is different — that should be retried soon.
  cache.set(channelId, {
    baseline,
    expiresAt: Date.now() + (degraded ? DEGRADED_TTL_MS : TTL_MS),
    version: SCHEMA_VERSION
  });
  return baseline;
}
