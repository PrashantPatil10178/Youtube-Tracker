import { LandingPage } from '@/features/landing/components/landing-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChannelIQ — YouTube analytics, decided by AI',
  description:
    'Track views across every YouTube channel you run, A/B test thumbnails before publishing, and let AI explain what moved the numbers.'
};

/**
 * Public marketing landing page. Signed-in users reach the app through the
 * header CTAs — `/dashboard/overview` is no longer an automatic redirect.
 */
export default function Page() {
  return <LandingPage />;
}
