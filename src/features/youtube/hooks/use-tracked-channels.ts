'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { RosterChannel, RosterGroup } from '../config/roster';

/**
 * The signed-in user's tracked channels.
 *
 * Server-backed rather than localStorage-backed. The previous version kept the
 * list per-browser, which meant this page and every analysis page disagreed
 * about what "tracked" meant: adding a channel here changed one card grid and
 * left Videos, Insights and Watch reading a hardcoded roster.
 */
const KEY = ['tracked-channels'] as const;

type ListResponse = { channels: RosterChannel[] };

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

export function useTrackedChannels() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: KEY,
    queryFn: () => request({ url: '/api/channels' }),
    staleTime: 60 * 1000
  });

  // Every mutation returns the new list, so the cache is replaced from the
  // server's answer rather than patched optimistically — the server decides
  // ordering and seeding, and guessing at it here would drift.
  const onSuccess = (data: ListResponse) => queryClient.setQueryData(KEY, data);

  const addMutation = useMutation({
    mutationFn: (input: { channelId: string; title?: string }) =>
      request({
        url: '/api/channels',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      }),
    onSuccess
  });

  const removeMutation = useMutation({
    mutationFn: (channelId: string) =>
      request({
        url: `/api/channels?channelId=${encodeURIComponent(channelId)}`,
        method: 'DELETE'
      }),
    onSuccess
  });

  const updateMutation = useMutation({
    mutationFn: (input: { channelId: string; group?: RosterGroup }) =>
      request({
        url: '/api/channels',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      }),
    onSuccess
  });

  const resetMutation = useMutation({
    mutationFn: () => request({ url: '/api/channels?reset=true', method: 'DELETE' }),
    onSuccess
  });

  return {
    channels: list.data?.channels ?? [],
    hydrated: !list.isPending,
    error: list.error as Error | null,
    isMutating:
      addMutation.isPending ||
      removeMutation.isPending ||
      resetMutation.isPending ||
      updateMutation.isPending,
    // Async and caller-facing so the UI can decide what a duplicate means —
    // e.g. attaching an already-tracked channel to a different workspace
    // rather than surfacing "already tracked" as a dead end.
    add: async (input: string, title?: string) => {
      const id = input.trim();
      if (!id) return { ok: false as const, reason: 'Enter a channel handle, ID or URL.' };
      try {
        const data = await addMutation.mutateAsync({ channelId: id, title });
        return { ok: true as const, channels: data.channels };
      } catch (err) {
        return {
          ok: false as const,
          reason: err instanceof Error ? err.message : 'Could not track channel.'
        };
      }
    },
    remove: (channelId: string) => removeMutation.mutate(channelId),
    update: (channelId: string, patch: { group?: RosterGroup }) =>
      updateMutation.mutate({ channelId, ...patch }),
    reset: () => resetMutation.mutate()
  };
}
