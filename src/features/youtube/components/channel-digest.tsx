'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { channelDigestOptions } from '../api/queries';

/**
 * AI write-up of a channel's recent performance.
 *
 * Deliberately opt-in: each render costs a model call, so it stays collapsed
 * until asked for rather than firing for every tracked channel on page load.
 */
export function ChannelDigest({ query }: { query: string }) {
  const [requested, setRequested] = useState(false);

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    ...channelDigestOptions(query),
    enabled: requested
  });

  if (!requested) {
    return (
      <div className='border-t pt-4'>
        <Button variant='outline' size='sm' onClick={() => setRequested(true)}>
          Explain this channel
        </Button>
      </div>
    );
  }

  return (
    <div className='border-t pt-4'>
      <div className='mb-2 flex items-center gap-2'>
        <p className='text-muted-foreground text-xs tracking-wide uppercase'>AI summary</p>
        {data && (
          <Badge variant='outline' className='text-[10px]'>
            {data.source === 'azure-openai' ? 'Azure OpenAI' : 'template'}
          </Badge>
        )}
        {isFetching && <span className='text-muted-foreground text-xs'>writing…</span>}
      </div>

      {isPending ? (
        <div className='flex flex-col gap-2'>
          <Skeleton className='h-4 w-3/4' />
          <Skeleton className='h-3 w-full' />
          <Skeleton className='h-3 w-5/6' />
        </div>
      ) : isError ? (
        <div className='flex flex-col items-start gap-2'>
          <p className='text-destructive text-sm'>{error.message}</p>
          <Button variant='outline' size='sm' onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className='flex flex-col gap-2'>
          <p className='text-sm font-medium'>{data.headline}</p>
          {data.body.split('\n\n').map((paragraph, index) => (
            <p key={index} className='text-muted-foreground text-sm leading-relaxed'>
              {paragraph}
            </p>
          ))}
          {!data.aiEnabled && (
            <p className='text-muted-foreground text-xs'>
              Set the AZURE_OPENAI_* environment variables for a written analysis.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
