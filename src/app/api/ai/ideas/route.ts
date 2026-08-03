import { generateIdeas, type IdeaEvidence } from '@/lib/ai/ideas';
import { computeWatchFeed, computeWorkspaceInsights, isWorkspace } from '@/lib/youtube/aggregate';
import { researchTopic } from '@/lib/youtube/keywords';
import { getCurrentSession } from '@/lib/session';
import { getTrackedChannels } from '@/lib/youtube/tracked';
import { resolveWorkspaceId } from '@/lib/youtube/workspaces';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /api/ai/ideas?std=<workspace>&seed=<optional keyword>
 *
 * Content ideas grounded in measured data. The evidence is assembled here from
 * the same aggregations the Insights and Research pages show, so every figure
 * the model is given is one the user can go and check.
 */
export async function GET(request: NextRequest) {
  const std = request.nextUrl.searchParams.get('std') ?? 'all';
  const seed = request.nextUrl.searchParams.get('seed')?.trim();

  if (!isWorkspace(std)) {
    return NextResponse.json(
      { error: '`std` must be a workspace slug or `all`.' },
      { status: 400 }
    );
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const [channels, workspaceId] = await Promise.all([
      getTrackedChannels(session.user.id),
      resolveWorkspaceId(session.user.id, std)
    ]);

    // Keyword research is optional and by far the slowest input, so it only
    // runs when a seed was supplied.
    const [insights, watch, topic] = await Promise.all([
      computeWorkspaceInsights(channels, std, workspaceId),
      computeWatchFeed(channels, std, workspaceId),
      seed ? researchTopic(seed, 4).catch(() => null) : Promise.resolve(null)
    ]);

    const evidence: IdeaEvidence = {
      bestFormats: insights.format.ranked.slice(0, 3).map((f) => ({
        key: f.key,
        median: f.median,
        count: f.count
      })),
      worstFormats: insights.format.ranked.slice(-2).map((f) => ({
        key: f.key,
        median: f.median,
        count: f.count
      })),
      ownMix: insights.contentMix.own,
      keywords: (topic?.results ?? []).map((r) => ({
        keyword: r.keyword,
        demand: r.demandProxy,
        entryBar: r.entryBarProxy,
        channels: r.distinctChannels,
        topChannelShare: r.topChannelShare,
        freshShare: r.freshShare
      })),
      breakouts: watch.events
        .filter((e) => e.kind === 'upload' && (e.outlierScore ?? 0) >= 2)
        .slice(0, 6)
        .map((e) => ({
          title: e.kind === 'upload' ? e.title : '',
          channel: e.channelLabel,
          score: e.kind === 'upload' ? (e.outlierScore ?? 0) : 0,
          format: e.kind === 'upload' ? e.format : null
        }))
    };

    const result = await generateIdeas(evidence);

    return NextResponse.json(
      { ...result, standard: std, seed: seed ?? null, evidence },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Idea generation failed: ${message}` }, { status: 502 });
  }
}
