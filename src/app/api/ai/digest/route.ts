import { AIRefusalError, isAIEnabled } from '@/lib/ai/client';
import { generateDigest } from '@/lib/ai/digest';
import { fetchChannelSummary, resolveChannelId } from '@/lib/youtube/client';
import { projectViews, scoreVideos, uploadCadenceDays } from '@/lib/youtube/metrics';
import { fetchChannelFeed } from '@/lib/youtube/rss';
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

    const [summary, feed] = await Promise.all([
      fetchChannelSummary(channelId),
      fetchChannelFeed(channelId)
    ]);

    const { baseline, videos } = scoreVideos(feed.videos);

    const digest = await generateDigest({
      channelTitle: summary.title,
      subscribers: summary.subscribers,
      medianViews: baseline.medianViews,
      cadenceDays: uploadCadenceDays(feed.videos),
      projectedNext30: projectViews(feed.videos, 30)?.projected ?? null,
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
