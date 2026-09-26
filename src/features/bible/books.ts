import { useQuery } from '@tanstack/react-query';

import { apiGet, type Schemas } from '@/api/client';

export type BibleBook = Schemas['BibleBook'];

export function useBibleBooks(translation: string) {
  return useQuery({
    queryKey: ['bible-books', translation],
    queryFn: () => apiGet<{ translation: string; books: BibleBook[] }>(`/v1/bible/${translation}/books`),
    select: (d) => d.books,
    staleTime: 24 * 60 * 60_000,
  });
}

/** Display name for an OSIS book code, e.g. "JHN" → "Yohana" (falls back to the code). */
export function useBookName(translation: string, osis: string) {
  const books = useBibleBooks(translation);
  return books.data?.find((b) => b.osis === osis)?.name ?? osis;
}

/** Next/previous chapter across book boundaries, skipping books with no loaded chapters. */
export function neighbour(books: BibleBook[] | undefined, book: string, chapter: number, dir: 1 | -1) {
  if (!books?.length) return null;
  const withText = books.filter((b) => b.chapters > 0);
  const i = withText.findIndex((b) => b.osis === book);
  if (i < 0) return null;
  const cur = withText[i];
  if (dir === 1 && chapter < cur.chapters) return { book, chapter: chapter + 1 };
  if (dir === -1 && chapter > 1) return { book, chapter: chapter - 1 };
  const nb = withText[i + dir];
  if (!nb) return null;
  return { book: nb.osis, chapter: dir === 1 ? 1 : nb.chapters };
}
