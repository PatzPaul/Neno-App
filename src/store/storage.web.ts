// Web: plain localStorage — avoids expo-sqlite's wasm worker, which needs cross-origin isolation.
const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const kv = {
  getItem: (k: string) => safe(() => localStorage.getItem(k), null),
  setItem: (k: string, v: string) => safe(() => localStorage.setItem(k, v), undefined),
  removeItem: (k: string) => safe(() => localStorage.removeItem(k), undefined),
};
