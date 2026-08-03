import PageContainer from '@/components/layout/page-container';
import { ThumbnailLab } from '@/features/youtube/components/thumbnail-lab';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Thumbnail A/B' };

export default function ThumbnailsPage() {
  return (
    <PageContainer
      pageTitle='Thumbnail A/B'
      pageDescription='Score two thumbnail and title variants before you publish.'
    >
      <ThumbnailLab />
    </PageContainer>
  );
}
