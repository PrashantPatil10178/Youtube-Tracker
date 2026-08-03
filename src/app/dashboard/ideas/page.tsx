import PageContainer from '@/components/layout/page-container';
import { IdeasView } from '@/features/youtube/components/ideas-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ideas'
};

/**
 * Generation is user-triggered rather than prefetched: it costs a model call,
 * and firing one on every page view would spend tokens nobody asked for.
 */
export default function IdeasPage() {
  return (
    <PageContainer
      pageTitle='Ideas'
      pageDescription='Video ideas grounded in your benchmarks — every suggestion cites the number behind it.'
    >
      <IdeasView />
    </PageContainer>
  );
}
