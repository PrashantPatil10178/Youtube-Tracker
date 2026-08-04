import { AIRefusalError, isAIEnabled } from '@/lib/ai/client';
import { generateDigest } from '@/lib/ai/digest';
import { fetchChannelSummary, fetchRecentVideos, resolveChannelId } from '@/lib/youtube/client';
import { projectViews, scoreVideos, uploadCadenceDays } from '@/lib/youtube/metrics';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /api/ai/digest?q=<channel>
 *
 * Assembles the channel's own metrics, then has Claude write them up. The
 * numbers are computed here rather than by the model, so the prose is grounded
 * in real data instead of estimates.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Missing required `q` parameter.' }, { status: 400 });
  }

  try {
    const channelId = await resolveChannelId(query);
    if (!channelId) {
      return NextResponse.json({ error: `No channel matched “${query}”.` }, { status: 404 });
    }

    const [summary, recent] = await Promise.all([
      fetchChannelSummary(channelId),
      fetchRecentVideos(channelId)
    ]);

    const { baseline, videos } = scoreVideos(recent);

    const digest = await generateDigest({
      channelTitle: summary.title,
      subscribers: summary.subscribers,
      medianViews: baseline.medianViews,
      cadenceDays: uploadCadenceDays(recent),
      projectedNext30: projectViews(recent, 30)?.projected ?? null,
      videos
    });

    return NextResponse.json({ ...digest, aiEnabled: isAIEnabled() });
  } catch (error) {
    if (error instanceof AIRefusalError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Digest failed: ${message}` }, { status: 502 });
  }
}
