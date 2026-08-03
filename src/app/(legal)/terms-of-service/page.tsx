import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsOfServicePage() {
  return (
    <article className='flex flex-col gap-4'>
      <h1 className='page-heading text-3xl font-semibold'>Terms of Service</h1>

      <p className='border-destructive/40 bg-destructive/5 rounded-lg border p-4 text-sm'>
        <strong>These terms have not been written yet.</strong> This page is a placeholder so the
        link on the sign-in screen resolves. The sign-in screen currently states that continuing
        constitutes agreement to these terms, which cannot be true until they exist — replace this
        page before launch.
      </p>

      <p className='text-muted-foreground text-sm leading-relaxed'>
        Two things worth covering when drafting them: the application reads public YouTube data
        through an unofficial client rather than the official Data API, and the fonts used in the
        interface are commercially licensed.
      </p>
    </article>
  );
}
