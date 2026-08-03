'use client';

import { useEffect, useRef } from 'react';

type RevealOptions = {
  /** Fraction of the element that must be visible before revealing. */
  threshold?: number;
  /** Extra bottom margin so the reveal fires slightly before the edge. */
  rootMargin?: string;
};

/**
 * Adds `is-revealed` once the element scrolls into view, matching the
 * IntersectionObserver-driven reveals on sarvam.ai. Reveals are one-shot.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -10% 0px'
}: RevealOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!('IntersectionObserver' in window)) {
      node.classList.add('is-revealed');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return ref;
}
