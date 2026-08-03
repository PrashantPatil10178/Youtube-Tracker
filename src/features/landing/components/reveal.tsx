'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

import { useReveal } from '../hooks/use-reveal';

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** `fade` slides up on enter, `scale` grows in — matches the two site variants. */
  variant?: 'fade' | 'scale';
  as?: 'div' | 'section';
};

export function Reveal({ children, className, variant = 'fade', as = 'div' }: RevealProps) {
  const ref = useReveal<HTMLDivElement>();
  const Tag = as;

  return (
    <Tag
      ref={ref}
      className={cn(variant === 'scale' ? 'scale-reveal' : 'section-reveal', className)}
    >
      {children}
    </Tag>
  );
}
