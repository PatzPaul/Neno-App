import { makeRedirectUri, refreshAsync, useAuthRequest, useAutoDiscovery, exchangeCodeAsync, type DiscoveryDocument } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect } from 'react';
import { create } from 'zustand';

import { tokenStore } from './tokenStore';

WebBrowser.maybeCompleteAuthSession();

export const KEYCLOAK_ISSUER = process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER ?? 'https://sso.mala.co.tz/realms/neno';
export const KEYCLOAK_CLIENT_ID = 'neno-app';
const SCOPES = ['openid', 'profile', 'email', 'offline_access'];

type Tokens = { accessToken: string; refreshToken?: string; idToken?: string; expiresAt: number };

type Session = {
  tokens: Tokens | null;
  /** Display info decoded from the ID token; the API's /v1/me is the source of truth. */
  user: { sub: string; name?: string; email?: string } | null;
  setTokens: (t: Tokens | null) => void;
};

function decodeJwt(token?: string): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      Array.from(atob(b64), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function userFrom(t: Tokens | null): Session['user'] {
  const c = decodeJwt(t?.idToken) ?? decodeJwt(t?.accessToken);
  return c && typeof c.sub === 'string'
    ? { sub: c.sub, name: c.name as string | undefined, email: c.email as string | undefined }
    : null;
}

function load(): Tokens | null {
  try {
    const raw = tokenStore.get();
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

const initial = load();

export const useSession = create<Session>()((set) => ({
  tokens: initial,
  user: userFrom(initial),
  setTokens: (tokens) => {
    if (tokens) tokenStore.set(JSON.stringify(tokens));
    else void tokenStore.clear();
    set({ tokens, user: userFrom(tokens) });
  },
}));

let discoveryCache: DiscoveryDocument | null = null;
async function discovery(): Promise<DiscoveryDocument> {
  if (discoveryCache) return discoveryCache;
  const res = await fetch(`${KEYCLOAK_ISSUER}/.well-known/openid-configuration`);
  const d = await res.json();
  discoveryCache = {
    authorizationEndpoint: d.authorization_endpoint,
    tokenEndpoint: d.token_endpoint,
    revocationEndpoint: d.revocation_endpoint,
    endSessionEndpoint: d.end_session_endpoint,
    userInfoEndpoint: d.userinfo_endpoint,
  };
  return discoveryCache;
}

const toTokens = (r: { accessToken: string; refreshToken?: string; idToken?: string; expiresIn?: number; issuedAt: number }, prev?: Tokens): Tokens => ({
  accessToken: r.accessToken,
  refreshToken: r.refreshToken ?? prev?.refreshToken,
  idToken: r.idToken ?? prev?.idToken,
  expiresAt: (r.issuedAt + (r.expiresIn ?? 300)) * 1000,
});

let refreshing: Promise<string | null> | null = null;

/** A valid access token, refreshing it when it expires within 30s. Null when logged out or refresh fails. */
export async function getAccessToken(): Promise<string | null> {
  const t = useSession.getState().tokens;
  if (!t) return null;
  if (t.expiresAt - Date.now() > 30_000) return t.accessToken;
  if (!t.refreshToken) {
    useSession.getState().setTokens(null);
    return null;
  }
  refreshing ??= (async () => {
    try {
      const r = await refreshAsync({ clientId: KEYCLOAK_CLIENT_ID, refreshToken: t.refreshToken }, await discovery());
      const next = toTokens(r, t);
      useSession.getState().setTokens(next);
      return next.accessToken;
    } catch {
      // Refresh token expired or revoked: drop the session; local data stays and syncs after next login.
      useSession.getState().setTokens(null);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function logout() {
  const t = useSession.getState().tokens;
  useSession.getState().setTokens(null);
  if (!t?.refreshToken) return;
  try {
    // Keycloak's end-session endpoint accepts the refresh token to close the offline session.
    const d = await discovery();
    if (d.endSessionEndpoint) {
      await fetch(d.endSessionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${KEYCLOAK_CLIENT_ID}&refresh_token=${encodeURIComponent(t.refreshToken)}`,
      });
    }
  } catch {}
}

/** Auth code + PKCE login against the Keycloak `neno` realm. */
export function useLogin(locale: string) {
  const disc = useAutoDiscovery(KEYCLOAK_ISSUER);
  const redirectUri = makeRedirectUri({ scheme: 'neno', path: 'auth' });
  const [request, response, promptAsync] = useAuthRequest(
    { clientId: KEYCLOAK_CLIENT_ID, redirectUri, scopes: SCOPES, usePKCE: true, extraParams: { ui_locales: locale } },
    disc,
  );

  useEffect(() => {
    if (response?.type !== 'success' || !disc || !request?.codeVerifier) return;
    exchangeCodeAsync(
      { clientId: KEYCLOAK_CLIENT_ID, code: response.params.code, redirectUri, extraParams: { code_verifier: request.codeVerifier } },
      disc,
    )
      .then((r) => useSession.getState().setTokens(toTokens(r)))
      .catch(() => {});
  }, [response, disc, request, redirectUri]);

  const login = useCallback(() => promptAsync(), [promptAsync]);
  return { ready: !!request && !!disc, login, error: response?.type === 'error' ? response.error : null };
}
