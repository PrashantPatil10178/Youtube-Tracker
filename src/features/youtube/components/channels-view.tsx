'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';

import type { RosterChannel, RosterGroup } from '../config/roster';
import { ROSTER_GROUPS } from '../config/roster';
import { useTrackedChannels } from '../hooks/use-tracked-channels';
import { useWorkspaces } from '../hooks/use-workspaces';
import { ChannelCard } from './channel-card';
import { ChannelSearch } from './channel-search';

const GROUP_ORDER: RosterGroup[] = ['own', 'faculty', 'ssc', 'hsc'];

export function ChannelsView() {
  const {
    channels,
    add,
    remove,
    update,
    reset,
    hydrated,
    error: serverError,
    isMutating
  } = useTrackedChannels();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Read-only here: the sidebar switcher owns writing this param, and views
  // only need to know which scope to query.
  const [workspaceParam] = useQueryState('ws', parseAsString.withDefault('all'));

  const { workspaces } = useWorkspaces();
  const activeWorkspace = workspaces.find((w) => w.slug === workspaceParam);

  // A channel outside the selected workspace is hidden, but "all" always shows
  // everything — including channels that belong to no workspace yet, which
  // would otherwise be unreachable and impossible to file.
  const visible = activeWorkspace
    ? channels.filter((c) => c.workspaceIds?.includes(activeWorkspace.id))
    : channels;

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const result = add(value);
    if (result.ok) {
      setValue('');
      setError(null);
    } else {
      setError(result.reason);
    }
  };

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    ...ROSTER_GROUPS[group],
    // Channels added by hand have no roster entry, so anything with an
    // unrecognised group still needs somewhere to render.
    items: visible.filter((c) => (GROUP_ORDER.includes(c.group) ? c.group : 'ssc') === group)
  })).filter((section) => section.items.length > 0);

  return (
    <div className='flex flex-col gap-8'>
      <form onSubmit={handleAdd} className='flex flex-col gap-2'>
        <div className='flex flex-wrap gap-2'>
          <Input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            placeholder='@handle, channel URL, or UC… ID'
            aria-label='Channel to track'
            className='max-w-md'
          />
          <Button type='submit' disabled={isMutating}>
            {isMutating ? 'Saving…' : 'Track channel'}
          </Button>
          <Button type='button' variant='outline' onClick={reset}>
            Reset to roster
          </Button>
        </div>
        {(error || serverError) && (
          <p className='text-destructive text-sm'>{error ?? serverError?.message}</p>
        )}
      </form>

      <ChannelSearch
        onAdd={(handleOrId) => {
          const result = add(handleOrId);
          setError(result.ok ? null : result.reason);
        }}
      />

      {hydrated && channels.length === 0 && (
        <p className='text-muted-foreground text-sm'>
          No channels tracked. Use “Reset to roster” to restore the Maharashtra Board set.
        </p>
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
