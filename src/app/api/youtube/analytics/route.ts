import {
  fetchChannelSummary,
  fetchChannelVideos,
  fetchPreciseStats,
  resolveChannelId
} from '@/lib/youtube/client';
import type { VideoStat } from '@/lib/youtube/metrics';
import {
  projectViews,
  scoreVideos,
  uploadCadenceDays,
  engagementRate
} from '@/lib/youtube/metrics';
import { fetchChannelFeed } from '@/lib/youtube/rss';
import { captureSnapshot, getChannelDelta, getRecentChanges } from '@/lib/youtube/snapshots';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * How many of the newest videos get exact view counts. Each costs a request, so
 * this trades a bounded amount of latency for the accuracy the baseline and the
 * displayed rows actually depend on.
 */
const PRECISE_LIMIT = 25;

/**
 * GET /api/youtube/analytics?q=<channel>
 *
 * The channel route returns raw data; this one returns the derived view —
 * outlier scores, velocity, cadence and projections — so the client renders
 * numbers rather than computing them.
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

    // RSS caps at 15 uploads. Channels that publish several times a day have
    // nothing older than a week in that window, so no maturity baseline forms
    // and every outlier score comes back null. Fall back to deep history.
    let source: VideoStat[] = feed.videos;
    let sampleSource: 'rss' | 'deep' = 'rss';
    let preciseCount = 0;

    if (!scoreVideos(feed.videos).baseline.reliable) {
      const deep = await fetchChannelVideos(channelId, 90).catch(() => []);
      const usable = deep.filter((v) => v.publishedAt && v.views !== null);
      if (usable.length > feed.videos.length) {
        source = usable.map((v) => ({
          videoId: v.videoId,
          title: v.title,
          publishedAt: v.publishedAt as string,
          views: v.views
        }));
        sampleSource = 'deep';
      }
    }

    // The deep listing rounds view counts (13,982 reported as "13K"), and that
    // error propagates straight into every outlier score. RSS is already exact,
    // so this only runs on the deep path — and only over the newest slice, one
    // request per video being far too expensive to spend on the whole history.
    if (sampleSource === 'deep') {
      const newest = source
        .toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, PRECISE_LIMIT);

      const precise = await fetchPreciseStats(newest.map((v) => v.videoId)).catch(
        () => new Map<string, { views: number | null; likes: number | null; keywords: string[] }>()
      );

      if (precise.size > 0) {
        // Likes ride along with the exact view count from the same `getInfo`
        // call. Without this, `engagementRate` silently fell back to RSS's
        // star-rating count on every video here — which YouTube barely
        // populates anymore — so the channel card's engagement figures were
        // almost always blank even on the deep-history path that pays for
        // exact per-video data specifically to be accurate.
        source = source.map((v) => {
          const exact = precise.get(v.videoId);
          if (!exact) return v;
          return {
            ...v,
            views: exact.views ?? v.views,
            likes: exact.likes,
            keywords: exact.keywords
          };
        });
        preciseCount = precise.size;
      }
    }

    const { baseline, videos } = scoreVideos(source);

    const scored = videos
      .map((video) => ({
        ...video,
        thumbnail:
          feed.videos.find((v) => v.videoId === video.videoId)?.thumbnail ??
          `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        url:
          feed.videos.find((v) => v.videoId === video.videoId)?.url ??
          `https://www.youtube.com/watch?v=${video.videoId}`,
        engagement: engagementRate(video)
      }))
      .toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    const breakouts = scored
      .filter((v) => v.performance === 'breakout')
      .toSorted((a, b) => (b.outlierScore ?? 0) - (a.outlierScore ?? 0));

    // Recording every read is what accumulates history; a failed write must not
    // take the analytics response down with it.
    const changes = await captureSnapshot(
      channelId,
      summary,
      scored.slice(0, 50).map((v) => ({
        videoId: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        views: v.views
      })),
      sampleSource
    ).catch(() => []);

    const [delta, recentChanges] = await Promise.all([
      getChannelDelta(channelId).catch(() => null),
      getRecentChanges(channelId).catch(() => [])
    ]);

    return NextResponse.json(
      {
        channel: summary,
        baseline,
        sampleSource,
        sampleSize: source.length,
        /** How many rows carry exact rather than rounded view counts. */
        preciseCount,
        delta,
        changes,
        recentChanges,
        cadenceDays: uploadCadenceDays(source),
        projection: {
          next7: projectViews(source, 7),
          next30: projectViews(source, 30)
        },
        breakouts,
        videos: scored
      },
      {
        // Deliberately not CDN-cached: each request writes a snapshot, and a
        // cached response would both skip the write and hide fresh deltas.
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Analytics failed: ${message}` }, { status: 502 });
  }
}
