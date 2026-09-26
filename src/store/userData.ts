import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Schemas, UserAnswer, UserMark, UserProgress } from '@/api/client';

import { kv } from './storage';

type Target = Schemas['TargetKind'];
type MarkKind = UserMark['kind'];

/** Local rows carry `dirty` until the server acknowledges them via /v1/sync (the outbox). */
export type Mark = UserMark & { dirty?: boolean };
export type Answer = UserAnswer & { dirty?: boolean };
export type Progress = UserProgress & { dirty?: boolean };

type UserData = {
  marks: Record<string, Mark>;
  answers: Record<string, Answer>;
  progress: Record<string, Progress>;
  cursor?: string;

  /** Like/save: toggles one live mark per (kind, target, ref). */
  toggleMark: (kind: Extract<MarkKind, 'like' | 'save'>, target: Target, ref: string) => void;
  /** Highlight/note: create (no id) or update a mark. Returns its id. */
  putMark: (m: { id?: string; kind: MarkKind; target: Target; target_ref: string; color?: string; note?: string }) => string;
  removeMark: (id: string) => void;
  setAnswer: (target: Target, ref: string, a: { answer?: string; option_id?: number }) => void;
  setProgress: (target: Target, ref: string, p: { position?: string; percent?: number }) => void;

  /** Apply a sync round: clear dirty flags on what was pushed (unless edited meanwhile), merge pulled rows LWW. */
  applySync: (
    pushed: { marks: Mark[]; answers: Answer[]; progress: Progress[] },
    pulled: { cursor: string; marks: UserMark[]; answers: UserAnswer[]; progress: UserProgress[] },
  ) => void;
  reset: () => void;
};

const now = () => new Date().toISOString();
const progressKey = (target: Target, ref: string) => `${target}:${ref}`;

export function findLiveMark(marks: Record<string, Mark>, kind: MarkKind, target: Target, ref: string) {
  for (const m of Object.values(marks)) if (m.kind === kind && m.target === target && m.target_ref === ref && !m.deleted_at) return m;
  return undefined;
}

function mergeLww<T extends { updated_at: string; dirty?: boolean }>(local: T | undefined, remote: T): T {
  if (!local) return remote;
  return Date.parse(remote.updated_at) >= Date.parse(local.updated_at) ? remote : local;
}

function acked<T extends { updated_at: string; dirty?: boolean }>(current: T | undefined, pushed: T): T | undefined {
  // Only clear the flag if the row wasn't edited again while the request was in flight.
  if (!current) return undefined;
  return current.updated_at === pushed.updated_at ? { ...current, dirty: false } : current;
}

const empty = { marks: {}, answers: {}, progress: {}, cursor: undefined };

export const useUserData = create<UserData>()(
  persist(
    (set, get) => ({
      ...empty,

      toggleMark: (kind, target, ref) =>
        set((s) => {
          const t = now();
          const live = findLiveMark(s.marks, kind, target, ref);
          const next: Mark = live
            ? { ...live, deleted_at: t, updated_at: t, dirty: true }
            : { id: randomUUID(), kind, target, target_ref: ref, created_at: t, updated_at: t, dirty: true };
          return { marks: { ...s.marks, [next.id]: next } };
        }),

      putMark: ({ id, ...m }) => {
        const t = now();
        const prev = id ? get().marks[id] : undefined;
        const next: Mark = { ...prev, ...m, id: id ?? randomUUID(), created_at: prev?.created_at ?? t, updated_at: t, deleted_at: undefined, dirty: true };
        set((s) => ({ marks: { ...s.marks, [next.id]: next } }));
        return next.id;
      },

      removeMark: (id) =>
        set((s) => {
          const m = s.marks[id];
          if (!m) return s;
          const t = now();
          return { marks: { ...s.marks, [id]: { ...m, deleted_at: t, updated_at: t, dirty: true } } };
        }),

      setAnswer: (target, ref, a) =>
        set((s) => {
          const key = progressKey(target, ref);
          const prev = s.answers[key];
          const next: Answer = { ...prev, ...a, id: prev?.id ?? randomUUID(), target, target_ref: ref, updated_at: now(), dirty: true };
          return { answers: { ...s.answers, [key]: next } };
        }),

      setProgress: (target, ref, p) =>
        set((s) => {
          const key = progressKey(target, ref);
          const next: Progress = { ...s.progress[key], ...p, target, target_ref: ref, updated_at: now(), dirty: true };
          return { progress: { ...s.progress, [key]: next } };
        }),

      applySync: (pushed, pulled) =>
        set((s) => {
          const marks = { ...s.marks };
          const answers = { ...s.answers };
          const progress = { ...s.progress };
          for (const m of pushed.marks) {
            const a = acked(marks[m.id], m);
            if (a) marks[m.id] = a;
          }
          for (const a of pushed.answers) {
            const key = progressKey(a.target, a.target_ref);
            const r = acked(answers[key], a);
            if (r) answers[key] = r;
          }
          for (const p of pushed.progress) {
            const key = progressKey(p.target, p.target_ref);
            const r = acked(progress[key], p);
            if (r) progress[key] = r;
          }
          for (const m of pulled.marks) marks[m.id] = mergeLww(marks[m.id], m);
          for (const a of pulled.answers) {
            const key = progressKey(a.target, a.target_ref);
            answers[key] = mergeLww(answers[key], a);
          }
          for (const p of pulled.progress) {
            const key = progressKey(p.target, p.target_ref);
            progress[key] = mergeLww(progress[key], p);
          }
          return { marks, answers, progress, cursor: pulled.cursor };
        }),

      reset: () => set(empty),
    }),
    { name: 'userData', storage: createJSONStorage(() => kv), version: 1 },
  ),
);

export function dirtyRows(s: Pick<UserData, 'marks' | 'answers' | 'progress'>) {
  const strip = <T extends { dirty?: boolean }>(r: T) => {
    const { dirty: _dirty, ...rest } = r;
    return rest;
  };
  return {
    marks: Object.values(s.marks).filter((m) => m.dirty).map(strip),
    answers: Object.values(s.answers).filter((a) => a.dirty).map(strip),
    progress: Object.values(s.progress).filter((p) => p.dirty).map(strip),
  };
}
