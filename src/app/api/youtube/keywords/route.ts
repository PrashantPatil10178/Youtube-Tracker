import { researchTopic } from '@/lib/youtube/keywords';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /api/youtube/keywords?q=<seed>
 *
 * Topic research: autocomplete expansions for a seed, each analysed against the
 * top 20 ranking videos. Cached hard — search rankings move over days, and each
 * request costs several InnerTube searches.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Missing required `q` parameter.' }, { status: 400 });
  }

  try {
    return NextResponse.json(await researchTopic(query), {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Keyword research failed: ${message}` }, { status: 502 });
  }
}
