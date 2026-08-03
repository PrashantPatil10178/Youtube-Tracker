import PageContainer from '@/components/layout/page-container';
import { youtubeKeys } from '@/features/youtube/api/queries';
import { WatchView } from '@/features/youtube/components/watch-view';
import { getQueryClient } from '@/lib/query-client';
import { computeWatchFeed, isWorkspace } from '@/lib/youtube/aggregate';
import { requireSession } from '@/lib/session';
import { getTrackedChannels } from '@/lib/youtube/tracked';
import { resolveWorkspaceId } from '@/lib/youtube/workspaces';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Watch'
};

type PageProps = { searchParams: Promise<{ std?: string }> };

export default async function WatchPage(props: PageProps) {
  const { std: raw } = await props.searchParams;
  const std = raw && isWorkspace(raw) ? raw : 'all';

  // requireSession rather than getCurrentSession: reaching a dashboard page
  // without one is a redirect, not an empty state.
  const session = await requireSession();
  const [channels, workspaceId] = await Promise.all([
    getTrackedChannels(session.user.id),
    resolveWorkspaceId(session.user.id, std)
  ]);

  const queryClient = getQueryClient();

  void queryClient.prefetchQuery({
    queryKey: youtubeKeys.watch(std),
    queryFn: () => computeWatchFeed(channels, std, workspaceId)
  });

  return (
    <PageContainer
      pageTitle='Watch'
      pageDescription='What competitors just shipped, and which titles or thumbnails they changed.'
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <WatchView />
      </HydrationBoundary>
    </PageContainer>
  );
}
