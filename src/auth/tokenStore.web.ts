// Web has no secure enclave; sessionStorage keeps tokens out of long-lived storage.
const KEY = 'neno.auth';

export const tokenStore = {
  get: () => {
    try {
      return sessionStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set: (v: string) => {
    try {
      sessionStorage.setItem(KEY, v);
    } catch {}
  },
  clear: async () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
  },
};
