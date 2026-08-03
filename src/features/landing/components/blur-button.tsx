'use client';

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { useCallback, type MouseEvent, type ReactNode } from 'react';

const blurButtonVariants = cva(
  'group relative inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center justify-center overflow-hidden rounded-full font-season-mix font-medium transition-all duration-350 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.97] active:duration-150 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        filled: 'text-white',
        outline: 'text-[#1e2033]'
      },
      size: {
        sm: 'px-5 py-3 text-[15px]',
        md: 'px-6 py-3 text-base',
        lg: 'px-6 py-3.5 text-lg'
      }
    },
    defaultVariants: {
      variant: 'filled',
      size: 'md'
    }
  }
);

const VARIANT_STYLE = {
  filled: { background: 'linear-gradient(to bottom, #3a3f5c 0%, #1e2033 100%)' },
  outline: {
    background: 'linear-gradient(to bottom, #ffffff 0%, #f0f1f5 100%)',
    boxShadow: 'inset 0 0 0 1px rgba(30,32,51,0.14)'
  }
} as const;

type BlurButtonProps = VariantProps<typeof blurButtonVariants> & {
  children: ReactNode;
  className?: string;
  href?: string;
  ariaLabel?: string;
  target?: string;
};

/**
 * The sarvam.ai pill button. The filled variant tracks the cursor with a soft
 * radial highlight that fades in on hover — the "blur" the name refers to.
 */
export function BlurButton({
  children,
  className,
  variant = 'filled',
  size = 'md',
  href,
  ariaLabel,
  target
}: BlurButtonProps) {
  const resolvedVariant = variant ?? 'filled';

  const handlePointerMove = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--gx', `${event.clientX - rect.left}px`);
    target.style.setProperty('--gy', `${event.clientY - rect.top}px`);
  }, []);

  const content = (
    <>
      {resolvedVariant === 'filled' && (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:opacity-100'
          style={{
            background:
              'radial-gradient(circle 80px at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.16) 0%, transparent 100%)'
          }}
        />
      )}
      <span className='relative z-10 flex items-center gap-2'>{children}</span>
    </>
  );

  const classes = cn(blurButtonVariants({ variant: resolvedVariant, size }), className);
  const style = VARIANT_STYLE[resolvedVariant];

  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={classes}
        style={style}
        onMouseMove={handlePointerMove}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type='button'
      aria-label={ariaLabel}
      className={classes}
      style={style}
      onMouseMove={handlePointerMove}
    >
      {content}
    </button>
  );
}
