import { computeWatchFeed, isWorkspace } from '@/lib/youtube/aggregate';
import { getCurrentSession } from '@/lib/session';
import { getTrackedChannels } from '@/lib/youtube/tracked';
import { resolveWorkspaceId } from '@/lib/youtube/workspaces';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /api/youtube/watch?std=<9|10|11|12|all>
 *
 * Competitor activity: recent uploads and detected title/thumbnail swaps.
 * Not CDN-cached — it reads snapshot state that changes as channels are viewed.
 */
export async function GET(request: NextRequest) {
  const std = request.nextUrl.searchParams.get('std') ?? 'all';

  if (!isWorkspace(std)) {
    return NextResponse.json(
      { error: '`std` must be a workspace slug or `all`.' },
      { status: 400 }
    );
  }

  // The middleware only checks that a cookie exists; this is the real check,
  // and the list is per-user so it cannot be skipped.
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const [channels, workspaceId] = await Promise.all([
      getTrackedChannels(session.user.id),
      resolveWorkspaceId(session.user.id, std)
    ]);
    return NextResponse.json(await computeWatchFeed(channels, std, workspaceId), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Watch feed failed: ${message}` }, { status: 502 });
  }
}
