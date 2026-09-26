import type { Pack } from '@/api/client';

// Web reads everything from the API; offline packs are a native-only feature.
export const openPack = (_slug: string): null => null;
export const downloadPack = async (_p: Pack) => {};
export const removePack = (_slug: string) => {};
export const syncPacks = async (_manifest: Pack[], _wanted: string[]) => {};
export const packsSupported = false;
