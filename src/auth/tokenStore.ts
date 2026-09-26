import * as SecureStore from 'expo-secure-store';

// Native: tokens live in the Keychain / Keystore. Web uses tokenStore.web.ts.
const KEY = 'neno.auth';

export const tokenStore = {
  get: () => SecureStore.getItem(KEY),
  set: (v: string) => SecureStore.setItem(KEY, v),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
