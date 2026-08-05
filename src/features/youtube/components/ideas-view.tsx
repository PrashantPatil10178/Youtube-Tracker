'use client';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';

import { generateIdeas } from '../api/service';
import type { Idea } from '../api/types';
import { planReveal, StreamingText } from './streaming-text';

/**
 * A leading emoji glued straight to the next word (the model doesn't always
 * put a space after it — "🌍Gravitation Full Chapter…").
 */
function normaliseTitle(title: string): string {
  return title.replace(/^(\p{Extended_Pictographic}️?)(?=\S)/u, '$1 ');
}

/**
 * Every evidence string is written as `Label: value; Label: value…` — the
 * prompt hands the model labelled sections (format benchmarks, keyword gaps,
 * output mix) and it echoes them back the same way. Splitting on that turns
 * one dense sentence into the separate citations it actually is. Falls back
 * to the raw sentence if a clause doesn't fit the pattern, rather than
 * mangling text the split heuristic doesn't understand.
 */
function parseEvidence(text: string): Array<{ label: string; value: string }> | null {
  const clauses = text
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean);
  if (clauses.length === 0) return null;

  const parsed = clauses.map((clause) => {
    const i = clause.indexOf(':');
    return i === -1
      ? null
      : { label: clause.slice(0, i).trim(), value: clause.slice(i + 1).trim() };
  });

  return parsed.every((p) => p !== null)
    ? (parsed as Array<{ label: string; value: string }>)
    : null;
}

function IdeaCard({ idea }: { idea: Idea }) {
  const title = normaliseTitle(idea.title);
  const chips = idea.evidence ? parseEvidence(idea.evidence) : null;

  // One continuous stream across title, rationale, and every evidence
  // citation — however many there turn out to be — so a card with three
  // clauses and one with a single sentence both read top to bottom instead of
  // each block racing the others.
  const evidenceSegments = chips ? chips.map((c) => c.value) : idea.evidence ? [idea.evidence] : [];
  const segments = [title, idea.rationale ?? '', ...evidenceSegments];
  const { stagger, startDelays } = planReveal(segments);

  const copyTitle = () => {
    void navigator.clipboard.writeText(title);
    toast('Title copied');
  };

  return (
    <Card>
      <CardContent className='flex flex-col gap-3 py-5'>
        <div className='flex flex-wrap items-start justify-between gap-2'>
          <p className='min-w-0 flex-1 font-medium'>
            <StreamingText text={title} stagger={stagger} startDelay={startDelays[0]} />
          </p>
          <div className='flex shrink-0 items-center gap-1.5'>
            {idea.format && <Badge variant='outline'>{idea.format}</Badge>}
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-7'
              aria-label='Copy title'
              onClick={copyTitle}
            >
              <Icons.copy className='size-3.5' />
            </Button>
          </div>
        </div>

        {idea.rationale && (
          <p className='text-sm leading-relaxed'>
            <StreamingText text={idea.rationale} stagger={stagger} startDelay={startDelays[1]} />
          </p>
        )}

        {chips ? (
          <div className='flex flex-col gap-1 border-l-2 pl-3'>
            <p className='text-muted-foreground text-[11px] tracking-wide uppercase'>Evidence</p>
            <ul className='flex flex-col gap-0.5'>
              {chips.map((chip, index) => (
                <li key={chip.label} className='text-xs leading-relaxed'>
                  <span className='text-muted-foreground'>{chip.label}: </span>
                  <span className='text-foreground'>
                    <StreamingText
                      text={chip.value}
                      stagger={stagger}
                      startDelay={startDelays[index + 2]}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          idea.evidence && (
            <p className='text-muted-foreground border-l-2 pl-3 text-xs leading-relaxed'>
              <StreamingText text={idea.evidence} stagger={stagger} startDelay={startDelays[2]} />
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}

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
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-40' />
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

          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            {ideas.data.ideas.map((idea) => (
              <IdeaCard key={idea.title} idea={idea} />
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
