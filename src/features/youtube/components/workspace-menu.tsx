'use client';

import { Icons } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { useWorkspaces } from '../hooks/use-workspaces';

/**
 * Workspace switcher in the sidebar header.
 *
 * Lives here rather than on each page because the scope is global — every
 * analysis page reads the same `?ws=` param, so switching from one page should
 * carry to the next. Selecting a workspace rewrites that param on the current
 * path, which keeps the choice shareable and survives a refresh.
 */
export function WorkspaceMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { workspaces, create, remove, isMutating } = useWorkspaces();

  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');

  const active = searchParams.get('ws') ?? 'all';
  const activeWorkspace = workspaces.find((w) => w.slug === active);
  const label = activeWorkspace?.name ?? 'All channels';
  const subtitle = activeWorkspace
    ? `${activeWorkspace.channelCount} channel${activeWorkspace.channelCount === 1 ? '' : 's'}`
    : 'Every tracked channel';

  const select = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === 'all') params.delete('ws');
    else params.set('ws', slug);

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  };

  // ⌘B / Ctrl+B opens the menu, matching the shortcut shown in the trigger.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create(trimmed);
    setName('');
    setCreating(false);
    setOpen(false);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size='lg'
                className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              />
            }
          >
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg'>
              <Icons.logo className='size-4' />
            </div>
            <div className='grid flex-1 text-left leading-tight'>
              <span className='truncate text-sm font-semibold'>{label}</span>
              <span className='text-muted-foreground truncate text-xs'>{subtitle}</span>
            </div>
            <Icons.chevronsUpDown className='ml-auto size-4 shrink-0 opacity-60' />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className='w-64 rounded-lg'
            side='bottom'
            align='start'
            sideOffset={4}
          >
            {/* Base UI requires a group around a group label. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className='text-muted-foreground text-xs'>
                Workspaces
              </DropdownMenuLabel>

              <WorkspaceRow
                label='All channels'
                selected={active === 'all'}
                shortcut='⌘B'
                onSelect={() => select('all')}
              />

              {workspaces.map((ws) => (
                <WorkspaceRow
                  key={ws.id}
                  label={ws.name}
                  count={ws.channelCount}
                  selected={ws.slug === active}
                  onSelect={() => select(ws.slug)}
                  onDelete={() => {
                    // Removing a grouping never stops tracking its channels.
                    remove(ws.id);
                    if (ws.slug === active) select('all');
                  }}
                  busy={isMutating}
                />
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {creating ? (
              <form onSubmit={submit} className='p-1'>
                <Input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder='Class 8, Personal…'
                  aria-label='New workspace name'
                  className='h-8'
                />
              </form>
            ) : (
              <DropdownMenuItem
                onClick={(event) => {
                  // Keep the menu open so the input can be typed into.
                  event.preventDefault();
                  setCreating(true);
                }}
                className='gap-2'
              >
                <div className='flex size-6 items-center justify-center rounded-md border border-dashed'>
                  <Icons.add className='size-3.5' />
                </div>
                <span className='text-muted-foreground'>Create New Workspace</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function WorkspaceRow({
  label,
  count,
  selected,
  shortcut,
  onSelect,
  onDelete,
  busy
}: {
  label: string;
  count?: number;
  selected: boolean;
  shortcut?: string;
  onSelect: () => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  return (
    <DropdownMenuItem onClick={onSelect} className='group/row gap-2'>
      <div className='flex size-6 items-center justify-center rounded-md border'>
        <Icons.dashboard className='size-3.5 shrink-0' />
      </div>
      <span className='flex-1 truncate'>{label}</span>

      {count !== undefined && (
        <span className='text-muted-foreground text-xs tabular-nums group-hover/row:hidden'>
          {count}
        </span>
      )}
      {selected && <Icons.check className={cn('size-4 shrink-0', 'text-primary')} />}
      {shortcut && <span className='text-muted-foreground text-xs'>{shortcut}</span>}

      {onDelete && (
        <button
          type='button'
          aria-label={`Delete ${label}`}
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className='text-muted-foreground hover:text-destructive hidden text-xs group-hover/row:block'
        >
          ×
        </button>
      )}
    </DropdownMenuItem>
  );
}
