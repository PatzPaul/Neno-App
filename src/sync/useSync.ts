import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { api, ApiError, type Schemas } from '@/api/client';
import { useSession } from '@/auth/session';
import { dirtyRows, useUserData } from '@/store/userData';

const MAX_BATCH = 400; // server rejects > 500 items per kind
const DEBOUNCE_MS = 2_000;
const INTERVAL_MS = 5 * 60_000;

let inFlight: Promise<void> | null = null;

/** One push+pull round against POST /v1/sync. Safe to call concurrently (coalesced). */
export function syncNow(): Promise<void> {
  inFlight ??= (async () => {
    try {
      // Loop so a large outbox drains in batches within one round.
      for (let more = true; more; ) {
        const state = useUserData.getState();
        const d = dirtyRows(state);
        const pushed = { marks: d.marks.slice(0, MAX_BATCH), answers: d.answers.slice(0, MAX_BATCH), progress: d.progress.slice(0, MAX_BATCH) };
        const res = await api<Schemas['SyncResponse']>('POST', '/v1/sync', {
          auth: true,
          body: { cursor: state.cursor, ...pushed },
        });
        useUserData.getState().applySync(pushed, res);
        more = d.marks.length > MAX_BATCH || d.answers.length > MAX_BATCH || d.progress.length > MAX_BATCH;
      }
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) console.warn('sync failed', e);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Keeps the outbox flowing while logged in: after edits (debounced), on foreground, and every 5 minutes. */
export function useSync() {
  const loggedIn = useSession((s) => !!s.tokens);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    void syncNow();
    const unsub = useUserData.subscribe((s, prev) => {
      if (s.marks === prev.marks && s.answers === prev.answers && s.progress === prev.progress) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void syncNow(), DEBOUNCE_MS);
    });
    const app = AppState.addEventListener('change', (st) => st === 'active' && void syncNow());
    const interval = setInterval(() => void syncNow(), INTERVAL_MS);
    return () => {
      unsub();
      app.remove();
      clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [loggedIn]);
}
