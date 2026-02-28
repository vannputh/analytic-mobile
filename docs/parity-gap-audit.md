# RN Parity Gap Audit (Current Workspace State)

## Completed In This Pass

- `Media`: file-based CSV/TSV/TXT import flow (`expo-document-picker`) with clean preview, batch metadata enrichment, import results summary.
- `Food`: item editor workflow (add/edit/remove item rows), item-level image upload into item records, copy actions (address/maps URL) in details modal.
- `Food`: details tab now renders item image thumbnails and category metadata.
- `Analytics`: food filter parity additions for `minRating` and `wouldReturn`.
- `Analytics`: food drilldown behavior added (chart row select -> grouped place drilldown with expandable children).

## Implemented Previously (Already Present)

- `Auth`: OTP-only request/login flow with pending/rejected handling.
- `Backend`: bearer-token + cookie auth helper for protected API routes.
- `Backend`: admin parity endpoints (`/api/admin/users`, `/api/admin/stats`) and existing approve/reject/requests routes.
- `Media`: metadata search/autocomplete, metadata conflict override chooser, poster picker/upload, watch-this synopsis/open flow, finished-today helper, selection + batch actions.
- `Food`: place suggestions, map URL autofill + map photo ingestion, calendar/day drilldown, duplicate/log-again workflow.
- `AI`: action validation/selection UI, edit-before-run flow, structured result visualizations.
- `Admin`: RN dashboard + requests + all-users status tabs with approve/reject refresh.
- `Profile`: theme toggle + persisted preference via `user_preferences`.

## Remaining Gaps (Still To Port)

- `Media`: watched-table parity still lacks explicit column preference UI parity (batch-edit fields are now implemented).
- `Media`: filter/sort controls are present but not full one-to-one with legacy desktop table behavior.
- `Analytics`: chart rendering is parity for metrics/filtering/drilldown semantics, but visual chart stack is simplified (RN bar-list style, not full chart library parity).
- `QA`: iOS/Android parity matrix execution is not yet completed in this workspace session (implementation-focused pass only).

## Next Recommended Porting Steps

1. Add media column preference persistence UI and complete watched-table control parity.
2. Upgrade analytics visual layer to full chart stack parity while keeping existing metric math/filter semantics.
3. Execute full iOS/Android parity QA matrix and record pass/fail evidence for each required scenario.
