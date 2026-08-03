import { isAIEnabled } from '@/lib/ai/client';
import { AIRefusalError } from '@/lib/ai/client';
import { scoreThumbnails, type ThumbnailCandidate } from '@/lib/ai/thumbnail-score';
import { NextResponse, type NextRequest } from 'next/server';

/** POST /api/ai/thumbnails — body: { candidates: [{id, title, imageUrl?}, ...] } */
export async function POST(request: NextRequest) {
  let body: { candidates?: ThumbnailCandidate[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
  }

  const candidates = body.candidates;

  if (!Array.isArray(candidates) || candidates.length < 2) {
    return NextResponse.json(
      { error: 'Provide at least two candidates to compare.' },
      { status: 400 }
    );
  }

  if (candidates.some((c) => !c?.id || typeof c.title !== 'string')) {
    return NextResponse.json(
      { error: 'Each candidate needs an `id` and a `title`.' },
      { status: 400 }
    );
  }

  try {
    const comparison = await scoreThumbnails(candidates.slice(0, 4));
    return NextResponse.json({ ...comparison, aiEnabled: isAIEnabled() });
  } catch (error) {
    if (error instanceof AIRefusalError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Scoring failed: ${message}` }, { status: 502 });
  }
}
