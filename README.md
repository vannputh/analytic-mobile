# Analytics Mobile

Mobile-first analytics app built with Expo (React Native) and Expo Router API routes.

## Repository Layout

- `app/`: Expo Router screens and API routes (`app/api/*+api.ts`)
- `src/features/`: domain-specific client logic
- `src/server/`: shared server-side helpers/services used by API routes
- `src/shared/`: shared client API layer, providers, theme, storage, types
- `packages/contracts/`: shared request/response contracts
- `backend/`: legacy standalone backend (kept for reference)
- `docs/`: product and integration notes

## Prerequisites

- Bun
- Node.js 20.x (LTS)
- Xcode (for iOS simulator) and/or Android Studio (for Android emulator)
- Supabase project with auth + database configured

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Configure environment values:

- Required:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Optional (feature-dependent):
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL_NAME`
  - `OMDB_API_KEY`
  - `TMDB_API_KEY`
  - `GOOGLE_MAPS_API_KEY`
  - `SUPABASE_STORAGE_BUCKET`
  - `EXPO_PUBLIC_API_URL` (optional override for API base URL)

3. Run Expo (mobile app + API routes):

```bash
bun run dev
```

`EXPO_PUBLIC_API_URL` falls back to `expo.extra.apiUrl` in [`app.json`](/Users/mac/Developer/analytics-mobile/app.json), currently `http://puths-book.local:8081`.
In Expo Go development builds, loopback hosts are rewritten to the runtime LAN host for physical-device access.

## Troubleshooting Expo Go Startup

If Expo Go stays on "Opening project..." for too long, run these checks:

1. Confirm Node 20 is active:

```bash
node -v
```

2. Validate Expo dependency alignment:

```bash
bunx expo-doctor
```

3. Clear stale Metro session on port `8081` and restart with cache clear:

```bash
lsof -nP -iTCP:8081 -sTCP:LISTEN
kill <PID>
bun run dev -- --clear
```

4. If LAN connection still fails, use tunnel mode:

```bash
bun run dev:tunnel
```

## Root Scripts

- `bun run dev`: start Expo dev server
- `bun run dev:tunnel`: start Expo dev server using tunnel networking (physical-device fallback)
- `bun run ios`: run iOS target
- `bun run android`: run Android target
- `bun run web`: run Expo web target
- `bun run typecheck`: TypeScript check for app + shared packages

## Docs

- Legacy backend overview: [`backend/README.md`](/Users/mac/Developer/analytics-mobile/backend/README.md)
- Archived legacy web docs: [`docs/archive/backend-readme-web-legacy.md`](/Users/mac/Developer/analytics-mobile/docs/archive/backend-readme-web-legacy.md)
- Mobile auth with bearer tokens: [`docs/api-mobile-auth.md`](/Users/mac/Developer/analytics-mobile/docs/api-mobile-auth.md)
- Mobile parity status: [`docs/parity-matrix.md`](/Users/mac/Developer/analytics-mobile/docs/parity-matrix.md)
- Current parity gap audit: [`docs/parity-gap-audit.md`](/Users/mac/Developer/analytics-mobile/docs/parity-gap-audit.md)
- iOS/Android QA matrix checklist: [`docs/qa-matrix-mobile.md`](/Users/mac/Developer/analytics-mobile/docs/qa-matrix-mobile.md)
