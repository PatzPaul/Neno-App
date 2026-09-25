import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { apiGet, type FeedPage, type Pack } from './client';

const FEED_PAGE = 10;

export function useFeed(lang: string) {
  return useInfiniteQuery({
    queryKey: ['feed', lang],
    queryFn: ({ pageParam }) =>
      apiGet<FeedPage>('/v1/feed', { lang, limit: FEED_PAGE, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
  });
}

export function usePacks(lang: string) {
  return useQuery({
    queryKey: ['packs', lang],
    queryFn: () => apiGet<{ packs: Pack[] }>('/v1/packs', { lang }),
    select: (d) => d.packs,
  });
}

export function formatBytes(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`;
}
