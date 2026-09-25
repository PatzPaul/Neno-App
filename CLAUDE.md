@AGENTS.md

# Neno-App

Expo (SDK 57) client for Neno. API + design handoff live in the sibling repo **Neno-API** (`../Neno`):
design specs `../Neno/docs/design/README.md`, contract `../Neno/api/openapi.yaml`.

## Layout
- `src/app/` routes: `onboarding.tsx` (1d), `(tabs)/index.tsx` feed (1a), `biblia|maktaba|nyimbo|mimi`.
- `src/theme.ts` tokens (from the handoff) — style only through these. Radius 0; primary button is the only solid fill.
- `src/components/` `Blueprint` (corner marks), `ui.tsx` (Tag, PrimaryButton, Toggle, Stripes), `TabBar`.
- `src/api/` `client.ts` (fetch + `EXPO_PUBLIC_API_URL`), `queries.ts` (TanStack Query), `schema.d.ts` (generated).
- `src/store/` Zustand settings + marks, persisted via `storage.ts` (expo-sqlite kv) / `storage.web.ts` (localStorage).
- `src/i18n/` — **Swahili first**: add strings to `sw.json`, then `en.json`, `fr.json`. No hard-coded UI strings.

## Commands
- `npx expo start` — Expo Go works (no custom native modules yet).
- `npm run gen:api` after the API contract changes. `npx tsc --noEmit` + `npx expo lint` before commits.

## API
- `EXPO_PUBLIC_API_URL` in `.env` → `http://159.65.58.51:8090` (plain HTTP for now). app.json allows cleartext
  (Android `usesCleartextTraffic`, iOS `NSAllowsArbitraryLoads`) — remove both once the API is on HTTPS.

## Not built yet
Offline packs download + SQLite reads, sync outbox, audio/video playback, Biblia/Maktaba/Nyimbo screens,
onboarding steps 2–3, search, 1b/1c feed variants, EAS project config (`eas init`).
