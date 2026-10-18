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

// Bible per language (see GET /v1/bible/translations for licence + attribution). Swahili uses Biblica's open
// Neno text until SUV is licensed.
export const PRIMARY_TRANSLATION: Record<string, string> = { sw: 'NENO', en: 'KJV', fr: 'LSG' };
export const TRANSLATION_LANG_NAME: Record<string, string> = { NENO: 'Kiswahili', KJV: 'English', LSG: 'Français' };
export const translationFor = (lang: string) => PRIMARY_TRANSLATION[lang] ?? 'NENO';

/** Second column: the user's second language if it has a Bible, else English (or Swahili when reading English). */
export function parallelFor(primary: string, parallelLang?: string | null) {
  const fromSetting = parallelLang ? PRIMARY_TRANSLATION[parallelLang] : undefined;
  if (fromSetting && fromSetting !== primary) return fromSetting;
  return primary === 'KJV' ? 'NENO' : 'KJV';
}

/** "JHN.3.16" → { book: "JHN", chapter: 3, verse: 16 } */
export function parseOsis(ref: string) {
  const [book, ch, v] = ref.split('.');
  return { book, chapter: Number(ch) || 1, verse: v ? Number(v) : undefined };
}
