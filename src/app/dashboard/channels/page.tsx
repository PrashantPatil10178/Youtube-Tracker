import PageContainer from '@/components/layout/page-container';
import { ChannelsView } from '@/features/youtube/components/channels-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Channels'
};

export default function ChannelsPage() {
  return (
    <PageContainer pageTitle='Channels'>
      <ChannelsView />
    </PageContainer>
  );
}
