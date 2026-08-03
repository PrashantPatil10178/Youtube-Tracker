import PageContainer from '@/components/layout/page-container';
import { ResearchView } from '@/features/youtube/components/research-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Research'
};

/**
 * No server prefetch here, unlike the other pages: there is no keyword to
 * research until the user names one, so there is nothing to fetch at render.
 */
export default function ResearchPage() {
  return (
    <PageContainer
      pageTitle='Research'
      pageDescription='Find topics worth making — measured from what actually ranks, not from invented search volume.'
    >
      <ResearchView />
    </PageContainer>
  );
}
