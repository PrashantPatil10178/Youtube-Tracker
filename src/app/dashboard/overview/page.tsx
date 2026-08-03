import PageContainer from '@/components/layout/page-container';
import { youtubeKeys } from '@/features/youtube/api/queries';
import { OverviewView } from '@/features/youtube/components/overview-view';
import { getQueryClient } from '@/lib/query-client';
import { computeWorkspaceVideos, isWorkspace } from '@/lib/youtube/aggregate';
import { requireSession } from '@/lib/session';
import { getTrackedChannels } from '@/lib/youtube/tracked';
import { resolveWorkspaceId } from '@/lib/youtube/workspaces';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard'
};

type PageProps = { searchParams: Promise<{ std?: string }> };

export default async function OverviewPage(props: PageProps) {
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

  // Only the video list is prefetched. Insights walks every channel's full
  // history, and on a cold cache that took ~50s — all of it spent before the
  // HTML was sent, on the page users land on. It fetches client-side instead,
  // so the KPIs and breakout feed render immediately and the benchmark line
  // fills in when it is ready.
  void queryClient.prefetchQuery({
    queryKey: youtubeKeys.workspaceVideos(std),
    queryFn: () => computeWorkspaceVideos(channels, std, workspaceId)
  });

  return (
    <PageContainer
      pageTitle='Dashboard'
      pageDescription='What moved across the workspace, and how your output compares.'
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <OverviewView />
      </HydrationBoundary>
    </PageContainer>
  );
}
