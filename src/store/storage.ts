import Storage from 'expo-sqlite/kv-store';

/** Synchronous key-value storage (SQLite-backed on device). Web uses storage.web.ts. */
export const kv = {
  getItem: (k: string) => Storage.getItemSync(k),
  setItem: (k: string, v: string) => Storage.setItemSync(k, v),
  removeItem: (k: string) => {
    Storage.removeItemSync(k);
  },
};
