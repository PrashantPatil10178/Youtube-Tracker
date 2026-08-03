import { computeWorkspaceInsights, isWorkspace } from '@/lib/youtube/aggregate';
import { getCurrentSession } from '@/lib/session';
import { getTrackedChannels } from '@/lib/youtube/tracked';
import { resolveWorkspaceId } from '@/lib/youtube/workspaces';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /api/youtube/insights?std=<9|10|11|12|all>
 *
 * Thin wrapper over `computeWorkspaceInsights` — server components call that
 * directly to prefetch, so the aggregation itself lives in lib.
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
    return NextResponse.json(await computeWorkspaceInsights(channels, std, workspaceId), {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Insights failed: ${message}` }, { status: 502 });
  }
}
