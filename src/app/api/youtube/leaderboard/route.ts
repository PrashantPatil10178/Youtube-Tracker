import { getCurrentSession } from '@/lib/session';
import { isWorkspace } from '@/lib/youtube/aggregate';
import { computeLeaderboard } from '@/lib/youtube/leaderboard';
import { getTrackedChannels } from '@/lib/youtube/tracked';
import { resolveWorkspaceId } from '@/lib/youtube/workspaces';
import { NextResponse, type NextRequest } from 'next/server';

/** Windows the UI offers, in days. */
const ALLOWED_WINDOWS = [1, 7, 30, 90];

export async function GET(request: NextRequest) {
  const std = request.nextUrl.searchParams.get('ws') ?? 'all';
  const days = Number(request.nextUrl.searchParams.get('days') ?? 7);

  if (!isWorkspace(std)) {
    return NextResponse.json({ error: '`ws` must be a workspace slug or `all`.' }, { status: 400 });
  }
  if (!ALLOWED_WINDOWS.includes(days)) {
    return NextResponse.json(
      { error: `\`days\` must be one of ${ALLOWED_WINDOWS.join(', ')}.` },
      { status: 400 }
    );
  }

  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const [channels, workspaceId] = await Promise.all([
      getTrackedChannels(session.user.id),
      resolveWorkspaceId(session.user.id, std)
    ]);

    const scoped = workspaceId
      ? channels.filter((c) => c.workspaceIds?.includes(workspaceId))
      : channels;

    return NextResponse.json(await computeLeaderboard(scoped, days), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Leaderboard failed: ${message}` }, { status: 502 });
  }
}
