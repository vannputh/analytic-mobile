# React Native Parity Matrix (Current)

## Core Flow Status

| Domain | Flow | Target RN Screen | Status |
| --- | --- | --- | --- |
| Auth | Request access + OTP login + pending/rejected handling | `/(auth)/login` | Implemented |
| Media | List/search/create/delete/edit + metadata + episode history + watch-this + finished-today | `/(tabs)/media` | Implemented (major parity) |
| Media | Import (paste + file picker + clean preview + enrichment + import summary) | `/(tabs)/media` | Implemented |
| Food | Calendar diary + add/edit tabs + maps autofill + images + details tabs | `/(tabs)/food` | Implemented (major parity) |
| Food | Item-level image behavior + copy actions in details | `/(tabs)/food` | Implemented |
| Analytics | Media + food filters/KPIs/charts + food drilldown behavior | `/(tabs)/analytics` | Implemented (visual style simplified) |
| AI | Query visualizations + action validation/selection/edit/execute | `/(tabs)/ai` | Implemented |
| Admin | Dashboard + pending requests + users status tabs + approve/reject | `/(tabs)/admin` | Implemented |
| Profile | Profile state + theme preference persistence + logout/session restore | `/(tabs)/profile` | Implemented |

## Known Remaining Gaps

- Media watched-table parity still needs explicit column preference UI parity.
- Analytics visual presentation remains RN-native/simplified versus legacy web chart library rendering.
- Full iOS/Android manual parity matrix execution is pending. See [`docs/qa-matrix-mobile.md`](/Users/mac/Developer/analytics-mobile/docs/qa-matrix-mobile.md).

## Deferred Scope

- Magic-link/deep-link-first auth UX (OTP-only in mobile app for this pass)
- Offline-first sync
- Push notifications
