import 'server-only';

import type { RosterChannel } from '@/features/youtube/config/roster';

import { getChannelBaseline } from './baseline-cache';
import { fetchChannelSummary, fetchRecentVideos, resolveChannelId } from './client';
import { engagementRate, median, scoreVideo } from './metrics';
import { getChannelSample } from './sample-cache';
import { getChangesForChannels, getDeltasForChannels } from './snapshots';
import { classifyTitle, detectMedium } from './taxonomy';

/**
 * Workspace aggregations, shared by the route handlers and by server
 * components that prefetch them.
 *
 * These live outside the route handlers because a server component cannot call
 * its own HTTP endpoint — a relative `/api/...` fetch has no origin to resolve
 * against. Extracting the work here lets the page prefetch by calling the
 * function directly, while the route keeps serving the client.
 */

/**
 * Workspace scope: either every tracked channel, or one workspace's slug.
 *
 * A free-form slug rather than an enum — workspaces are user-defined now, so
 * the set of valid values isn't knowable at compile time. Unknown slugs fall
 * back to showing everything rather than an empty page, since a stale
 * bookmark should degrade to "all" and not to "nothing here".
 */
export type Workspace = string;

export function isWorkspace(value: string): value is Workspace {
  return /^[a-z0-9-]{1,60}$/.test(value) || value === 'all';
}

/**
 * Narrows a channel list to one workspace.
 *
 * A channel with no standards shows in every workspace — that is the safe
 * default for hand-added channels whose cohort we don't know, and better than
 * hiding them everywhere. `workspaceId` is resolved by the caller from the
 * slug, because only the caller knows the user; when the slug matches no
 * workspace the full list is returned — see the note on `Workspace`.
 */
function targetsFor(channels: RosterChannel[], workspaceId: string | null) {
  if (!workspaceId) return channels;
  return channels.filter((c) => c.workspaceIds?.includes(workspaceId));
}

/** Runs `job` over `items` with a bounded number of concurrent workers. */
async function pool<T>(items: T[], limit: number, job: (item: T) => Promise<void>) {
  const queue = [...items];
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await job(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker));
}

export type WorkspaceVideoRow = {
  channelId: string;
  channelLabel: string;
  videoId: string;
  title: string;
  url: string;
  thumbnail: string | null;
  publishedAt: string;
  views: number | null;
  vph: number | null;
  outlierScore: number | null;
  performance: string | null;
  provisional: boolean;
  engagement: number | null;
  subject: string | null;
  format: string | null;
  exam: string | null;
  intent: string;
  grade: number | null;
  medium: string | null;
};

/**
 * Every recent upload across the workspace, scored and classified.
 *
 * Videos come from InnerTube's channel listing, enriched with exact
 * views/likes for the slice returned (see `fetchRecentVideos`). This used to
 * be the RSS feed — one static-file request per channel — but RSS turned out
 * to have no uptime guarantee of its own (it started returning 404/500 for
 * every channel on 2026-08-04, taking every workspace page down with it).
 * The baselines these are scored against come from the cache, because a
 * 15-video window alone cannot form one for a daily-uploading channel.
 */
export async function computeWorkspaceVideos(
  channels: RosterChannel[],
  std: Workspace,
  workspaceId: string | null = null
) {
  const targets = targetsFor(channels, workspaceId);
  const videos: WorkspaceVideoRow[] = [];
  const failed: string[] = [];
  /** Channel label → subscribers, for share-of-workspace charts. */
  const subscribers: Array<[string, number | null]> = [];

  // Two roster entries can resolve to the same real channel — e.g. tracked
  // once by @handle and again by its UC… id/URL. Left unguarded, that
  // duplicates every one of that channel's videos in the list and produces
  // two rows sharing a React key downstream.
  const seenChannelIds = new Set<string>();

  // Lower than the old RSS-only pool (12): InnerTube is a live, rate-limitable
  // API rather than a static CDN file, and each channel now costs several
  // requests (listing + precise stats), not one.
  await pool(targets, 6, async (channel) => {
    try {
      const channelId = await resolveChannelId(channel.id);
      if (!channelId) {
        failed.push(channel.label);
        return;
      }
      if (seenChannelIds.has(channelId)) return;
      seenChannelIds.add(channelId);

      // precise: false — one request per video is fine for a single channel
      // (see the analytics/digest routes) but not fanned out across a whole
      // workspace here; the channel listing's own rounded views are enough
      // for a "what's new" list.
      const [recent, summary] = await Promise.all([
        fetchRecentVideos(channelId, 15, { precise: false }),
        fetchChannelSummary(channelId).catch(() => null)
      ]);
      subscribers.push([channel.label, summary?.subscribers ?? null]);

      // Scored against this channel's own median, never a pooled one: a 500K
      // channel and a 17K channel share no meaningful absolute baseline.
      const baseline = await getChannelBaseline(channelId, recent);

      for (const source of recent) {
        const video = scoreVideo(source, baseline);
        const classification = classifyTitle(video.title, source.keywords);

        videos.push({
          channelId,
          channelLabel: channel.label,
          videoId: video.videoId,
          title: video.title,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          thumbnail: source.thumbnail,
          publishedAt: video.publishedAt,
          views: video.views,
          vph: video.vph,
          // Suppressed rather than shown as a confident number: with an
          // unreliable baseline the ratio is arithmetic, not a signal.
          outlierScore: baseline.reliable ? video.outlierScore : null,
          performance: baseline.reliable ? video.performance : null,
          provisional: video.provisional,
          engagement: engagementRate(video),
          subject: classification.subject,
          format: classification.format,
          exam: classification.exam,
          intent: classification.intent,
          grade: classification.grade,
          medium: detectMedium(video.title)
        });
      }
    } catch {
      failed.push(channel.label);
    }
  });

  videos.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return {
    standard: std,
    channelCount: targets.length - failed.length,
    videoCount: videos.length,
    failed,
    subscribers,
    videos
  };
}

