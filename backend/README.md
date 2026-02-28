# Analytics Backend (API Service)

This subproject is the Next.js backend service for mobile clients.

## Scope

- Serves `/api/*` routes used by mobile.
- Supports Supabase auth from either:
  - Cookie session (legacy web-compatible)
  - `Authorization: Bearer <supabase_access_token>` (mobile)
- No web UI pages are shipped from this service.

## Active Routes

- `GET /api/health`
- `POST /api/auth/check-user`
- `GET /api/metadata`
- `GET /api/metadata/search`
- `POST /api/maps/place-details`
- `POST /api/ai-query`
- `POST /api/execute-actions`
- `POST /api/clean-data`
- `POST /api/upload`
- `GET /api/admin/requests`
- `GET /api/admin/users`
- `GET /api/admin/stats`
- `POST /api/admin/approve`
- `POST /api/admin/reject`

## Removed Compatibility Routes

- `GET /api/omdb`
- `GET /auth/callback`

## Run

```bash
bun run dev
```
