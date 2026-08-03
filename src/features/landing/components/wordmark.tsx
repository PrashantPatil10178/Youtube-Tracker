import { cn } from '@/lib/utils';

type WordmarkProps = {
  className?: string;
  /** Renders light-on-dark for use inside the gradient panels. */
  inverted?: boolean;
};

/**
 * Type-set wordmark. Deliberately not an image: the mark is just Season Mix
 * with a tightened tracking, so it stays crisp at any size and needs no asset.
 */
export function Wordmark({ className, inverted = false }: WordmarkProps) {
  return (
    <span
      className={cn(
        'font-season-mix inline-flex items-baseline text-[19px] leading-none font-medium tracking-[-0.03em] select-none',
        inverted ? 'text-white' : 'text-tx',
        className
      )}
    >
      channel
      <span className={inverted ? 'text-sr-indigo-300' : 'text-sr-indigo-600'}>iq</span>
    </span>
  );
}
