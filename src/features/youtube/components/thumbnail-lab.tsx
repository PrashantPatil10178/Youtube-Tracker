'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { compareThumbnails } from '../api/service';
import type { CandidateScore, ThumbnailCandidateInput, ThumbnailComparison } from '../api/types';
import { planReveal, StreamingText } from './streaming-text';

type Slot = { id: string; title: string; imageUrl: string };

const EMPTY: Slot[] = [
  { id: 'a', title: '', imageUrl: '' },
  { id: 'b', title: '', imageUrl: '' }
];

function ScoreBreakdown({ score }: { score: CandidateScore }) {
  const { stagger, startDelays } = planReveal([...score.strengths, ...score.weaknesses]);

  return (
    <div className='flex flex-col gap-3 border-t pt-4'>
      <div className='flex items-baseline justify-between'>
        <span className='text-2xl font-medium tabular-nums'>{score.predictedCtr}%</span>
        <span className='text-muted-foreground text-xs'>
          predicted CTR · {score.confidence}% confidence
        </span>
      </div>
      <ul className='flex flex-col gap-1'>
        {score.strengths.map((s, index) => (
          <li key={s} className='text-chart-3 text-xs'>
            + <StreamingText text={s} stagger={stagger} startDelay={startDelays[index]} />
          </li>
        ))}
        {score.weaknesses.map((w, index) => (
          <li key={w} className='text-muted-foreground text-xs'>
            −{' '}
            <StreamingText
              text={w}
              stagger={stagger}
              startDelay={startDelays[score.strengths.length + index]}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReasoningCard({ result }: { result: ThumbnailComparison }) {
  const { stagger, startDelays } = planReveal([result.reasoning, ...result.suggestions]);

  return (
    <Card>
      <CardContent className='flex flex-col gap-3 py-6'>
        <p className='text-muted-foreground text-xs tracking-wide uppercase'>Why</p>
        <p className='text-sm leading-relaxed'>
          <StreamingText text={result.reasoning} stagger={stagger} startDelay={startDelays[0]} />
        </p>
        {result.suggestions.length > 0 && (
          <>
            <p className='text-muted-foreground mt-2 text-xs tracking-wide uppercase'>
              Suggested edits
            </p>
            <ul className='flex flex-col gap-1'>
              {result.suggestions.map((s, index) => (
                <li key={s} className='text-muted-foreground text-sm'>
                  · <StreamingText text={s} stagger={stagger} startDelay={startDelays[index + 1]} />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Thumbnail + title A/B scoring.
 *
 * Takes image URLs rather than uploads — YouTube thumbnails are already public
 * (`https://i.ytimg.com/vi/<videoId>/maxresdefault.jpg`), so this works for
 * published videos and any image you can host.
 */
export function ThumbnailLab() {
  const [slots, setSlots] = useState<Slot[]>(EMPTY);

  const comparison = useMutation({
    mutationFn: (candidates: ThumbnailCandidateInput[]) => compareThumbnails(candidates)
  });

  const ready = slots.filter((s) => s.title.trim()).length >= 2;

  const update = (id: string, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    comparison.mutate(
      slots
        .filter((s) => s.title.trim())
        .map((s) => ({
          id: s.id,
          title: s.title.trim(),
          imageUrl: s.imageUrl.trim() || undefined
        }))
    );
  };

  const result = comparison.data;

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {slots.map((slot) => {
          const score = result?.scores.find((s) => s.id === slot.id);
          const isWinner = result?.winnerId === slot.id;

          return (
            <Card
              key={slot.id}
              className={cn(isWinner && 'border-chart-3/50 ring-chart-3/20 ring-2')}
            >
              <CardContent className='flex flex-col gap-4 py-6'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>Variant {slot.id.toUpperCase()}</span>
                  {isWinner && (
                    <Badge className='bg-chart-3/15 text-chart-3 border-chart-3/30'>
                      Predicted winner
                    </Badge>
                  )}
                </div>

                <div
                  className='bg-muted relative w-full overflow-hidden rounded-lg'
                  style={{ aspectRatio: '16/9' }}
                >
                  {slot.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slot.imageUrl}
                      alt=''
                      className='h-full w-full object-cover'
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  ) : (
                    <div className='text-muted-foreground flex h-full items-center justify-center text-xs'>
                      Paste a thumbnail URL to preview
                    </div>
                  )}
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor={`title-${slot.id}`}>Title</Label>
                  <Input
                    id={`title-${slot.id}`}
                    value={slot.title}
                    onChange={(e) => update(slot.id, { title: e.target.value })}
                    placeholder='Your video title'
                  />
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor={`img-${slot.id}`}>Thumbnail URL</Label>
                  <Input
                    id={`img-${slot.id}`}
                    value={slot.imageUrl}
                    onChange={(e) => update(slot.id, { imageUrl: e.target.value })}
                    placeholder='https://i.ytimg.com/vi/…/maxresdefault.jpg'
                  />
                </div>

                {score && <ScoreBreakdown score={score} />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className='flex flex-wrap items-center gap-3'>
        <Button type='submit' disabled={!ready || comparison.isPending}>
          {comparison.isPending ? 'Scoring…' : 'Score variants'}
        </Button>
        {result && (
          <Badge variant='outline'>
            {result.source === 'azure-openai' ? 'Scored by Azure OpenAI' : 'Heuristic (no AI key)'}
          </Badge>
        )}
        {!ready && (
          <span className='text-muted-foreground text-sm'>Add a title to both variants.</span>
        )}
      </div>

      {comparison.isError && (
        <p className='text-destructive text-sm'>{(comparison.error as Error).message}</p>
      )}

      {result && <ReasoningCard result={result} />}
    </form>
  );
}
