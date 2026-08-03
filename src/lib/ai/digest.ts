import 'server-only';

import { formatCompact, type VideoMetrics } from '@/lib/youtube/metrics';

import { AIRefusalError, getAI, getModel, readCompletion } from './client';

export type DigestInput = {
  channelTitle: string;
  subscribers: number | null;
  medianViews: number | null;
  cadenceDays: number | null;
  projectedNext30: number | null;
  videos: VideoMetrics[];
};

export type Digest = {
  headline: string;
  body: string;
  source: 'azure-openai' | 'template';
};

const SYSTEM = `You write short performance digests for YouTube creators.

You are given one channel's own recent metrics. Every claim you make must be
traceable to a number in that data — if the data does not support a claim, leave
it out rather than speculating about audiences, algorithms, or events you cannot see.

Outlier score is a video's views versus this channel's own median, so 2.0 means
twice typical. Scores marked provisional come from view velocity because the video
is too new to judge on totals — say so rather than treating them as settled.

Lead with what happened. Two short paragraphs, no headings, no bullet lists.`;

/**
 * Writes a plain-English digest of a channel's recent performance.
 *
 * Without an API key this returns a deterministic template — less insightful,
 * but never wrong, and it keeps the panel populated.
 */
export async function generateDigest(input: DigestInput): Promise<Digest> {
  const ai = getAI();
  if (!ai) return templateDigest(input);

  try {
    const completion = await ai.chat.completions.create({
      model: getModel(),
      max_completion_tokens: 800,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: buildPrompt(input) }
      ]
    });

    const text = readCompletion(completion);
    const [headline, ...rest] = text.split('\n').filter((line) => line.trim());

    return {
      headline: headline?.trim() ?? 'Recent performance',
      body: rest.join('\n\n').trim() || text.trim(),
      source: 'azure-openai'
    };
  } catch (error) {
    if (error instanceof AIRefusalError) throw error;
    console.error('[ai] digest fell back to template:', error);
    return templateDigest(input);
  }
}

function buildPrompt(input: DigestInput): string {
  const rows = input.videos
    .slice(0, 10)
    .map((v) => {
      const score = v.outlierScore === null ? 'n/a' : `${v.outlierScore}x`;
      const flag = v.provisional ? ' (provisional)' : '';
      return `- "${v.title}" — ${formatCompact(v.views)} views, ${score}${flag}, ${Math.round(v.ageDays)}d old`;
    })
    .join('\n');

  return `Channel: ${input.channelTitle}
Subscribers: ${formatCompact(input.subscribers)}
Typical video (median): ${formatCompact(input.medianViews)} views
Upload cadence: ${input.cadenceDays === null ? 'unknown' : `${input.cadenceDays} days between uploads`}
Projected views over next 30 days: ${formatCompact(input.projectedNext30)}

Recent uploads:
${rows}

Write the digest. First line is a one-sentence headline, then the body.`;
}

/** Deterministic fallback — states the numbers without interpreting them. */
export function templateDigest(input: DigestInput): Digest {
  const scored = input.videos.filter((v) => v.outlierScore !== null);
  const breakouts = scored.filter((v) => v.performance === 'breakout');
  const under = scored.filter((v) => v.performance === 'under');
  const best = scored.reduce<VideoMetrics | null>(
    (top, v) => (top === null || (v.outlierScore ?? 0) > (top.outlierScore ?? 0) ? v : top),
    null
  );

  const headline = breakouts.length
    ? `${breakouts.length} video${breakouts.length === 1 ? '' : 's'} beat the channel baseline`
    : 'Recent uploads tracked close to the channel baseline';

  const parts = [
    `${input.channelTitle} typically does ${formatCompact(input.medianViews)} views per video${
      input.cadenceDays === null ? '' : `, publishing about every ${input.cadenceDays} days`
    }.`
  ];

  if (best?.outlierScore) {
    parts.push(
      `The strongest recent upload is "${best.title}" at ${best.outlierScore}x the median${
        best.provisional ? ' (provisional — still too new to judge on totals)' : ''
      }.`
    );
  }

  if (under.length) {
    parts.push(
      `${under.length} recent upload${under.length === 1 ? '' : 's'} came in below baseline.`
    );
  }

  parts.push('Set the AZURE_OPENAI_* vars to get a written analysis instead of this summary.');

  return { headline, body: parts.join(' '), source: 'template' };
}
