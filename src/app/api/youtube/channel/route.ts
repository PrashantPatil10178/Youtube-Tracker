import { fetchChannelSummary, fetchRecentVideos, resolveChannelId } from '@/lib/youtube/client';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /api/youtube/channel?q=<@handle | UC… | url>
 *
 * Resolves any channel reference, then returns metadata plus the recent-upload
 * list — both from InnerTube. This used to split the two: summary from
 * InnerTube, uploads from RSS. RSS turned out to have no uptime guarantee of
 * its own (404/500 for every channel as of 2026-08-04), so `fetchRecentVideos`
 * now covers both.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Missing required `q` parameter.' }, { status: 400 });
  }

  try {
    const channelId = await resolveChannelId(query);

    if (!channelId) {
      return NextResponse.json(
        { error: `No YouTube channel matched “${query}”.` },
        { status: 404 }
      );
    }

    // Independent calls — run them together rather than in series.
    const [summary, videos] = await Promise.all([
      fetchChannelSummary(channelId),
      fetchRecentVideos(channelId).catch(() => null)
    ]);

    return NextResponse.json(
      {
        channel: summary,
        recentVideos: videos ?? [],
        feedAvailable: videos !== null
      },
      {
        headers: {
          // Channel stats move slowly; let the edge serve a stale copy while
          // revalidating so repeat dashboard loads stay instant.
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600'
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to load channel: ${message}` }, { status: 502 });
  }
}
