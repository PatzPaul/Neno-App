import type { components } from './schema';

export type Schemas = components['schemas'];
export type FeedItem = Schemas['FeedItem'];
export type FeedPage = Schemas['FeedPage'];
export type Pack = Schemas['Pack'];

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://159.65.58.51:8090';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined) qs.set(k, String(v));
  const url = `${API_URL}${path}${qs.size ? `?${qs}` : ''}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, body?.error ?? res.statusText);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}
