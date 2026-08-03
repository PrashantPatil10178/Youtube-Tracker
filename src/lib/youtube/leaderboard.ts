import 'server-only';

import type { RosterChannel } from '@/features/youtube/config/roster';

import { resolveChannelId } from './client';
import { fetchChannelSummary } from './client';
import { fetchChannelVideos } from './client';
import { fetchChannelFeed } from './rss';
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
 * published more than the RSS feed's 15-item window can show — flagged, not
 * silently rounded down. An exact count needs accumulated nightly history,
 * which the snapshot tables build over time.
 */

export type LeaderboardRow = {
  channelId: string;
  label: string;
  handle: string | null;
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

export async function computeLeaderboard(
  channels: RosterChannel[],
  windowDays = 7
): Promise<Leaderboard> {
  const cutoff = Date.now() - windowDays * 24 * 36e5;
  const failed: string[] = [];

  const rows = await poolMap(channels, 8, async (channel) => {
    try {
      const channelId = await resolveChannelId(channel.id);
      if (!channelId) {
        failed.push(channel.label);
        return null;
      }

      const [summary, feed, delta] = await Promise.all([
        fetchChannelSummary(channelId),
        fetchChannelFeed(channelId),
        getChannelDelta(channelId, windowDays * 24).catch(() => null)
      ]);

      const rssRecent = feed.videos.filter((v) => Date.parse(v.publishedAt) >= cutoff);

      // Neither source alone can count uploads in a window:
      //   - RSS carries exact timestamps but stops at 15 items.
      //   - The deep Videos tab goes deeper but omits Shorts and live streams,
      //     which for these channels is a large share of output.
      // Union them by video id for the best floor available from one read, and
      // flag the result as truncated when RSS was saturated, since the true
      // number is then unknown and strictly larger.
      const rssSaturated = feed.videos.length >= 15 && rssRecent.length === feed.videos.length;

      const seen = new Map<string, number | null>();
      for (const v of rssRecent) seen.set(v.videoId, v.views);

      if (rssSaturated) {
        const deep = await fetchChannelVideos(channelId, 120).catch(() => []);
        for (const v of deep) {
          if (!v.publishedAt || Date.parse(v.publishedAt) < cutoff) continue;
          if (!seen.has(v.videoId)) seen.set(v.videoId, v.views);
        }
      }

      const uploads = seen.size;
      const uploadsTruncated = rssSaturated;

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
