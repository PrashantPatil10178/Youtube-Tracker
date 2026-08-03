import PageContainer from '@/components/layout/page-container';
import { youtubeKeys } from '@/features/youtube/api/queries';
import { InsightsView } from '@/features/youtube/components/insights-view';
import { getQueryClient } from '@/lib/query-client';
import { computeWorkspaceInsights, isWorkspace } from '@/lib/youtube/aggregate';
import { requireSession } from '@/lib/session';
import { getTrackedChannels } from '@/lib/youtube/tracked';
import { resolveWorkspaceId } from '@/lib/youtube/workspaces';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insights'
};

type PageProps = { searchParams: Promise<{ std?: string }> };

export default async function InsightsPage(props: PageProps) {
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

  // Not awaited: dehydrate captures the pending query and Next streams the
  // result, so the shell renders immediately instead of blocking on a fan-out
  // across every channel in the workspace.
  //
  // The queryFn calls the aggregation directly rather than this app's own HTTP
  // route — a relative `/api/...` fetch has no origin to resolve against on the
  // server. The key must match the client's exactly or the hydrated data is
  // ignored and the client refetches.
  void queryClient.prefetchQuery({
    queryKey: youtubeKeys.workspaceInsights(std),
    queryFn: () => computeWorkspaceInsights(channels, std, workspaceId)
  });

  return (
    <PageContainer
      pageTitle='Insights'
      pageDescription='What actually performs across the workspace — by format, subject, exam and intent.'
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <InsightsView />
      </HydrationBoundary>
    </PageContainer>
  );
}
