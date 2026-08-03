import { searchChannels } from '@/lib/youtube/client';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /api/youtube/search?q=<name>
 *
 * Channel discovery by display name, for adding channels whose handle you don't
 * know. Cached at the edge: search results move far more slowly than analytics,
 * and this route writes nothing.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Missing required `q` parameter.' }, { status: 400 });
  }

  try {
    const results = await searchChannels(query);
    return NextResponse.json(
      { query, results },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Search failed: ${message}` }, { status: 502 });
  }
}
