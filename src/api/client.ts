import { getAccessToken } from '@/auth/session';

import type { components } from './schema';

export type Schemas = components['schemas'];
export type FeedItem = Schemas['FeedItem'];
export type FeedPage = Schemas['FeedPage'];
export type Pack = Schemas['Pack'];
export type UserMark = Schemas['UserMark'];
export type UserAnswer = Schemas['UserAnswer'];
export type UserProgress = Schemas['UserProgress'];

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://159.65.58.51:8090';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;
type Options = { params?: Params; body?: unknown; auth?: boolean };

/** JSON request to the Neno API. `auth: true` attaches the Keycloak access token (401 when logged out). */
export async function api<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, opts: Options = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.params ?? {})) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const url = `${API_URL}${path}${qs.size ? `?${qs}` : ''}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth) {
    const token = await getAccessToken();
    if (!token) throw new ApiError(401, 'not logged in');
    headers.Authorization = `Bearer ${token}`;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: ctrl.signal,
    });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, body?.error ?? res.statusText);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export const apiGet = <T,>(path: string, params?: Params, auth = false) => api<T>('GET', path, { params, auth });
