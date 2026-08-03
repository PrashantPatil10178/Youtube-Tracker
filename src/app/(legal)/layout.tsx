import Link from 'next/link';

/**
 * Shell for the legal pages.
 *
 * These exist because the auth screen tells users they agree to these
 * documents by continuing — a claim that needs somewhere to point. The content
 * is a placeholder, not drafted policy; see the notice on each page.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='bg-background min-h-svh px-6 py-16'>
      <div className='mx-auto flex max-w-2xl flex-col gap-6'>
        <Link href='/' className='text-muted-foreground text-sm underline underline-offset-4'>
          ← Back
        </Link>
        {children}
      </div>
    </div>
  );
}
