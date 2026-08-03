import 'server-only';

import { db } from '@/db';
import { channelSnapshot, videoChange, videoSnapshot } from '@/db/tracking-schema';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';

import { diffReadings, normaliseThumb } from './snapshot-diff';
import type { DetectedChange, SnapshotSource, SnapshotVideo } from './snapshot-diff';

// Re-exported so callers keep importing from one place even though the pure
// comparison now lives in its own module.
export type { DetectedChange, PriorReading, SnapshotSource, SnapshotVideo } from './snapshot-diff';
export { diffReadings } from './snapshot-diff';

export type ChannelDelta = {
  /** Hours between the two readings being compared. */
  spanHours: number;
  subscribers: number | null;
  totalViews: number | null;
  /**
   * True when the subscriber delta is no larger than YouTube's own display
   * rounding, so it cannot be distinguished from a rounding step.
   */
  subscribersWithinRounding: boolean;
} | null;

const id = () => crypto.randomUUID();

/** Below this, consecutive readings are noise rather than growth. */
const MIN_SPAN_HOURS = 1;

const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

/**
 * YouTube publishes subscriber counts to three significant figures — 44,900
 * then 45,000, never the true number. The gap between two displayed values is
 * therefore quantised, and a delta of one step tells you only that the count
 * crossed a boundary, not that it grew by that much.
 */
function displayQuantum(value: number): number {
  if (value <= 0) return 1;
  return Math.max(1, 10 ** Math.max(0, Math.floor(Math.log10(value)) - 2));
}

/**
 * Records a reading and returns anything that changed since the last one.
 *
 * Called on every analytics fetch, so history accumulates as a side effect of
 * normal use rather than needing a separate cron.
 */
export async function captureSnapshot(
  channelId: string,
  channel: {
    subscribers: number | null;
    totalViews: number | null;
    videoCount: number | null;
  },
  videos: SnapshotVideo[],
  source: SnapshotSource
): Promise<DetectedChange[]> {
  // Same-source only. YouTube serves different title variants on different
  // surfaces, so an RSS reading and a channel-listing reading of the same video
  // can legitimately disagree at the same instant. Comparing across them
  // reported that disagreement as a creator edit — a false positive that made
  // titles appear to oscillate whenever this route switched sources.
  const previous = await db
    .select()
    .from(videoSnapshot)
    .where(and(eq(videoSnapshot.channelId, channelId), eq(videoSnapshot.source, source)))
    .orderBy(desc(videoSnapshot.capturedAt))
    .limit(400);

  const now = new Date();
  const changes = diffReadings(previous, videos, now);

  await db.insert(channelSnapshot).values({
    id: id(),
    channelId,
    subscribers: channel.subscribers,
    totalViews: channel.totalViews,
    videoCount: channel.videoCount,
    capturedAt: now
  });

  if (videos.length > 0) {
    await db.insert(videoSnapshot).values(
      videos.map((v) => ({
        id: id(),
        channelId,
        videoId: v.videoId,
        title: v.title,
        thumbnail: normaliseThumb(v.thumbnail),
        views: v.views,
        source,
        capturedAt: now
      }))
    );
  }

  if (changes.length > 0) {
    await db.insert(videoChange).values(
      changes.map((c) => ({
        id: id(),
        channelId,
        videoId: c.videoId,
        field: c.field,
        previousValue: c.previousValue,
        newValue: c.newValue,
        viewsAtChange: c.viewsAtChange,
        detectedAt: now
      }))
    );
  }

  return changes;
}

/**
 * Growth between the newest snapshot and the oldest one still inside `withinHours`.
 *
 * Returns null until two readings exist — deliberately, rather than reporting a
 * fake zero, so the UI can say "not enough history yet".
 */
export async function getChannelDelta(
  channelId: string,
  withinHours = 24 * 30
): Promise<ChannelDelta> {
  const since = new Date(Date.now() - withinHours * 36e5);

  const rows = await db
    .select()
    .from(channelSnapshot)
    .where(and(eq(channelSnapshot.channelId, channelId), gte(channelSnapshot.capturedAt, since)))
    .orderBy(desc(channelSnapshot.capturedAt))
    .limit(200);

  if (rows.length < 2) return null;

  const newest = rows[0];
  const oldest = rows[rows.length - 1];
  const spanHours = (newest.capturedAt.getTime() - oldest.capturedAt.getTime()) / 36e5;

  // Two reads seconds apart are not history: subscriber counts are rounded and
  // barely move, so a sub-hour span reports a confident-looking "+0" that is
  // really just "we haven't watched long enough".
  if (spanHours < MIN_SPAN_HOURS) return null;

  const subscribers = diff(newest.subscribers, oldest.subscribers);
  const quantum = displayQuantum(newest.subscribers ?? 0);

  return {
    spanHours: Number(spanHours.toFixed(1)),
    subscribers,
    totalViews: diff(newest.totalViews, oldest.totalViews),
    subscribersWithinRounding: subscribers !== null && Math.abs(subscribers) <= quantum
  };
}

/** Recent title/thumbnail swaps for a channel, newest first. */
export async function getRecentChanges(channelId: string, limit = 20) {
  return db
    .select()
    .from(videoChange)
    .where(eq(videoChange.channelId, channelId))
    .orderBy(desc(videoChange.detectedAt))
    .limit(limit);
}

/** Recent swaps across many channels at once, for the watch feed. */
export async function getChangesForChannels(channelIds: string[], limit = 50) {
  if (channelIds.length === 0) return [];
  return db
    .select()
    .from(videoChange)
    .where(inArray(videoChange.channelId, channelIds))
    .orderBy(desc(videoChange.detectedAt))
    .limit(limit);
}

/**
 * Growth per channel, for channels that have enough history.
 *
 * Runs the single-channel query per id rather than one grouped statement: the
 * span check and the two-reading minimum live in `getChannelDelta`, and
 * duplicating that logic in SQL is how the two would drift apart.
 */
export async function getDeltasForChannels(channelIds: string[]) {
  const entries = await Promise.all(
    channelIds.map(async (id) => [id, await getChannelDelta(id).catch(() => null)] as const)
  );
  return new Map(entries.filter(([, delta]) => delta !== null));
}
