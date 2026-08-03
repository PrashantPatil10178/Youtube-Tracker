import { getCurrentSession } from '@/lib/session';
import { fetchChannelSummary, resolveChannelId } from '@/lib/youtube/client';
import {
  addTrackedChannel,
  getTrackedChannels,
  removeTrackedChannel,
  resetTrackedChannels,
  updateTrackedChannel
} from '@/lib/youtube/tracked';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * The signed-in user's tracked channels.
 *
 * Every handler re-checks the session and scopes by `session.user.id`, so one
 * user can never read or mutate another's list — the id is never taken from
 * the request body.
 */
async function requireUser() {
  const session = await getCurrentSession();
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const channels = await getTrackedChannels(userId);
  return NextResponse.json({ channels }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const channelId = typeof body?.channelId === 'string' ? body.channelId.trim() : '';

  if (!channelId) {
    return NextResponse.json({ error: 'A channel handle or id is required.' }, { status: 400 });
  }

  const existing = await getTrackedChannels(userId);
  if (existing.some((c) => c.id.toLowerCase() === channelId.toLowerCase())) {
    return NextResponse.json({ error: 'That channel is already tracked.' }, { status: 409 });
  }

  // Resolve the real channel title rather than storing the raw handle, which
  // would show as "@GIRITUTORIALS" everywhere it is displayed.
  let title = typeof body?.title === 'string' ? body.title : undefined;
  if (!title) {
    title = await resolveChannelId(channelId)
      .then((id) => (id ? fetchChannelSummary(id) : null))
      .then((summary) => summary?.title || undefined)
      .catch(() => undefined);
  }

  await addTrackedChannel(userId, { channelId, title });

  return NextResponse.json({ channels: await getTrackedChannels(userId) }, { status: 201 });
}

const GROUPS = ['own', 'faculty', 'ssc', 'hsc'] as const;
const STANDARD_VALUES = [9, 10, 11, 12];

export async function PATCH(request: NextRequest) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const channelId = typeof body?.channelId === 'string' ? body.channelId.trim() : '';

  if (!channelId) {
    return NextResponse.json({ error: '`channelId` is required.' }, { status: 400 });
  }

  // Validate rather than trust: an unknown group would render the channel into
  // a section that does not exist, so it would vanish from the page entirely.
  const group = GROUPS.includes(body?.group) ? body.group : undefined;
  const standards = Array.isArray(body?.standards)
    ? body.standards.filter((n: unknown) => STANDARD_VALUES.includes(n as number))
    : undefined;

  if (group === undefined && standards === undefined && typeof body?.title !== 'string') {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  await updateTrackedChannel(userId, channelId, {
    group,
    standards,
    title: typeof body?.title === 'string' ? body.title : undefined
  });

  return NextResponse.json({ channels: await getTrackedChannels(userId) });
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const channelId = request.nextUrl.searchParams.get('channelId')?.trim();
  const reset = request.nextUrl.searchParams.get('reset') === 'true';

  if (reset) {
    await resetTrackedChannels(userId);
    return NextResponse.json({ channels: await getTrackedChannels(userId) });
  }

  if (!channelId) {
    return NextResponse.json({ error: '`channelId` is required.' }, { status: 400 });
  }

  await removeTrackedChannel(userId, channelId);
  return NextResponse.json({ channels: await getTrackedChannels(userId) });
}
