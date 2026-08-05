import 'server-only';

import type { RosterChannel } from '@/features/youtube/config/roster';

import { fetchChannelSummary, fetchChannelVideos, resolveChannelId } from './client';
import { getChannelDelta } from './snapshots';

/**
 * Cross-channel leaderboards: who published most, who gained most.
 *
 * Modelled on CompetitorScope's leaderboard, with two deliberate differences.
 *
 * Subscriber gain is **suppressed when it falls inside YouTube's display
 * rounding**. YouTube publishes counts to three significant figures, so a
 * channel reported at 45,000 could have moved anywhere from +1 to +199 and show
 * "+100". CompetitorScope ranks on those numbers; a leaderboard built from
 * rounding steps ranks noise.
 *
 * Upload counts are a floor rather than an exact figure whenever a channel
 * published more than one fetch's limit can show, or has undated Shorts in the
 * window — the Shorts shelf carries no date signal at all, so those can't be
 * placed in a window and are dropped rather than guessed at. Flagged, not
 * silently rounded down. This used to union RSS (exact timestamps, capped at
 * 15) with the deep listing for the best floor available from one read; RSS
 * stopped resolving entirely as of 2026-08-04 (404/500 for every channel), so
 * the deep listing — which already merges Videos, Shorts and Live — is now the
 * only source.
 */

export type LeaderboardRow = {
  channelId: string;
  label: string;
  handle: string | null;
  avatar: string | null;
  subscribers: number | null;
  /** Uploads inside the window. */
  uploads: number;
  /**
   * True when the real count is higher than reported and unknowable from a
   * single read — display as "≥ N", never as an exact figure.
   */
  uploadsTruncated: boolean;
  /** Views accumulated by those uploads — a floor, not lifetime channel views. */
  windowViews: number;
  /** Null when no history exists, or when movement is inside display rounding. */
  subscriberGain: number | null;
  /** Why a gain is missing, so the UI never implies zero growth. */
  gainStatus: 'measured' | 'no-history' | 'within-rounding';
  spanHours: number | null;
};

export type Leaderboard = {
  windowDays: number;
  rows: LeaderboardRow[];
  failed: string[];
  /** Channels whose subscriber movement could be measured at all. */
  measuredCount: number;
};

async function poolMap<T, R>(items: T[], limit: number, job: (item: T) => Promise<R | null>) {
  const out: R[] = [];
  const queue = [...items];
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      const result = await job(item);
      if (result !== null) out.push(result);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker));
  return out;
}

/**
 * How many uploads a single deep-listing read walks each of the Videos/Shorts/
 * Live tabs to. Reaching this on any tab is the truncation signal — it means
 * there may be more uploads in the window than this read can see.
 */
const DEEP_LIMIT = 120;

export async function computeLeaderboard(
  channels: RosterChannel[],
  windowDays = 7
): Promise<Leaderboard> {
  const cutoff = Date.now() - windowDays * 24 * 36e5;
  const failed: string[] = [];

  // Two roster entries can resolve to the same real channel — e.g. tracked
  // once by @handle and again by its UC… id/URL. Left unguarded, that ranks
  // the same channel twice and produces two rows sharing a React key
  // downstream.
  const seenChannelIds = new Set<string>();

  const rows = await poolMap(channels, 8, async (channel) => {
    try {
      const channelId = await resolveChannelId(channel.id);
      if (!channelId) {
        failed.push(channel.label);
        return null;
      }
      if (seenChannelIds.has(channelId)) return null;
      seenChannelIds.add(channelId);

      const [summary, deep, delta] = await Promise.all([
        fetchChannelSummary(channelId),
        fetchChannelVideos(channelId, DEEP_LIMIT),
        getChannelDelta(channelId, windowDays * 24).catch(() => null)
      ]);

      // Undated Shorts (the Shorts shelf carries no date signal at all) can't
      // be placed in a window and are dropped rather than guessed at.
      const inWindow = deep.filter((v) => v.publishedAt && Date.parse(v.publishedAt) >= cutoff);

      const seen = new Map<string, number | null>();
      for (const v of inWindow) seen.set(v.videoId, v.views);

      const uploads = seen.size;
      const uploadsTruncated = deep.length >= DEEP_LIMIT;

      // `windowViews` sums only the uploads inside the window. It is a floor:
      // views arriving on older videos are invisible to it. Named accordingly
      // rather than presented as total channel views for the period.
      const windowViews = [...seen.values()].reduce<number>((sum, v) => sum + (v ?? 0), 0);

      const gainStatus: LeaderboardRow['gainStatus'] = !delta
        ? 'no-history'
        : delta.subscribersWithinRounding
          ? 'within-rounding'
          : 'measured';

      return {
        channelId,
        label: channel.label,
        handle: summary.handle,
        avatar: summary.avatar,
        subscribers: summary.subscribers,
        uploads,
        uploadsTruncated,
        windowViews,
        subscriberGain: gainStatus === 'measured' ? delta!.subscribers : null,
        gainStatus,
        spanHours: delta?.spanHours ?? null
      } satisfies LeaderboardRow;
    } catch {
      failed.push(channel.label);
      return null;
    }
  });

  return {
    windowDays,
    rows,
    failed,
    measuredCount: rows.filter((r) => r.gainStatus === 'measured').length
  };
}
