import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UiLang } from '@/i18n';

import { kv } from './storage';

// Synchronous adapter so settings are hydrated before the first render (no onboarding flash).
const syncStorage = createJSONStorage(() => kv);

type Settings = {
  onboarded: boolean;
  uiLang: UiLang;
  /** Second language shown under content; null = off. */
  parallelLang: string | null;
  dataSaver: boolean;
  textScale: number;
  /** Offline packs picked during onboarding (download flow comes with cmd/packs). */
  packs: string[];
  set: (patch: Partial<Omit<Settings, 'set'>>) => void;
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      onboarded: false,
      uiLang: 'sw',
      parallelLang: 'en',
      dataSaver: false,
      textScale: 1,
      packs: [],
      set: (patch) => set(patch),
    }),
    { name: 'settings', storage: syncStorage, version: 1 },
  ),
);
