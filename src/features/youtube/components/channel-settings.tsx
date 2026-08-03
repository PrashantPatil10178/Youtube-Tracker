'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

import type { RosterChannel, RosterGroup } from '../config/roster';
import { ROSTER_GROUPS } from '../config/roster';
import { useWorkspaces } from '../hooks/use-workspaces';

const GROUPS: RosterGroup[] = ['own', 'faculty', 'ssc', 'hsc'];

/**
 * Per-channel filing controls.
 *
 * A hand-added channel lands in the SSC group with no standards, which was
 * previously uncorrectable from the UI: it would show in every workspace under
 * a heading that might be plainly wrong. This is the smallest thing that fixes
 * that without a settings page.
 */
export function ChannelSettings({
  channel,
  onUpdate,
  disabled
}: {
  channel: RosterChannel;
  onUpdate: (patch: { group?: RosterGroup }) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { workspaces, setMembership } = useWorkspaces();

  if (!open) {
    return (
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => setOpen(true)}
        aria-expanded={false}
      >
        Edit
      </Button>
    );
  }

  return (
    <div className='bg-muted/40 flex w-full flex-col gap-3 rounded-lg border p-3'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-medium'>Filing</span>
        <Button type='button' variant='ghost' size='sm' onClick={() => setOpen(false)}>
          Done
        </Button>
      </div>

      <div className='flex flex-col gap-1.5'>
        <span className='text-muted-foreground text-xs'>Section</span>
        <div className='flex flex-wrap gap-1.5'>
          {GROUPS.map((group) => (
            <button
              key={group}
              type='button'
              disabled={disabled}
              aria-pressed={channel.group === group}
              onClick={() => onUpdate({ group })}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50',
                channel.group === group
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {ROSTER_GROUPS[group].title}
            </button>
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-1.5'>
        <span className='text-muted-foreground text-xs'>
          Workspaces{' '}
          {channel.workspaceIds?.length ? '' : '(none — only visible under “All channels”)'}
        </span>
        <div className='flex flex-wrap gap-1.5'>
          {workspaces.length === 0 && (
            <span className='text-muted-foreground text-xs'>
              Create a workspace above to file this channel.
            </span>
          )}
          {workspaces.map((ws) => {
            const active = channel.workspaceIds?.includes(ws.id) ?? false;
            return (
              <button
                key={ws.id}
                type='button'
                disabled={disabled || !channel.rowId}
                aria-pressed={active}
                onClick={() => channel.rowId && setMembership(ws.id, channel.rowId, !active)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {ws.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
