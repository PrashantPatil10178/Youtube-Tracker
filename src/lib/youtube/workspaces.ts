import 'server-only';

import { db } from '@/db';
import { channelWorkspace, trackedChannel, workspace } from '@/db/tracking-schema';
import { and, asc, eq, inArray } from 'drizzle-orm';

/**
 * User-defined workspaces.
 *
 * The previous model hardcoded Class 9-12, which only fit one board and one age
 * range. Groupings are now rows, so "Class 8", "Personal channels" or anything
 * else works the same way.
 */

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  position: number;
  channelCount: number;
};

/** Default groupings for a new account, matching the seeded roster. */
const DEFAULTS = [
  { name: 'Class 9', slug: 'class-9', standards: [9] },
  { name: 'Class 10', slug: 'class-10', standards: [10] },
  { name: 'Class 11', slug: 'class-11', standards: [11] },
  { name: 'Class 12', slug: 'class-12', standards: [12] }
];

/**
 * Turns a name into a URL-safe slug.
 *
 * Devanagari and other non-Latin names collapse to nothing under a naive
 * `[a-z0-9]` filter, so a name in Marathi would silently produce an empty slug
 * and collide with every other one. Falling back to a stable random suffix
 * keeps those names usable.
 */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return base || `ws-${crypto.randomUUID().slice(0, 8)}`;
}

async function uniqueSlug(userId: string, desired: string): Promise<string> {
  const existing = await db
    .select({ slug: workspace.slug })
    .from(workspace)
    .where(eq(workspace.userId, userId));

  const taken = new Set(existing.map((row) => row.slug));
  if (!taken.has(desired)) return desired;

  for (let n = 2; n < 100; n++) {
    const candidate = `${desired}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${desired}-${crypto.randomUUID().slice(0, 6)}`;
}

/**
 * The user's workspaces, seeding defaults on first use.
 *
 * Seeding maps each tracked channel's `standards` into the matching default
 * workspace, so an account created before workspaces existed keeps exactly the
 * grouping it had rather than waking up to an empty switcher.
 */
export async function getWorkspaces(userId: string): Promise<Workspace[]> {
  const rows = await db
    .select()
    .from(workspace)
    .where(eq(workspace.userId, userId))
    .orderBy(asc(workspace.position), asc(workspace.createdAt));

  if (rows.length === 0) return seedWorkspaces(userId);

  return withCounts(rows);
}

async function withCounts(rows: (typeof workspace.$inferSelect)[]): Promise<Workspace[]> {
  if (rows.length === 0) return [];

  const memberships = await db
    .select()
    .from(channelWorkspace)
    .where(
      inArray(
        channelWorkspace.workspaceId,
        rows.map((r) => r.id)
      )
    );

  const counts = new Map<string, number>();
  for (const m of memberships) {
    counts.set(m.workspaceId, (counts.get(m.workspaceId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    position: row.position,
    channelCount: counts.get(row.id) ?? 0
  }));
}

export async function seedWorkspaces(userId: string): Promise<Workspace[]> {
  const channels = await db.select().from(trackedChannel).where(eq(trackedChannel.userId, userId));

  const created: (typeof workspace.$inferSelect)[] = [];

  for (const [index, preset] of DEFAULTS.entries()) {
    const row = {
      id: crypto.randomUUID(),
      userId,
      name: preset.name,
      slug: preset.slug,
      position: index,
      createdAt: new Date(Date.now() + index)
    };
    await db.insert(workspace).values(row).onConflictDoNothing();
    created.push(row as typeof workspace.$inferSelect);

    // Carry the old `standards` field across so existing groupings survive.
    const members = channels.filter((c) => {
      try {
        const standards: unknown = JSON.parse(c.standards);
        return (
          Array.isArray(standards) && standards.some((s) => preset.standards.includes(s as number))
        );
      } catch {
        return false;
      }
    });

    if (members.length > 0) {
      await db
        .insert(channelWorkspace)
        .values(members.map((m) => ({ workspaceId: row.id, trackedChannelId: m.id })))
        .onConflictDoNothing();
    }
  }

  return withCounts(created);
}

export async function createWorkspace(userId: string, name: string): Promise<Workspace[]> {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) throw new Error('A workspace needs a name.');

  const existing = await db
    .select({ position: workspace.position })
    .from(workspace)
    .where(eq(workspace.userId, userId));

  await db.insert(workspace).values({
    id: crypto.randomUUID(),
    userId,
    name: trimmed,
    slug: await uniqueSlug(userId, slugify(trimmed)),
    position: existing.length
  });

  return getWorkspaces(userId);
}

export async function renameWorkspace(userId: string, id: string, name: string) {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) throw new Error('A workspace needs a name.');

  // Scoped by userId as well as id so one user cannot rename another's.
  await db
    .update(workspace)
    .set({ name: trimmed })
    .where(and(eq(workspace.userId, userId), eq(workspace.id, id)));
}

export async function deleteWorkspace(userId: string, id: string) {
  // Memberships cascade; the channels themselves are untouched, since removing
  // a grouping should never quietly stop tracking a channel.
  await db.delete(workspace).where(and(eq(workspace.userId, userId), eq(workspace.id, id)));
}

/** Adds or removes a channel from a workspace, verifying both belong to the user. */
export async function setMembership(
  userId: string,
  workspaceId: string,
  trackedChannelId: string,
  member: boolean
) {
  const [ws] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(and(eq(workspace.userId, userId), eq(workspace.id, workspaceId)));

  const [channel] = await db
    .select({ id: trackedChannel.id })
    .from(trackedChannel)
    .where(and(eq(trackedChannel.userId, userId), eq(trackedChannel.id, trackedChannelId)));

  if (!ws || !channel) throw new Error('Unknown workspace or channel.');

  if (member) {
    await db
      .insert(channelWorkspace)
      .values({ workspaceId, trackedChannelId })
      .onConflictDoNothing();
    return;
  }

  await db
    .delete(channelWorkspace)
    .where(
      and(
        eq(channelWorkspace.workspaceId, workspaceId),
        eq(channelWorkspace.trackedChannelId, trackedChannelId)
      )
    );
}

/** Which workspace ids each tracked channel belongs to. */
export async function getMembershipMap(userId: string): Promise<Map<string, string[]>> {
  const rows = await db
    .select({
      trackedChannelId: channelWorkspace.trackedChannelId,
      workspaceId: channelWorkspace.workspaceId
    })
    .from(channelWorkspace)
    .innerJoin(workspace, eq(workspace.id, channelWorkspace.workspaceId))
    .where(eq(workspace.userId, userId));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    map.set(row.trackedChannelId, [...(map.get(row.trackedChannelId) ?? []), row.workspaceId]);
  }
  return map;
}

/**
 * Slug → workspace id, or null for "all" and for slugs that no longer exist.
 *
 * Returning null rather than throwing is deliberate: a bookmarked link to a
 * deleted workspace should show everything, not an error page.
 */
export async function resolveWorkspaceId(userId: string, slug: string): Promise<string | null> {
  if (!slug || slug === 'all') return null;

  const [row] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(and(eq(workspace.userId, userId), eq(workspace.slug, slug)));

  return row?.id ?? null;
}
