# Backend Mobile Auth Notes

Protected endpoints now support either:

- Supabase cookie session (legacy compatibility)
- `Authorization: Bearer <supabase_access_token>`

## Protected endpoints

- `POST /api/ai-query`
- `POST /api/execute-actions`
- `POST /api/upload`
- `POST /api/clean-data`
- `POST /api/maps/place-details`
- `GET /api/admin/requests`
- `POST /api/admin/approve`
- `POST /api/admin/reject`

## Admin authorization

Admin endpoints additionally require `user_profiles.is_admin = true`.
