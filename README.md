# Analytics Mobile

Mobile-first analytics app built with Expo (React Native), plus a Next.js backend API and shared contracts.

## Repository Layout

- `app/`: Expo Router screens (`(auth)` and `(tabs)` routes)
- `src/features/`: domain-specific client logic
- `src/shared/`: shared API clients, providers, theme, storage, types
- `backend/`: Next.js 16 API/backend service (uses `proxy.ts`)
- `packages/contracts/`: shared types/contracts consumed by mobile and backend
- `docs/`: mobile/backend integration notes

## Prerequisites

- Bun
- Xcode (for iOS simulator) and/or Android Studio (for Android emulator)
- Supabase project with auth + database configured

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Configure mobile environment values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_BACKEND_URL`

`EXPO_PUBLIC_BACKEND_URL` falls back to `expo.extra.backendUrl` in [`app.json`](/Users/mac/Developer/analytics-mobile/app.json), which defaults to `http://localhost:3000`.
In Expo Go development builds, if the configured backend URL host is `localhost`/`127.0.0.1`, the app automatically rewrites it to the Expo runtime LAN host (port preserved) so physical devices can reach your local backend.

3. Configure backend environment values (used by routes in `backend/app/api/*`):

- Required:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Optional (feature-dependent):
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL_NAME`
  - `OMDB_API_KEY`
  - `TMDB_API_KEY`
  - `GOOGLE_MAPS_API_KEY`
  - `SUPABASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_APP_URL`

4. Run backend API (from repo root):

```bash
bun run backend:dev
```

5. Run mobile app (from repo root):

```bash
bun run dev
```

## Root Scripts

- `bun run dev`: start Expo dev server
- `bun run ios`: run iOS target
- `bun run android`: run Android target
- `bun run web`: run Expo web target
- `bun run typecheck`: TypeScript check for mobile + shared packages
- `bun run backend:dev`: start backend dev server
- `bun run backend:build`: build backend

## Backend Scripts

From `backend/`:

- `bun run dev`
- `bun run build`
- `bun run start`
- `bun run lint`

## Docs

- Backend overview: [`backend/README.md`](/Users/mac/Developer/analytics-mobile/backend/README.md)
- Archived legacy web docs: [`docs/archive/backend-readme-web-legacy.md`](/Users/mac/Developer/analytics-mobile/docs/archive/backend-readme-web-legacy.md)
- Mobile auth with bearer tokens: [`docs/api-mobile-auth.md`](/Users/mac/Developer/analytics-mobile/docs/api-mobile-auth.md)
- Mobile parity status: [`docs/parity-matrix.md`](/Users/mac/Developer/analytics-mobile/docs/parity-matrix.md)
- Current parity gap audit: [`docs/parity-gap-audit.md`](/Users/mac/Developer/analytics-mobile/docs/parity-gap-audit.md)
- iOS/Android QA matrix checklist: [`docs/qa-matrix-mobile.md`](/Users/mac/Developer/analytics-mobile/docs/qa-matrix-mobile.md)
