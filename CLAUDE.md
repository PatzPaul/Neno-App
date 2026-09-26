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
- `npx expo start` targets the dev build (expo-dev-client); `npx expo start --go` for Expo Go (all modules are Expo SDK ones).
- `npm run gen:api` after the API contract changes. `npx tsc --noEmit` + `npx expo lint` before commits.

## API
- `EXPO_PUBLIC_API_URL` in `.env` → `http://159.65.58.51:8090` (plain HTTP for now). app.json allows cleartext
  (Android `usesCleartextTraffic`, iOS `NSAllowsArbitraryLoads`) — remove both once the API is on HTTPS.

## Offline & sync
- Packs (`src/packs/`): manifest `GET /v1/packs`, files `GET /packs/<slug>-v<n>.sqlite`, verified by sha256, stored in
  documents/packs. Readers in `src/packs/local.ts` match the pack schemas documented in `../Neno/CLAUDE.md`.
  Bible/EGW read pack-first; hymns read network-first (audio URLs) with pack fallback. Web has no packs.
- User data (`src/store/userData.ts`): marks/answers/progress with `dirty` outbox; `src/sync/useSync.ts` pushes/pulls
  `POST /v1/sync` when logged in (Keycloak PKCE via `src/auth/session.ts`, realm `neno`, client `neno-app`).

## EAS
- Project `@patzpaul/neno`, app id `com.patzpaul.neno`, profiles in `eas.json` (development / preview / production,
  channels of the same name). `runtimeVersion` policy `appVersion`: bump `version` when native deps change.
- `npx eas-cli update --channel development -m "…"` ships JS to dev builds. iOS builds need interactive Apple credentials.

## Not built yet
Onboarding steps 2–3, 1b/1c feed variants, voice search, chapter audio for the Bible reader, video playback.
