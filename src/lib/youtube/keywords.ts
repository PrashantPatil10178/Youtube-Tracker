/* eslint-disable typescript/no-explicit-any -- InnerTube search renderers are
   undocumented and vary by shelf; the `any` is confined to extraction. */
import 'server-only';

import { getYouTube, parseCompactNumber } from './client';
import { median } from './metrics';
import { classifyTitle } from './taxonomy';

/**
 * Keyword and topic research.
 *
 * **YouTube does not publish search volume.** Tools that show one are modelling
 * it from third-party clickstream data, and inventing a number here would be
 * worse than showing none. What YouTube *does* expose is used instead:
 *
 *  - autocomplete suggestions — literally the queries people type, ordered by
 *    how often YouTube expects them
 *  - the top 20 ranked results for a query, with views, age and channel
 *
 * From those, demand and competition are estimated as clearly-labelled
 * proxies. Every field name says "proxy" or describes what was measured, so
 * nothing reads as a figure YouTube handed us.
 */

const TOP_N = 20;

export type KeywordVideo = {
  videoId: string;
  title: string;
  url: string;
  thumbnail: string | null;
  channel: string;
  views: number | null;
  publishedText: string | null;
  durationText: string | null;
  isShort: boolean;
};

export type KeywordResearch = {
  keyword: string;
  /** YouTube's own count of matching videos — a competition-volume signal. */
  estimatedResults: number | null;
  sampleSize: number;
  /** Median views across the top results: does this topic draw an audience? */
  demandProxy: number | null;
  /** Views of the weakest top-10 result — how little it takes to rank here. */
  entryBarProxy: number | null;
  /** Share of top results published within ~30 days, as a percentage. */
  freshShare: number;
  /** How concentrated the results are: share held by the single top channel. */
  topChannelShare: number;
  /** Distinct channels in the top results — low means a locked-up topic. */
  distinctChannels: number;
  /** Dominant classification of what already ranks. */
  dominantFormat: string | null;
  dominantIntent: string | null;
  videos: KeywordVideo[];
};

/** Parses "6 hours ago" / "2 days ago" / "1 year ago" into approximate days. */
function agedDays(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(second|minute|hour|day|week|month|year)/i);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const perDay: Record<string, number> = {
    second: 1 / 86400,
    minute: 1 / 1440,
    hour: 1 / 24,
    day: 1,
    week: 7,
    month: 30,
    year: 365
  };
  return n * (perDay[unit] ?? 1);
}

/** Autocomplete expansions for a seed — the closest thing to real demand data. */
export async function expandKeyword(seed: string): Promise<string[]> {
  const yt = await getYouTube();
  try {
    const suggestions = await (yt as any).getSearchSuggestions(seed);
    return Array.isArray(suggestions) ? suggestions.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export async function researchKeyword(keyword: string): Promise<KeywordResearch> {
  const yt = await getYouTube();
  const result: any = await yt.search(keyword, { type: 'video' });

  const videos: KeywordVideo[] = ((result.results ?? []) as any[])
    .filter((r) => r?.type === 'Video' && r?.id)
    .slice(0, TOP_N)
    .map((v) => {
      const durationText: string | null = v.duration?.text ?? null;
      return {
        videoId: v.id,
        title: v.title?.text ?? '',
        url: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail: v.thumbnails?.[0]?.url ?? null,
        channel: v.author?.name ?? 'Unknown',
        views: parseCompactNumber(v.view_count?.text),
        publishedText: v.published?.text ?? null,
        durationText,
        // Anything at or under a minute is a Short, and Shorts draw from a
        // different view distribution — worth flagging so the medians can be
        // read with that in mind.
        isShort: /^0?:?\d?\d$|^1:00$/.test((durationText ?? '').trim())
      };
    });

  const viewSamples = videos.map((v) => v.views).filter((v): v is number => v !== null);
  const topTen = viewSamples.slice(0, 10);

  const ages = videos.map((v) => agedDays(v.publishedText)).filter((d): d is number => d !== null);
  const fresh = ages.filter((d) => d <= 30).length;

  const channelCounts = new Map<string, number>();
  for (const video of videos) {
    channelCounts.set(video.channel, (channelCounts.get(video.channel) ?? 0) + 1);
  }
  const topChannelCount = Math.max(0, ...channelCounts.values());

  const tally = (pick: (t: string) => string | null) => {
    const counts = new Map<string, number>();
    for (const video of videos) {
      const key = pick(video.title);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };

  return {
    keyword,
    estimatedResults:
      typeof result.estimated_results === 'number' ? result.estimated_results : null,
    sampleSize: videos.length,
    demandProxy: median(viewSamples),
    entryBarProxy: topTen.length > 0 ? Math.min(...topTen) : null,
    freshShare: videos.length ? Math.round((fresh / videos.length) * 100) : 0,
    topChannelShare: videos.length ? Math.round((topChannelCount / videos.length) * 100) : 0,
    distinctChannels: channelCounts.size,
    dominantFormat: tally((t) => classifyTitle(t).format),
    dominantIntent: tally((t) => classifyTitle(t).intent),
    videos
  };
}

/**
 * Researches a seed plus its autocomplete expansions.
 *
 * Capped and run in sequence: each keyword is a full search request, and firing
 * a dozen at once is the reliable way to get rate-limited by InnerTube.
 */
export async function researchTopic(seed: string, maxKeywords = 6) {
  const suggestions = await expandKeyword(seed);

  // The seed first, then expansions, deduped case-insensitively.
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const candidate of [seed, ...suggestions]) {
    const key = candidate.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keywords.push(candidate.trim());
    if (keywords.length >= maxKeywords) break;
  }

  const results: KeywordResearch[] = [];
  for (const keyword of keywords) {
    try {
      results.push(await researchKeyword(keyword));
    } catch {
      // One bad query shouldn't lose the rest of the report.
    }
  }

  return { seed, suggestions, results };
}
