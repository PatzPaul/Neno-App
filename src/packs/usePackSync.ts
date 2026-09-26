import { useEffect } from 'react';

import { usePacks } from '@/api/queries';
import { useSettings } from '@/store/settings';

import { syncPacks } from './manager';

/** After onboarding, fetch packs the user picked and keep installed ones current (skipped in data saver). */
export function usePackSync() {
  const { onboarded, uiLang, packs: wanted, dataSaver } = useSettings();
  const manifest = usePacks(uiLang);
  useEffect(() => {
    if (!onboarded || dataSaver || !manifest.data) return;
    void syncPacks(manifest.data, wanted);
  }, [onboarded, dataSaver, manifest.data, wanted]);
}
