'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCompact } from '@/lib/youtube/metrics';
import { useQuery } from '@tanstack/react-query';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';

import { searchChannels } from '../api/service';
import { useTrackedChannels } from '../hooks/use-tracked-channels';
import { useWorkspaces } from '../hooks/use-workspaces';

// A pasted link, @handle, or raw UC… id never needs a name lookup — only
// free text does, so that's the only case worth debouncing a search for.
const IDENTIFIER_PATTERN = /^(https?:\/\/|@|UC[a-zA-Z0-9_-]{10,}$)/i;

/**
 * Single entry point for adding a channel: paste an exact identifier and hit
 * Track, or type a name and pick from live results — one field, one row,
 * instead of two parallel forms fighting for space.
 */
export function AddChannelBar() {
  const { channels, add, isMutating: tracking } = useTrackedChannels();
  const { workspaces, setMembership, isMutating: attaching } = useWorkspaces();
  // Read-only here: the sidebar switcher owns writing this param.
  const [wsParam] = useQueryState('ws', parseAsString.withDefault('all'));
  const activeWorkspace = workspaces.find((w) => w.slug === wsParam);

  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebounce(value.trim(), 350);

  const searchTerm = IDENTIFIER_PATTERN.test(value.trim()) ? '' : debounced;
  const search = useQuery({
    queryKey: ['channel-search', searchTerm],
    queryFn: () => searchChannels(searchTerm),
    enabled: searchTerm.length > 1,
    staleTime: 60 * 1000
  });

  const track = async (idOrHandle: string, title?: string) => {
    const id = idOrHandle.trim();
    if (!id) return;

    const result = await add(id, title);
    const duplicate = !result.ok && /already tracked/i.test(result.reason);
    if (!result.ok && !duplicate) {
      setError(result.reason);
      return;
    }

    // Either freshly tracked, or already tracked under a different scope —
    // either way, make sure it belongs to whichever workspace is open now.
    // Skipping this for a fresh track is the bug that made adds vanish: the
    // channel existed globally but was never filed into the new workspace.
    const pool = result.ok ? result.channels : channels;
    const match = pool.find((c) => c.id.toLowerCase() === id.toLowerCase());

    if (activeWorkspace && match?.rowId) {
      if (match.workspaceIds?.includes(activeWorkspace.id)) {
        setError(duplicate ? `Already in ${activeWorkspace.name}.` : null);
        setValue('');
        return;
      }
      setMembership(activeWorkspace.id, match.rowId, true);
    }

    setValue('');
    setError(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void track(value);
  };

  const results = search.data?.results ?? [];
  const showResults = searchTerm.length > 1;
  const busy = tracking || attaching;

  return (
    <div className='flex flex-col gap-2'>
      <form onSubmit={handleSubmit} className='flex flex-wrap gap-2'>
        <div className='relative min-w-56 max-w-md flex-1'>
          <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2' />
          <Input
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            placeholder='Paste a link, @handle — or type a name to search'
            aria-label='Add a channel'
            className='pl-8'
          />
        </div>
        <Button type='submit' disabled={busy || !value.trim()}>
          {tracking ? 'Tracking…' : 'Track channel'}
        </Button>
      </form>

      {error && <p className='text-destructive text-sm'>{error}</p>}

      {showResults && (
        <div className='divide-border flex flex-col divide-y rounded-lg border'>
          {search.isFetching && results.length === 0 && (
            <p className='text-muted-foreground p-2.5 text-sm'>Searching…</p>
          )}
          {!search.isFetching && search.isSuccess && results.length === 0 && (
            <p className='text-muted-foreground p-2.5 text-sm'>
              No channels matched “{searchTerm}”.
            </p>
          )}
          {search.isError && (
            <p className='text-destructive p-2.5 text-sm'>{(search.error as Error).message}</p>
          )}

          {results.map((result) => (
            <div key={result.channelId} className='flex items-center gap-3 p-2.5'>
              {result.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.avatar}
                  alt=''
                  className='size-8 shrink-0 rounded-full object-cover'
                  loading='lazy'
                />
              ) : (
                <div className='bg-muted size-8 shrink-0 rounded-full' />
              )}

              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{result.title}</p>
                <p className='text-muted-foreground truncate text-xs'>
                  {result.handle ?? result.channelId}
                  {result.subscribers !== null && ` · ${formatCompact(result.subscribers)} subs`}
                </p>
              </div>

              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={busy}
                onClick={() => void track(result.handle ?? result.channelId, result.title)}
              >
                Track
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
