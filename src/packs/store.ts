import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kv } from '@/store/storage';

export type Installed = { slug: string; version: number; file: string; sha256: string; bytes: number; lang: string };
export type PackStatus = { state: 'downloading' | 'error'; progress: number; error?: string };

type Packs = {
  /** Packs on disk, by slug (persisted). */
  installed: Record<string, Installed>;
  /** Transient download state, by slug. */
  status: Record<string, PackStatus | undefined>;
  setInstalled: (p: Installed | null, slug: string) => void;
  setStatus: (slug: string, s: PackStatus | undefined) => void;
};

export const usePacksStore = create<Packs>()(
  persist(
    (set) => ({
      installed: {},
      status: {},
      setInstalled: (p, slug) =>
        set((s) => {
          const installed = { ...s.installed };
          if (p) installed[slug] = p;
          else delete installed[slug];
          return { installed };
        }),
      setStatus: (slug, st) => set((s) => ({ status: { ...s.status, [slug]: st } })),
    }),
    {
      name: 'packs',
      storage: createJSONStorage(() => kv),
      version: 1,
      partialize: (s) => ({ installed: s.installed }) as Packs,
    },
  ),
);
