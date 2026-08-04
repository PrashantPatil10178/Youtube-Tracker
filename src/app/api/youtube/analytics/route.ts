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

    const [summary, deep] = await Promise.all([
      fetchChannelSummary(channelId),
      fetchChannelVideos(channelId, 90)
    ]);

    // Thumbnails come straight off the deep listing — no separate lookup, and
    // no RSS fallback needed for it either.
    const thumbnailById = new Map(deep.map((v) => [v.videoId, v.thumbnail]));

    // Used to run off RSS's 15-item window, falling back to a 90-item deep walk
    // only when that couldn't form a maturity baseline. RSS turned out to have
    // no uptime guarantee of its own (404/500 for every channel as of
    // 2026-08-04), so deep history is now the only source — see
    // `fetchRecentVideos` in client.ts for the shallower callers' version of
    // this same change.
    let source: VideoStat[] = deep
      .filter((v) => v.publishedAt && v.views !== null)
      .map((v) => ({
        videoId: v.videoId,
        title: v.title,
        publishedAt: v.publishedAt as string,
        views: v.views
      }));
    const sampleSource = 'deep' as const;
    let preciseCount = 0;

    // The deep listing rounds view counts (13,982 reported as "13K"), and that
    // error propagates straight into every outlier score. Only the newest slice
    // gets exact figures — one request per video is far too expensive to spend
    // on the whole history.
    const newest = source
      .toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, PRECISE_LIMIT);

    const precise = await fetchPreciseStats(newest.map((v) => v.videoId)).catch(
      () => new Map<string, { views: number | null; likes: number | null; keywords: string[] }>()
    );

    if (precise.size > 0) {
      // Likes ride along with the exact view count from the same `getInfo`
      // call — without this, `engagementRate` falls back to a rating count
      // YouTube barely populates anymore, and the channel card's engagement
      // figures come back blank.
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

    const { baseline, videos } = scoreVideos(source);

    const scored = videos
      .map((video) => ({
        ...video,
        thumbnail:
          thumbnailById.get(video.videoId) ??
          `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
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
