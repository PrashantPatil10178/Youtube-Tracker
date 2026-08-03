'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';

import { generateIdeas } from '../api/service';

export function IdeasView() {
  // Read-only here: the sidebar switcher owns writing this param, and views
  // only need to know which scope to query.
  const [workspaceParam] = useQueryState('ws', parseAsString.withDefault('all'));
  const [seed, setSeed] = useState('');

  const ideas = useMutation({
    mutationFn: (input: { std: string; seed?: string }) => generateIdeas(input.std, input.seed)
  });

  return (
    <div className='flex flex-col gap-6'>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          ideas.mutate({ std: workspaceParam, seed: seed.trim() || undefined });
        }}
        className='flex flex-wrap items-center gap-2'
      >
        <Input
          value={seed}
          onChange={(event) => setSeed(event.target.value)}
          placeholder='Optional: a topic to ground ideas in…'
          aria-label='Optional seed topic'
          className='max-w-md'
        />
        <Button type='submit' disabled={ideas.isPending}>
          {ideas.isPending ? 'Thinking…' : 'Generate ideas'}
        </Button>
      </form>

      {ideas.isError && (
        <p className='text-destructive text-sm'>{(ideas.error as Error).message}</p>
      )}

      {ideas.isPending && (
        <div className='flex flex-col gap-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-28' />
          ))}
        </div>
      )}

      {ideas.isSuccess && (
        <>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline'>
              {ideas.data.source === 'azure-openai'
                ? 'Written by Azure OpenAI'
                : 'Template (no AI key)'}
            </Badge>
            <span className='text-muted-foreground text-sm'>
              {ideas.data.ideas.length} idea{ideas.data.ideas.length === 1 ? '' : 's'}, each tied to
              a measured figure.
            </span>
          </div>

          <div className='flex flex-col gap-3'>
            {ideas.data.ideas.map((idea) => (
              <Card key={idea.title}>
                <CardContent className='flex flex-col gap-3 py-5'>
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <p className='font-medium'>{idea.title}</p>
                    {idea.format && (
                      <Badge variant='outline' className='shrink-0'>
                        {idea.format}
                      </Badge>
                    )}
                  </div>

                  {idea.rationale && <p className='text-sm leading-relaxed'>{idea.rationale}</p>}

                  {idea.evidence && (
                    <p className='text-muted-foreground border-l-2 pl-3 text-xs leading-relaxed'>
                      {idea.evidence}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <p className='text-muted-foreground text-xs'>
            The model writes the titles and reasoning; it is never the source of a number. Every
            figure it was given came from{' '}
            <Link href='/dashboard/insights' className='underline'>
              Insights
            </Link>{' '}
            and{' '}
            <Link href='/dashboard/research' className='underline'>
              Research
            </Link>
            , so each evidence line can be checked there.
          </p>
        </>
      )}
    </div>
  );
}
