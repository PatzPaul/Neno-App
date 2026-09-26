import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/auth/session';
import { localBibleChapter, localEgwChapter, localHymn, localHymns } from '@/packs/local';
import { usePacksStore } from '@/packs/store';

import { api, apiGet, type FeedPage, type Pack, type Schemas } from './client';

const FEED_PAGE = 10;
const LONG = 24 * 60 * 60_000; // licensed content changes rarely

/** Offline-first: read the installed pack, else the API. Pack version is part of the key so updates refresh. */
const usePacksVersion = () => usePacksStore((s) => Object.values(s.installed).map((p) => `${p.slug}@${p.version}`).join(','));

/** Network first (fresh data, audio URLs), falling back to the pack when offline or the request fails. */
async function networkFirst<T>(remote: () => Promise<T>, local: () => T | null): Promise<T> {
  try {
    return await remote();
  } catch (e) {
    const l = local();
    if (l) return l;
    throw e;
  }
}

export function useFeed(lang: string) {
  return useInfiniteQuery({
    queryKey: ['feed', lang],
    queryFn: ({ pageParam }) => apiGet<FeedPage>('/v1/feed', { lang, limit: FEED_PAGE, cursor: pageParam }),
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

// ── Bible ────────────────────────────────────────────────
export function useBibleChapter(translation: string, book: string, chapter: number, parallel?: string | null) {
  const packsVersion = usePacksVersion();
  return useQuery({
    queryKey: ['bible', translation, book, chapter, parallel ?? null, packsVersion],
    queryFn: () =>
      localBibleChapter(translation, book, chapter, parallel) ??
      apiGet<Schemas['BibleChapter']>(`/v1/bible/${translation}/${book}/${chapter}`, { parallel }),
    staleTime: LONG,
    placeholderData: keepPreviousData,
  });
}

// ── EGW ──────────────────────────────────────────────────
export function useEgwBooks(lang: string) {
  return useQuery({
    queryKey: ['egw-books', lang],
    queryFn: () => apiGet<{ books: Schemas['EgwBook'][] }>('/v1/egw/books', { lang }),
    select: (d) => d.books,
    staleTime: LONG,
  });
}

export function useEgwChapter(edition: number, n: number, parallel?: string | null) {
  const packsVersion = usePacksVersion();
  return useQuery({
    queryKey: ['egw', edition, n, parallel ?? null, packsVersion],
    queryFn: () => localEgwChapter(edition, n, parallel) ?? apiGet<Schemas['EgwChapter']>(`/v1/egw/${edition}/chapters/${n}`, { parallel }),
    staleTime: LONG,
    placeholderData: keepPreviousData,
  });
}

// ── Beliefs ──────────────────────────────────────────────
export function useBeliefs(lang: string) {
  return useQuery({
    queryKey: ['beliefs', lang],
    queryFn: () => apiGet<{ beliefs: Schemas['Belief'][] }>('/v1/beliefs', { lang }),
    select: (d) => d.beliefs,
    staleTime: LONG,
  });
}

export function useBelief(n: number, lang: string) {
  return useQuery({
    queryKey: ['belief', n, lang],
    queryFn: () => apiGet<Schemas['Belief']>(`/v1/beliefs/${n}`, { lang }),
    staleTime: LONG,
  });
}

// ── Hymns ────────────────────────────────────────────────
export function useHymnals() {
  return useQuery({
    queryKey: ['hymnals'],
    queryFn: () => apiGet<{ hymnals: Schemas['Hymnal'][] }>('/v1/hymnals'),
    select: (d) => d.hymnals,
    staleTime: LONG,
  });
}

export function useHymns(code: string, q?: string) {
  return useQuery({
    queryKey: ['hymns', code, q ?? ''],
    queryFn: () =>
      networkFirst(
        () => apiGet<{ hymns: Schemas['HymnSummary'][] }>(`/v1/hymnals/${code}/hymns`, { q }),
        () => {
          const hymns = localHymns(code, q);
          return hymns ? { hymns } : null;
        },
      ),
    select: (d) => d.hymns,
    staleTime: LONG,
    placeholderData: keepPreviousData,
    enabled: !!code,
  });
}

export function useHymn(code: string, number: number) {
  return useQuery({
    queryKey: ['hymn', code, number],
    queryFn: () => networkFirst(() => apiGet<Schemas['Hymn']>(`/v1/hymnals/${code}/hymns/${number}`), () => localHymn(code, number)),
    staleTime: LONG,
  });
}

// ── Sabbath School & courses ─────────────────────────────
export function useSabbathSchool(lang: string, date?: string) {
  return useQuery({
    queryKey: ['ss', lang, date ?? 'today'],
    queryFn: () => apiGet<Schemas['SabbathSchoolWeek']>('/v1/sabbath-school/current', { lang, date }),
    staleTime: 60 * 60_000,
  });
}

export function useCourses(lang: string) {
  return useQuery({
    queryKey: ['courses', lang],
    queryFn: () => apiGet<{ courses: Schemas['Course'][] }>('/v1/courses', { lang }),
    select: (d) => d.courses,
    staleTime: LONG,
  });
}

export function useCourseLesson(id: number, n: number) {
  return useQuery({
    queryKey: ['lesson', id, n],
    queryFn: () => apiGet<Schemas['CourseLesson']>(`/v1/courses/${id}/lessons/${n}`),
    staleTime: LONG,
  });
}

// ── Search ───────────────────────────────────────────────
export function useSearch(q: string, lang: string, scope?: Schemas['SearchScope']) {
  const query = q.trim();
  return useQuery({
    queryKey: ['search', query, lang, scope ?? null],
    queryFn: () => apiGet<Schemas['SearchResults']>('/v1/search', { q: query, lang, scope }),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
  });
}

// ── Me ───────────────────────────────────────────────────
export function useMe() {
  const loggedIn = useSession((s) => !!s.tokens);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiGet<Schemas['Me']>('/v1/me', undefined, true),
    enabled: loggedIn,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Schemas['MePatch']) => api<Schemas['Me']>('PATCH', '/v1/me', { body: patch, auth: true }),
    onSuccess: (me) => qc.setQueryData(['me'], me),
  });
}

export function formatBytes(n: number): string {
  return n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`;
}
