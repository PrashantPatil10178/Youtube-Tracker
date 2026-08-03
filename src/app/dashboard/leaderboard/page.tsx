import PageContainer from '@/components/layout/page-container';
import { LeaderboardView } from '@/features/youtube/components/leaderboard-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard'
};

/**
 * Not server-prefetched: the window is a client control, and prefetching only
 * the default would leave every other window on a cold cache anyway.
 */
export default function LeaderboardPage() {
  return (
    <PageContainer
      pageTitle='Leaderboard'
      pageDescription='Who is publishing most, earning most views, and actually gaining subscribers.'
    >
      <LeaderboardView />
    </PageContainer>
  );
}
