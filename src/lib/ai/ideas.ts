import 'server-only';

import { formatCompact } from '@/lib/youtube/metrics';

import { getAI, getModel, readCompletion } from './client';

export type IdeaEvidence = {
  /** Format benchmarks: what outperforms and what the channel over-publishes. */
  bestFormats: Array<{ key: string; median: number; count: number }>;
  worstFormats: Array<{ key: string; median: number; count: number }>;
  ownMix: Array<{ key: string; share: number }>;
  /** Keyword gaps: topics with demand and a low entry bar. */
  keywords: Array<{
    keyword: string;
    demand: number | null;
    entryBar: number | null;
    channels: number;
    topChannelShare: number;
    freshShare: number;
  }>;
  /** What actually broke out recently, as evidence of current appetite. */
  breakouts: Array<{ title: string; channel: string; score: number; format: string | null }>;
};

export type Idea = {
  title: string;
  format: string;
  rationale: string;
  /** The specific figure this idea rests on, quoted back for checking. */
  evidence: string;
};

export type IdeasResult = {
  ideas: Idea[];
  source: 'azure-openai' | 'template';
};

const SYSTEM = `You propose YouTube video ideas for an education channel covering the
Maharashtra State Board syllabus (classes 9-12), in the Marathi/Hindi/English mix
those channels use.

You are given measured data: format benchmarks (median outlier score, where 1.0 is
typical for a channel), the channel's own output mix, keyword gaps, and videos that
recently outperformed.

Rules:
- Every idea MUST rest on a number from the supplied data, quoted in the evidence field.
- Do not invent metrics, search volumes, audience sizes or trends you were not given.
- Prefer formats with a high median score that the channel under-publishes; that gap
  is the point.
- Titles should look like real titles on these channels, not generic English headlines.
- If the data is too thin to justify an idea, return fewer ideas rather than padding.

Return ONLY a JSON array, no prose, no code fences. Each element:
{"title": string, "format": string, "rationale": string, "evidence": string}
Return at most 6 elements.`;

function buildPrompt(evidence: IdeaEvidence): string {
  const lines: string[] = [];

  lines.push('FORMAT BENCHMARKS (median outlier score, 1.0 = typical):');
  for (const f of evidence.bestFormats) {
    lines.push(`  strong: ${f.key} ${f.median}x across ${f.count} videos`);
  }
  for (const f of evidence.worstFormats) {
    lines.push(`  weak:   ${f.key} ${f.median}x across ${f.count} videos`);
  }

  lines.push('', "THIS CHANNEL'S OUTPUT MIX (share of its videos):");
  for (const m of evidence.ownMix) lines.push(`  ${m.key}: ${m.share}%`);

  if (evidence.keywords.length > 0) {
    lines.push('', 'KEYWORD GAPS (demand = median views of top results):');
    for (const k of evidence.keywords) {
      lines.push(
        `  "${k.keyword}" demand ${formatCompact(k.demand)}, entry bar ${formatCompact(k.entryBar)}, ` +
          `${k.channels} distinct channels, top channel holds ${k.topChannelShare}%, ${k.freshShare}% posted in last 30 days`
      );
    }
  }

  if (evidence.breakouts.length > 0) {
    lines.push('', 'RECENT BREAKOUTS (score = versus that channel’s own median):');
    for (const b of evidence.breakouts) {
      lines.push(`  ${b.score}x ${b.format ?? 'unclassified'} — "${b.title}" (${b.channel})`);
    }
  }

  return lines.join('\n');
}

/**
 * Proposes video ideas grounded in measured data.
 *
 * The model writes titles and reasoning; it is never the source of a number.
 * Every figure in the prompt was computed from YouTube data, and the `evidence`
 * field exists so a claim can be checked against the tables on the Insights and
 * Research pages rather than taken on trust.
 */
export async function generateIdeas(evidence: IdeaEvidence): Promise<IdeasResult> {
  const ai = getAI();
  if (!ai) return { ideas: templateIdeas(evidence), source: 'template' };

  try {
    const completion = await ai.chat.completions.create({
      model: getModel(),
      max_completion_tokens: 1600,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: buildPrompt(evidence) }
      ]
    });

    const text = readCompletion(completion).trim();
    // Models wrap JSON in fences despite instructions; strip them before parsing
    // rather than failing the whole request over formatting.
    const cleaned = text
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error('not an array');

    const ideas = parsed
      .filter((i): i is Idea => typeof i === 'object' && i !== null && 'title' in i)
      .slice(0, 6)
      .map((i) => ({
        title: String(i.title),
        format: String(i.format ?? ''),
        rationale: String(i.rationale ?? ''),
        evidence: String(i.evidence ?? '')
      }));

    if (ideas.length === 0) throw new Error('no usable ideas');

    return { ideas, source: 'azure-openai' };
  } catch {
    // Malformed output, refusal or an outage — the deterministic path still
    // produces something grounded, just blunter.
    return { ideas: templateIdeas(evidence), source: 'template' };
  }
}

/**
 * Deterministic fallback.
 *
 * Says less, but everything it says is arithmetic on the supplied data — no key
 * required, and it cannot hallucinate.
 */
function templateIdeas(evidence: IdeaEvidence): Idea[] {
  const ideas: Idea[] = [];

  const best = evidence.bestFormats[0];
  const ownShareOfBest = evidence.ownMix.find((m) => m.key === best?.key)?.share ?? 0;

  if (best && ownShareOfBest < 15) {
    ideas.push({
      title: `${best.key} video on your next chapter`,
      format: best.key,
      rationale: `${best.key} is the strongest format in this workspace and you publish very little of it.`,
      evidence: `${best.key} scores ${best.median}x across ${best.count} videos; it is ${ownShareOfBest}% of your output.`
    });
  }

  const worst = evidence.worstFormats[0];
  const ownShareOfWorst = evidence.ownMix.find((m) => m.key === worst?.key)?.share ?? 0;
  if (worst && ownShareOfWorst > 30) {
    ideas.push({
      title: `Re-cut one ${worst.key} video as ${best?.key ?? 'a stronger format'}`,
      format: best?.key ?? 'Revision',
      rationale: `Your largest output category is also the weakest performer here.`,
      evidence: `${worst.key} scores ${worst.median}x and is ${ownShareOfWorst}% of your output.`
    });
  }

  for (const keyword of evidence.keywords.slice(0, 3)) {
    if (keyword.demand === null) continue;
    ideas.push({
      title: keyword.keyword,
      format: best?.key ?? 'Lecture',
      rationale: `Demand exists here and the field is not locked up.`,
      evidence: `Top results median ${formatCompact(keyword.demand)} views, entry bar ${formatCompact(keyword.entryBar)}, ${keyword.channels} distinct channels.`
    });
  }

  return ideas.slice(0, 6);
}
