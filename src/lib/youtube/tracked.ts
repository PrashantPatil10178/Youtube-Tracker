import 'server-only';

import { db } from '@/db';
import { trackedChannel } from '@/db/tracking-schema';
import {
  ROSTER,
  type RosterChannel,
  type RosterGroup,
  type Standard
} from '@/features/youtube/config/roster';
import { asc, and, eq } from 'drizzle-orm';

import { getMembershipMap } from './workspaces';

/**
 * A user's tracked-channel list, server-side.
 *
 * Previously this lived only in localStorage, which meant the Channels page and
 * every analysis page disagreed: adding a channel there changed one card grid
 * and nothing else, because Videos, Insights and Watch all read the hardcoded
 * roster. One server-side list is what makes "tracked" mean the same thing
 * everywhere.
 */

const GROUPS: RosterGroup[] = ['own', 'faculty', 'ssc', 'hsc'];

function parseStandards(raw: string): Standard[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is Standard => [9, 10, 11, 12].includes(n as number));
  } catch {
    // A malformed row should render everywhere rather than nowhere.
    return [];
  }
}

function toRosterChannel(
  row: typeof trackedChannel.$inferSelect,
  workspaceIds: string[] = []
): RosterChannel {
  return {
    id: row.channelId,
    rowId: row.id,
    workspaceIds,
    label: row.title ?? row.channelId,
    group: (GROUPS.includes(row.groupKey as RosterGroup) ? row.groupKey : 'ssc') as RosterGroup,
    standards: parseStandards(row.standards),
    note: row.note ?? '',
    addedAt: row.createdAt.toISOString()
  };
}

/**
 * The user's channels, seeding the curated roster on first use.
 *
 * Seeding here rather than at sign-up keeps the two paths from diverging: a
 * user created before this existed still gets a populated dashboard.
 */
export async function getTrackedChannels(userId: string): Promise<RosterChannel[]> {
  const rows = await db
    .select()
    .from(trackedChannel)
    .where(eq(trackedChannel.userId, userId))
    .orderBy(asc(trackedChannel.createdAt));

  if (rows.length > 0) {
    const membership = await getMembershipMap(userId);
    return rows.map((row) => toRosterChannel(row, membership.get(row.id) ?? []));
  }

  await seedRoster(userId);

  const seeded = await db
    .select()
    .from(trackedChannel)
    .where(eq(trackedChannel.userId, userId))
    .orderBy(asc(trackedChannel.createdAt));

  const membership = await getMembershipMap(userId);
  return seeded.map((row) => toRosterChannel(row, membership.get(row.id) ?? []));
}

export async function seedRoster(userId: string) {
  await db
    .insert(trackedChannel)
    .values(
      ROSTER.map((channel, index) => ({
        id: crypto.randomUUID(),
        userId,
        channelId: channel.id,
        handle: channel.id.startsWith('@') ? channel.id : null,
        title: channel.label,
        groupKey: channel.group,
        standards: JSON.stringify(channel.standards),
        note: channel.note,
        // Spaced so insertion order survives; identical timestamps would sort
        // arbitrarily and shuffle the roster between page loads.
        createdAt: new Date(Date.now() + index)
      }))
    )
    .onConflictDoNothing();
}

export async function addTrackedChannel(
  userId: string,
  input: { channelId: string; title?: string; group?: RosterGroup; standards?: Standard[] }
) {
  await db
    .insert(trackedChannel)
    .values({
      id: crypto.randomUUID(),
      userId,
      channelId: input.channelId,
      handle: input.channelId.startsWith('@') ? input.channelId : null,
      title: input.title ?? input.channelId,
      groupKey: input.group ?? 'ssc',
      // No standards means "show in every workspace" — the safe default when
      // we don't know which cohort a hand-added channel serves.
      standards: JSON.stringify(input.standards ?? []),
      note: 'Added by you'
    })
    .onConflictDoNothing();
}

/**
 * Updates how a channel is filed.
 *
 * Only the fields supplied are touched — an update that sets the group must not
 * silently blank the standards, which is what a whole-row write would do.
 */
export async function updateTrackedChannel(
  userId: string,
  channelId: string,
  patch: { title?: string; group?: RosterGroup; standards?: Standard[] }
) {
  const values: Partial<typeof trackedChannel.$inferInsert> = {};
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.group !== undefined) values.groupKey = patch.group;
  if (patch.standards !== undefined) values.standards = JSON.stringify(patch.standards);

  if (Object.keys(values).length === 0) return;

  await db
    .update(trackedChannel)
    .set(values)
    .where(and(eq(trackedChannel.userId, userId), eq(trackedChannel.channelId, channelId)));
}

export async function removeTrackedChannel(userId: string, channelId: string) {
  await db
    .delete(trackedChannel)
    .where(and(eq(trackedChannel.userId, userId), eq(trackedChannel.channelId, channelId)));
}

/** Drops the user's list and reinstates the curated roster. */
export async function resetTrackedChannels(userId: string) {
  await db.delete(trackedChannel).where(eq(trackedChannel.userId, userId));
  await seedRoster(userId);
}