/**
 * Label for videos that matched nothing on an axis. Shared by the benchmark
 * buckets and the content mix: they were briefly '(unclassified)' and '(none)'
 * respectively, which silently broke the overview's lookup of a channel's top
 * format whenever that format was the null bucket.
 */
const UNCLASSIFIED = '(unclassified)';

/** Below this, a bucket's median is noise wearing a number's clothes. */
const MIN_BUCKET = 5;

type Bucket = { key: string; median: number; count: number; share: number };

function bucketise(rows: Array<{ key: string | null; score: number }>) {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = row.key ?? UNCLASSIFIED;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row.score);
  }

  const all: Bucket[] = [...groups].map(([key, scores]) => ({
    key,
    median: Number((median(scores) ?? 0).toFixed(2)),
    count: scores.length,
    share: Number(((scores.length / Math.max(rows.length, 1)) * 100).toFixed(1))
  }));

  return {
    ranked: all.filter((b) => b.count >= MIN_BUCKET).toSorted((a, b) => b.median - a.median),
    thin: all.filter((b) => b.count < MIN_BUCKET).toSorted((a, b) => b.count - a.count)
  };
}

/** Share of output by format, for one set of classified videos. */
function formatMix(set: Array<{ c: { format: string | null } }>) {
  const counts = new Map<string, number>();
  for (const row of set) {
    const key = row.c.format ?? UNCLASSIFIED;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([key, n]) => ({ key, share: Number(((n / Math.max(set.length, 1)) * 100).toFixed(1)) }))
    .toSorted((a, b) => b.share - a.share)
    .slice(0, 6);
}

/**
 * Benchmarks: which formats, subjects, exams and intents outperform.
 *
 * Mature videos only. A provisional score answers "is this doing well for its
 * age", which is a different question from "does this format work", and mixing
 * the two lets a handful of fresh uploads swing a benchmark.
 */
