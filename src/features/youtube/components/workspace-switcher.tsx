'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useState } from 'react';

import { useWorkspaces } from '../hooks/use-workspaces';

/**
 * Scopes the page to one workspace.
 *
 * Comparing a Class 9 channel against a Class 12 entrance channel says little —
 * different audience sizes, upload rhythms and topic mixes. Scoping is what
 * makes a comparison mean something. Which groupings exist is up to the user:
 * a standard, a set of personal channels, a subject, anything.
 */
export function WorkspaceSwitcher({
  value,
  onChange,
  manageable = false
}: {
  /** Current slug, or `all`. */
  value: string;
  onChange: (slug: string) => void;
  /** Show create/delete controls — on where you manage channels, off elsewhere. */
  manageable?: boolean;
}) {
  const { workspaces, create, remove, isMutating } = useWorkspaces();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create(trimmed);
    setName('');
    setAdding(false);
  };

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-2' role='group' aria-label='Workspace'>
        <Button
          type='button'
          aria-pressed={value === 'all'}
          variant={value === 'all' ? 'default' : 'outline'}
          size='sm'
          onClick={() => onChange('all')}
          className={cn(value !== 'all' && 'text-muted-foreground')}
        >
          All channels
        </Button>

        {workspaces.map((ws) => {
          const active = ws.slug === value;
          return (
            <span key={ws.id} className='group relative inline-flex'>
              <Button
                type='button'
                aria-pressed={active}
                variant={active ? 'default' : 'outline'}
                size='sm'
                onClick={() => onChange(ws.slug)}
                className={cn(!active && 'text-muted-foreground')}
              >
                {ws.name}
                <span className='ml-1.5 tabular-nums opacity-70'>{ws.channelCount}</span>
              </Button>

              {manageable && (
                <button
                  type='button'
                  aria-label={`Delete ${ws.name}`}
                  disabled={isMutating}
                  onClick={() => {
                    // Deleting a grouping must never stop tracking the channels
                    // inside it — this removes the workspace only.
                    remove(ws.id);
                    if (active) onChange('all');
                  }}
                  className='bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 hidden size-4 items-center justify-center rounded-full text-[10px] leading-none group-hover:flex'
                >
                  ×
                </button>
              )}
            </span>
          );
        })}

        {manageable &&
          (adding ? (
            <form onSubmit={submit} className='flex items-center gap-1.5'>
              <Input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => !name.trim() && setAdding(false)}
                placeholder='Class 8, Personal…'
                aria-label='New workspace name'
                className='h-8 w-40'
              />
              <Button type='submit' size='sm' disabled={isMutating || !name.trim()}>
                Add
              </Button>
            </form>
          ) : (
            <Button type='button' variant='ghost' size='sm' onClick={() => setAdding(true)}>
              + Workspace
            </Button>
          ))}
      </div>

      {manageable && workspaces.length === 0 && (
        <p className='text-muted-foreground text-xs'>
          No workspaces yet. Create one to group channels — by standard, by subject, or however you
          think about them.
        </p>
      )}
    </div>
  );
}
