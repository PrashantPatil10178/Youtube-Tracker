'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  position: number;
  channelCount: number;
};

const KEY = ['workspaces'] as const;

type ListResponse = { workspaces: Workspace[] };

async function request(input: RequestInit & { url: string }): Promise<ListResponse> {
  const { url, ...init } = input;
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (HTTP ${res.status})`
    );
  }
  return body as ListResponse;
}

/**
 * The user's workspaces.
 *
 * Membership changes invalidate the tracked-channel list too, because a
 * channel's workspace badges render from that list — without it a card would
 * keep showing stale membership until a reload.
 */
export function useWorkspaces() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: KEY,
    queryFn: () => request({ url: '/api/workspaces' }),
    staleTime: 60 * 1000
  });

  const onSuccess = (data: ListResponse) => {
    queryClient.setQueryData(KEY, data);
    void queryClient.invalidateQueries({ queryKey: ['tracked-channels'] });
  };

  const create = useMutation({
    mutationFn: (name: string) =>
      request({
        url: '/api/workspaces',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      }),
    onSuccess
  });

  const rename = useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      request({
        url: '/api/workspaces',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      }),
    onSuccess
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      request({ url: `/api/workspaces?id=${encodeURIComponent(id)}`, method: 'DELETE' }),
    onSuccess
  });

  const membership = useMutation({
    mutationFn: (input: { workspaceId: string; trackedChannelId: string; member: boolean }) =>
      request({
        url: '/api/workspaces',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      }),
    onSuccess
  });

  return {
    workspaces: list.data?.workspaces ?? [],
    isLoading: list.isPending,
    error: (create.error ?? remove.error ?? list.error) as Error | null,
    isMutating: create.isPending || rename.isPending || remove.isPending || membership.isPending,
    create: (name: string) => create.mutate(name),
    rename: (id: string, name: string) => rename.mutate({ id, name }),
    remove: (id: string) => remove.mutate(id),
    setMembership: (workspaceId: string, trackedChannelId: string, member: boolean) =>
      membership.mutate({ workspaceId, trackedChannelId, member })
  };
}
