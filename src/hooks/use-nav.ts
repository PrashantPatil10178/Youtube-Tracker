'use client';

/**
 * Navigation filtering.
 *
 * Clerk's organization/permission model is gone, so the RBAC predicates it
 * backed (`requireOrg`, `permission`, `plan`, `feature`, `role`) no longer have
 * a source of truth. Items are filtered on session presence only.
 *
 * This was never a security boundary — it controls menu visibility. Real
 * authorization lives in `requireSession()` and the route handlers.
 */

import { authClient } from '@/lib/auth-client';
import type { NavGroup, NavItem } from '@/types';
import { useMemo } from 'react';

function isVisible(item: NavItem, signedIn: boolean): boolean {
  // Anything that previously demanded an org or a permission now just
  // requires being signed in.
  if (item.access) return signedIn;
  return true;
}

export function useFilteredNavItems(items: NavItem[]) {
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  return useMemo(
    () =>
      items
        .filter((item) => isVisible(item, signedIn))
        .map((item) => ({
          ...item,
          items: item.items?.filter((child) => isVisible(child, signedIn))
        })),
    [items, signedIn]
  );
}

export function useFilteredNavGroups(groups: NavGroup[]) {
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  return useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items
            .filter((item) => isVisible(item, signedIn))
            .map((item) => ({
              ...item,
              items: item.items?.filter((child) => isVisible(child, signedIn))
            }))
        }))
        .filter((group) => group.items.length > 0),
    [groups, signedIn]
  );
}
