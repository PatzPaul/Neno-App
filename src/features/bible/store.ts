import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kv } from '@/store/storage';

/** Where the reader is. Translations follow the UI language unless the user picks one. */
type Reader = {
  book: string;
  chapter: number;
  parallelOn: boolean;
  goTo: (book: string, chapter: number) => void;
  setParallel: (on: boolean) => void;
};

export const useReader = create<Reader>()(
  persist(
    (set) => ({
      book: 'JHN',
      chapter: 3,
      parallelOn: true,
      goTo: (book, chapter) => set({ book, chapter }),
      setParallel: (parallelOn) => set({ parallelOn }),
    }),
    { name: 'reader', storage: createJSONStorage(() => kv), version: 1 },
  ),
);

// Licensed translations per UI language; French falls back until a French Bible is licensed.
export const PRIMARY_TRANSLATION: Record<string, string> = { sw: 'SUV', en: 'KJV', fr: 'SUV' };
export const parallelFor = (primary: string) => (primary === 'SUV' ? 'KJV' : 'SUV');

/** "JHN.3.16" → { book: "JHN", chapter: 3, verse: 16 } */
export function parseOsis(ref: string) {
  const [book, ch, v] = ref.split('.');
  return { book, chapter: Number(ch) || 1, verse: v ? Number(v) : undefined };
}
