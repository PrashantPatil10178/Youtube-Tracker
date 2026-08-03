import { getCurrentSession } from '@/lib/session';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaces,
  renameWorkspace,
  setMembership
} from '@/lib/youtube/workspaces';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * User-defined workspaces.
 *
 * Every handler scopes by the verified session's user id; ids from the request
 * body are only ever used inside a query that also filters on that user, so one
 * account cannot read or mutate another's groupings.
 */
async function requireUser() {
  const session = await getCurrentSession();
  return session?.user.id ?? null;
}

export async function GET() {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  return NextResponse.json(
    { workspaces: await getWorkspaces(userId) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name : '';

  try {
    return NextResponse.json({ workspaces: await createWorkspace(userId, name) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create workspace.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json().catch(() => null);

  try {
    // Two operations share this handler: renaming, and toggling a channel's
    // membership. They're distinguished by which fields are present.
    if (typeof body?.trackedChannelId === 'string' && typeof body?.workspaceId === 'string') {
      await setMembership(userId, body.workspaceId, body.trackedChannelId, Boolean(body.member));
    } else if (typeof body?.id === 'string' && typeof body?.name === 'string') {
      await renameWorkspace(userId, body.id, body.name);
    } else {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    return NextResponse.json({ workspaces: await getWorkspaces(userId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update workspace.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUser();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: '`id` is required.' }, { status: 400 });

  await deleteWorkspace(userId, id);
  return NextResponse.json({ workspaces: await getWorkspaces(userId) });
}