export async function computeWorkspaceInsights(
  channels: RosterChannel[],
  std: Workspace,
  workspaceId: string | null = null
) {
  const targets = targetsFor(channels, workspaceId);
  const failed: string[] = [];
  const rows: Array<{
    score: number;
    title: string;
    channelLabel: string;
    isOwn: boolean;
    videoId: string;
    keywords: string[];
  }> = [];

  // Two roster entries can resolve to the same real channel — e.g. tracked
  // once by @handle and again by its UC… id/URL. Left unguarded, that scores
  // the same videos twice and produces two "top" rows sharing a React key.
  const seenChannelIds = new Set<string>();

  await pool(targets, 5, async (channel) => {
    try {
      const channelId = await resolveChannelId(channel.id);
      if (!channelId) {
        failed.push(channel.label);
        return;
      }
      if (seenChannelIds.has(channelId)) return;
      seenChannelIds.add(channelId);

      const sample = await getChannelSample(channelId);
      if (!sample.baseline.reliable) return;

      for (const video of sample.videos) {
        if (video.outlierScore === null || video.provisional) continue;
        rows.push({
          score: video.outlierScore,
          title: video.title,
          channelLabel: channel.label,
          isOwn: channel.group === 'own',
          videoId: video.videoId,
          keywords: video.keywords ?? []
        });
      }
    } catch {
      failed.push(channel.label);
    }
  });

  const classified = rows.map((r) => ({ ...r, c: classifyTitle(r.title, r.keywords) }));
  const by = (pick: (c: ReturnType<typeof classifyTitle>) => string | null) =>
    bucketise(classified.map((r) => ({ key: pick(r.c), score: r.score })));

  return {
    standard: std,
    channelCount: targets.length - failed.length,
    sampleSize: rows.length,
    failed,
    minBucket: MIN_BUCKET,
    format: by((c) => c.format),
    subject: by((c) => c.subject),
    exam: by((c) => c.exam),
    intent: by((c) => c.intent),
    top: classified
      .toSorted((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => ({
        title: r.title,
        channelLabel: r.channelLabel,
        score: r.score,
        url: `https://www.youtube.com/watch?v=${r.videoId}`,
        format: r.c.format,
        intent: r.c.intent,
        subject: r.c.subject
      })),
    contentMix: {
      own: formatMix(classified.filter((r) => r.isOwn)),
      rival: formatMix(classified.filter((r) => !r.isOwn)),
      ownSample: classified.filter((r) => r.isOwn).length,
      rivalSample: classified.filter((r) => !r.isOwn).length
    }
  };
}

/** How far back the watch feed looks for new uploads. */
const WATCH_WINDOW_HOURS = 72;

export type WatchEvent =
  | {
      kind: 'upload';
      at: string;
      channelLabel: string;
      isOwn: boolean;
      title: string;
      url: string;
      thumbnail: string | null;
      views: number | null;
      outlierScore: number | null;
      format: string | null;
      intent: string;
    }
  | {
      kind: 'edit';
      at: string;
      channelLabel: string;
      isOwn: boolean;
      field: 'title';
      previousValue: string | null;
      newValue: string | null;
      viewsAtChange: number | null;
      url: string;
    };

/**
 * Competitor activity feed: new uploads plus detected title/thumbnail swaps.
 *
 * The swaps are the closest observable proxy for a rival's own A/B test —
 * YouTube never exposes the test itself, but re-titling a live video is a
 * visible act, and we only see it because every analytics read snapshots the
 * channel. That means edit coverage depends on how often a channel has been
 * viewed, which is why an empty edit list means "not yet observed", not
 * "nothing changed".
 */
export async function computeWatchFeed(
  channels: RosterChannel[],
  std: Workspace,
  workspaceId: string | null = null
) {
  const targets = targetsFor(channels, workspaceId);
  const { videos, failed, channelCount } = await computeWorkspaceVideos(channels, std, workspaceId);

  const cutoff = Date.now() - WATCH_WINDOW_HOURS * 36e5;
  const ownLabels = new Set(targets.filter((c) => c.group === 'own').map((c) => c.label));

  const uploads: WatchEvent[] = videos
    .filter((v) => Date.parse(v.publishedAt) >= cutoff)
    .map((v) => ({
      kind: 'upload' as const,
      at: v.publishedAt,
      channelLabel: v.channelLabel,
      isOwn: ownLabels.has(v.channelLabel),
      title: v.title,
      url: v.url,
      thumbnail: v.thumbnail,
      views: v.views,
      outlierScore: v.outlierScore,
      format: v.format,
      intent: v.intent
    }));

  // Channel ids come from the video rows, which already resolved them — no
  // point paying for a second round of handle resolution.
  const idByLabel = new Map(videos.map((v) => [v.channelLabel, v.channelId]));
  const channelIds = [...new Set(videos.map((v) => v.channelId))];

  const [changeRows, deltas] = await Promise.all([
    getChangesForChannels(channelIds, 50).catch(() => []),
    getDeltasForChannels(channelIds).catch(() => new Map())
  ]);

  const labelById = new Map([...idByLabel].map(([label, id]) => [id, label]));

  const edits: WatchEvent[] = changeRows.map((row) => ({
    kind: 'edit' as const,
    at: row.detectedAt.toISOString(),
    channelLabel: labelById.get(row.channelId) ?? row.channelId,
    isOwn: ownLabels.has(labelById.get(row.channelId) ?? ''),
    field: row.field,
    previousValue: row.previousValue,
    newValue: row.newValue,
    viewsAtChange: row.viewsAtChange,
    url: `https://www.youtube.com/watch?v=${row.videoId}`
  }));

  const events = [...uploads, ...edits].toSorted((a, b) => Date.parse(b.at) - Date.parse(a.at));

  // Entries whose movement is within YouTube's display rounding are dropped
  // rather than shown: "+100 subs in 1.5h" on a channel reported to the nearest
  // hundred is a rounding step wearing a growth number's clothes.
  const growth = [...deltas]
    .map(([id, delta]) => ({ channelLabel: labelById.get(id) ?? id, ...delta! }))
    .filter((g) => g.subscribers !== null && !g.subscribersWithinRounding)
    .toSorted((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0));

  return {
    standard: std,
    windowHours: WATCH_WINDOW_HOURS,
    channelCount,
    failed,
    uploadCount: uploads.length,
    editCount: edits.length,
    events,
    growth
  };
}
