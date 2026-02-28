# iOS/Android Parity QA Matrix

Status key:
- `Pending`: not yet executed in this workspace session
- `Pass`: verified on target platform
- `Fail`: regression or mismatch found

| # | Scenario | iOS | Android | Notes |
| --- | --- | --- | --- | --- |
| 1 | OTP signup creates pending profile and blocks app until approval | Pending | Pending |  |
| 2 | OTP login succeeds for approved user | Pending | Pending |  |
| 3 | Pending/rejected users blocked with correct messaging | Pending | Pending |  |
| 4 | Bearer-token auth works for protected routes; invalid token returns 401 | Pending | Pending |  |
| 5 | Admin-only routes reject non-admin users with 403 | Pending | Pending |  |
| 6 | Media CRUD preserves user isolation and status history | Pending | Pending |  |
| 7 | Media metadata fetch by title/IMDb respects overrides | Pending | Pending |  |
| 8 | Media metadata search drives autocomplete selection | Pending | Pending |  |
| 9 | Media poster upload enforces type/size and saves URL/path | Pending | Pending |  |
| 10 | Episode tracking updates episodes/history/last watched fields | Pending | Pending |  |
| 11 | Finished-today helper backfills remaining episodes | Pending | Pending |  |
| 12 | Watch-this random picker opens planned item with synopsis | Pending | Pending |  |
| 13 | Media batch operations (select/batch edit/batch metadata) update correctly | Pending | Pending |  |
| 14 | Food CRUD preserves user isolation and image relationships | Pending | Pending |  |
| 15 | Food map URL autofill returns place fields/photos and persists photos | Pending | Pending |  |
| 16 | Food duplicate/log-again resets visit date and keeps template fields | Pending | Pending |  |
| 17 | Food details modal tabs + actions (copy/open/edit/delete) work | Pending | Pending |  |
| 18 | Food item image upload/category behavior persists correctly | Pending | Pending |  |
| 19 | Food calendar month/day grouping matches expected totals | Pending | Pending |  |
| 20 | Food analytics filters match legacy semantics | Pending | Pending |  |
| 21 | Media analytics metrics match legacy outputs on same dataset | Pending | Pending |  |
| 22 | Food analytics KPI/chart outputs match legacy outputs on same dataset | Pending | Pending |  |
| 23 | Food drilldown by selected segment returns correct grouped entries | Pending | Pending |  |
| 24 | AI query visualizations render by `visualizationType` metadata | Pending | Pending |  |
| 25 | AI action confirmation executes selected valid media actions | Pending | Pending |  |
| 26 | AI action requests for food fail safely per current constraints | Pending | Pending |  |
| 27 | Import supports file + paste, preview, clean-data, import counts | Pending | Pending |  |
| 28 | Admin pending/users screens refresh immediately after approve/reject | Pending | Pending |  |
| 29 | Theme preference persists across restart/session restoration | Pending | Pending |  |
| 30 | Storage regression: media poster + food image uploads constraints | Pending | Pending |  |
