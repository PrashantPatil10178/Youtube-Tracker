import 'server-only';

import type OpenAI from 'openai';

import { AIRefusalError, getAI, getModel, readCompletion } from './client';

export type ThumbnailCandidate = {
  id: string;
  title: string;
  /** Publicly reachable image URL, or a data: URI. Optional — title-only scoring works. */
  imageUrl?: string;
};

export type CandidateScore = {
  id: string;
  /** Predicted click-through rate, as a percentage. */
  predictedCtr: number;
  /** 0–100 confidence in the prediction. */
  confidence: number;
  strengths: string[];
  weaknesses: string[];
};

export type ThumbnailComparison = {
  scores: CandidateScore[];
  winnerId: string;
  /** Plain-English explanation of what separates the winner. */
  reasoning: string;
  /** Concrete edits that would lift the weaker option. */
  suggestions: string[];
  source: 'azure-openai' | 'heuristic';
};

const SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          predictedCtr: { type: 'number' },
          confidence: { type: 'number' },
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'predictedCtr', 'confidence', 'strengths', 'weaknesses'],
        additionalProperties: false
      }
    },
    winnerId: { type: 'string' },
    reasoning: { type: 'string' },
    suggestions: { type: 'array', items: { type: 'string' } }
  },
  required: ['scores', 'winnerId', 'reasoning', 'suggestions'],
  additionalProperties: false
} as const;

const SYSTEM = `You score YouTube thumbnail and title variants for predicted click-through rate.

Ground every judgement in what is observable in the supplied title text and image:
subject scale, facial visibility, text legibility at feed size, colour contrast,
curiosity gap, and title length. Do not invent audience data you were not given.

Predicted CTR is a percentage, typically 2-12% for most channels. Be discriminating —
if two variants are genuinely close, say so via confidence rather than inventing a gap.
Keep each strength/weakness to one short clause.`;

/**
 * Scores 2+ thumbnail/title variants against each other.
 *
 * Falls back to a deterministic heuristic when no API key is configured, so the
 * feature degrades rather than disappearing.
 */
export async function scoreThumbnails(
  candidates: ThumbnailCandidate[]
): Promise<ThumbnailComparison> {
  if (candidates.length < 2) {
    throw new Error('Thumbnail scoring needs at least two candidates to compare.');
  }

  const ai = getAI();
  if (!ai) return heuristicComparison(candidates);

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  for (const candidate of candidates) {
    content.push({
      type: 'text',
      text: `Variant ${candidate.id} — title: "${candidate.title}"`
    });

    if (candidate.imageUrl) {
      const inlined = await toDataUri(candidate.imageUrl);
      if (inlined) {
        content.push({ type: 'image_url', image_url: { url: inlined } });
      }
    }
  }

  content.push({
    type: 'text',
    text: 'Score each variant, pick a winner, and explain what separates them.'
  });

  try {
    const completion = await ai.chat.completions.create({
      model: getModel(),
      max_completion_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'thumbnail_comparison', strict: true, schema: SCHEMA }
      }
    });

    const parsed = JSON.parse(readCompletion(completion)) as Omit<ThumbnailComparison, 'source'>;

    // The model returns confidence as a 0-1 fraction while the heuristic path
    // uses 0-100. Normalise so the UI can render one scale.
    const scores = parsed.scores.map((score) => ({
      ...score,
      confidence: Math.round(score.confidence <= 1 ? score.confidence * 100 : score.confidence)
    }));

    return { ...parsed, scores, source: 'azure-openai' };
  } catch (error) {
    if (error instanceof AIRefusalError) throw error;
    // Network blip, quota, malformed JSON — a heuristic answer beats an error page.
    console.error('[ai] thumbnail scoring fell back to heuristic:', error);
    return heuristicComparison(candidates);
  }
}

/**
 * Downloads an image and inlines it as a data URI.
 *
 * Azure otherwise fetches the URL itself and returns a 400 for anything its
 * egress can't reach — which silently demoted every comparison to the heuristic
 * path. Returning null on failure degrades to title-only scoring instead of
 * failing the whole request.
 */
async function toDataUri(url: string): Promise<string | null> {
  if (url.startsWith('data:')) return url;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const type = res.headers.get('content-type') ?? 'image/jpeg';
    if (!type.startsWith('image/')) return null;

    const bytes = Buffer.from(await res.arrayBuffer());
    // Keep well clear of request-size limits.
    if (bytes.byteLength > 4 * 1024 * 1024) return null;

    return `data:${type};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Deterministic scorer used when Azure OpenAI is unavailable.
 *
 * These weights encode well-documented thumbnail heuristics (short overlay text,
 * curiosity words, numerals) — useful as a floor, but it cannot see the image,
 * so its confidence is deliberately capped low.
 */
export function heuristicComparison(candidates: ThumbnailCandidate[]): ThumbnailComparison {
  const scores: CandidateScore[] = candidates.map((candidate) => {
    const title = candidate.title.trim();
    const words = title.split(/\s+/).filter(Boolean);
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    let ctr = 4.5;

    if (words.length <= 7) {
      ctr += 0.9;
      strengths.push('Short title stays readable on mobile');
    } else if (words.length > 12) {
      ctr -= 0.8;
      weaknesses.push('Long title will truncate in the feed');
    }

    if (/\d/.test(title)) {
      ctr += 0.5;
      strengths.push('Contains a number, which reads as concrete');
    }

    if (/\b(how|why|what|never|stop|secret|mistake)\b/i.test(title)) {
      ctr += 0.6;
      strengths.push('Opens a curiosity gap');
    }

    if (title === title.toUpperCase() && title.length > 12) {
      ctr -= 0.5;
      weaknesses.push('All-caps reads as clickbait');
    }

    if (!candidate.imageUrl) {
      weaknesses.push('No image supplied — scored on title alone');
    }

    return {
      id: candidate.id,
      predictedCtr: Number(Math.max(1, Math.min(12, ctr)).toFixed(1)),
      // Capped: this path never sees the thumbnail itself.
      confidence: candidate.imageUrl ? 35 : 25,
      strengths,
      weaknesses
    };
  });

  const winner = scores.reduce((best, s) => (s.predictedCtr > best.predictedCtr ? s : best));

  return {
    scores,
    winnerId: winner.id,
    reasoning:
      'Scored without AI — this is a title-only heuristic based on length, numerals and curiosity wording. Set the AZURE_OPENAI_* vars to score the actual artwork.',
    suggestions: [
      'Cut overlay text to three words or fewer',
      'Crop tighter so the subject reads at feed size',
      'Raise contrast between subject and background'
    ],
    source: 'heuristic'
  };
}
