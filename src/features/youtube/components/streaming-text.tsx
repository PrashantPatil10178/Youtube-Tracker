'use client';

import { Fragment } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const WORD_VARIANTS = {
  hidden: { opacity: 0, y: 4, filter: 'blur(2px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' }
};

/**
 * Fades a block of text in word by word.
 *
 * None of this app's AI output is actually token-streamed — every digest,
 * idea, and thumbnail score is one model call that resolves all at once — so
 * this simulates the reveal on the client instead of the whole block popping
 * in. `stagger`/`startDelay` are shared across sibling blocks via
 * `planReveal` so a multi-part response (headline + body, or title +
 * rationale + evidence) reads top to bottom as one continuous stream rather
 * than several racing at once.
 */
export function StreamingText({
  text,
  stagger,
  startDelay = 0,
  className
}: {
  text: string;
  stagger: number;
  startDelay?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return <span className={className}>{text}</span>;

  const words = text.split(' ');

  return (
    <motion.span
      className={className}
      initial='hidden'
      animate='visible'
      variants={{
        visible: { transition: { staggerChildren: stagger, delayChildren: startDelay } }
      }}
    >
      {words.map((word, index) => (
        // The space is a plain sibling, not trailing content inside the
        // inline-block span — a space at the end of an inline-block's own
        // line gets trimmed by the browser, which would glue every word
        // together with no gaps.
        <Fragment key={index}>
          <motion.span
            variants={WORD_VARIANTS}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className='inline-block'
          >
            {word}
          </motion.span>
          {index < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </motion.span>
  );
}

/**
 * Splits a set of sibling text segments (e.g. headline + paragraphs, or
 * title + rationale + evidence) into a shared stagger timing so passing each
 * segment's `startDelay` to `StreamingText` makes them read as one continuous
 * top-to-bottom stream instead of racing each other.
 */
export function planReveal(segments: string[]) {
  const wordCounts = segments.map((segment) => (segment ? segment.split(' ').length : 0));
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);
  // Capped so a long response still finishes revealing in under a second.
  const stagger = Math.min(0.02, 0.9 / Math.max(totalWords, 1));

  let cumulative = 0;
  const startDelays = wordCounts.map((count) => {
    const delay = cumulative * stagger;
    cumulative += count;
    return delay;
  });

  return { stagger, startDelays };
}
