'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCompact } from '@/lib/youtube/metrics';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { searchChannels } from '../api/service';

/**
 * Find-a-channel by name.
 *
 * The plain add-field needs an exact `@handle` or `UC…` id, which you only have
 * for channels you already follow. Regional educators are the common case where
 * the display name and the handle share nothing.
 */
export function ChannelSearch({ onAdd }: { onAdd: (handleOrId: string) => void }) {
  const [term, setTerm] = useState('');

  const search = useMutation({
    mutationFn: (query: string) => searchChannels(query)
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    if (query) search.mutate(query);
  };

  const results = search.data?.results ?? [];

  return (
    <div className='flex flex-col gap-3'>
      <form onSubmit={handleSubmit} className='flex flex-wrap gap-2'>
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder='Search YouTube by channel name…'
          aria-label='Search for a channel'
          className='max-w-md'
        />
        <Button type='submit' variant='outline' disabled={search.isPending || !term.trim()}>
          {search.isPending ? 'Searching…' : 'Search'}
        </Button>
      </form>

      {search.isError && (
        <p className='text-destructive text-sm'>{(search.error as Error).message}</p>
      )}

      {search.isSuccess && results.length === 0 && (
        <p className='text-muted-foreground text-sm'>No channels matched “{search.variables}”.</p>
      )}

      {results.length > 0 && (
        <Card>
          <CardContent className='flex flex-col gap-3 py-4'>
            {results.map((result) => (
              <div key={result.channelId} className='flex items-center gap-3'>
                {result.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.avatar}
                    alt=''
                    className='size-9 shrink-0 rounded-full object-cover'
                    loading='lazy'
                  />
                ) : (
                  <div className='bg-muted size-9 shrink-0 rounded-full' />
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
                  onClick={() => onAdd(result.handle ?? result.channelId)}
                >
                  Track
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
