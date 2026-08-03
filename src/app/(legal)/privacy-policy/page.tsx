import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPolicyPage() {
  return (
    <article className='flex flex-col gap-4'>
      <h1 className='page-heading text-3xl font-semibold'>Privacy Policy</h1>

      <p className='border-destructive/40 bg-destructive/5 rounded-lg border p-4 text-sm'>
        <strong>This policy has not been written yet.</strong> This page is a placeholder so the
        link on the sign-in screen resolves. Publishing this product without a real privacy policy
        would be both a legal and an honesty problem — replace this page before launch.
      </p>

      <p className='text-muted-foreground text-sm leading-relaxed'>
        For reference when drafting it, the application currently stores: your account email and a
        hashed password (via Better Auth), and periodic snapshots of the public YouTube channels you
        track — channel totals, and per-video titles, thumbnails and view counts. All YouTube data
        is public information retrieved without an API key. No analytics or advertising trackers are
        integrated.
      </p>
    </article>
  );
}
