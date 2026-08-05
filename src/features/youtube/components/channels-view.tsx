'use client';

import { parseAsString, useQueryState } from 'nuqs';

import type { RosterChannel, RosterGroup } from '../config/roster';
import { ROSTER_GROUPS } from '../config/roster';
import { useTrackedChannels } from '../hooks/use-tracked-channels';
import { useWorkspaces } from '../hooks/use-workspaces';
import { AddChannelBar } from './add-channel-bar';
import { ChannelCard } from './channel-card';

const GROUP_ORDER: RosterGroup[] = ['own', 'faculty', 'ssc', 'hsc'];

export function ChannelsView() {
  const { channels, remove, update, hydrated, isMutating } = useTrackedChannels();
  // Read-only here: the sidebar switcher owns writing this param, and views
  // only need to know which scope to query.
  const [workspaceParam] = useQueryState('ws', parseAsString.withDefault('all'));

  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const activeWorkspace = workspaces.find((w) => w.slug === workspaceParam);

  // Workspaces load in their own query, separate from channels. While it's
  // still pending, `workspaces` is `[]` and a real slug would resolve to no
  // match — falling back to "show everything" in that gap would mount a card
  // (and fire an analytics fetch) for every tracked channel, not just the
  // active workspace's, before snapping back a moment later. "all" has no
  // such gap since it means "show everything" regardless of workspace state.
  const workspaceResolved = workspaceParam === 'all' || !workspacesLoading;

  // A channel outside the selected workspace is hidden, but "all" always shows
  // everything — including channels that belong to no workspace yet, which
  // would otherwise be unreachable and impossible to file.
  const visible = !workspaceResolved
    ? []
    : activeWorkspace
      ? channels.filter((c) => c.workspaceIds?.includes(activeWorkspace.id))
      : channels;

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    ...ROSTER_GROUPS[group],
    // Channels added by hand have no roster entry, so anything with an
    // unrecognised group still needs somewhere to render.
    items: visible.filter((c) => (GROUP_ORDER.includes(c.group) ? c.group : 'ssc') === group)
  })).filter((section) => section.items.length > 0);

  return (
    <div className='flex flex-col gap-8'>
      <AddChannelBar />

      {hydrated && channels.length === 0 && (
        <p className='text-muted-foreground text-sm'>No channels tracked yet.</p>
      )}

      {grouped.map((section) => (
        <section key={section.group} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-baseline gap-2'>
              <h2 className='text-lg font-medium'>{section.title}</h2>
              <span className='text-muted-foreground text-sm tabular-nums'>
                {section.items.length}
              </span>
            </div>
            <p className='text-muted-foreground text-sm'>{section.description}</p>
          </div>

          <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
            {section.items.map((channel: RosterChannel) => (
              <ChannelCard
                key={channel.id}
                query={channel.id}
                note={channel.note}
                channel={channel}
                busy={isMutating}
                onUpdate={(patch) => update(channel.id, patch)}
                onRemove={() => remove(channel.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <p className='text-muted-foreground text-xs'>
        Scores marked <span className='font-medium'>*</span> are provisional — the video is too new
        to judge on total views, so it&apos;s scored on view velocity instead.
      </p>
    </div>
  );
}
