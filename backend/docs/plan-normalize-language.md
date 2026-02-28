# Plan: Normalize language to English (including existing data)

This document extends the language normalization plan to **explicitly include normalizing all existing Supabase data** to English, with a clear way for you to run it.

---

## Normalize existing data in Supabase

### Goal

Update every row in `media_entries` and `book_entries` so that the `language` column contains only **English names** (e.g. "Korean" not "한국어"). This is a one-time (or occasional) migration for data that was stored before normalization was applied.

### Implementation

1. **Server actions in [lib/actions.ts](lib/actions.ts)**

   - **`normalizeAllMediaLanguages()`**
     - Select all `media_entries` with `id` and `language`.
     - For each row: `normalized = normalizeLanguage(entry.language)` (handles array, JSON string, comma-separated string).
     - If `normalized` is different from current `entry.language` (compare as sorted arrays), update the row: `{ language: normalized }`.
     - Process in batches (e.g. 50–100 rows per update) to avoid timeouts.
     - Return `{ success: true, updated: number, errors?: string[] }`.
   - **`normalizeAllBookLanguages()`**
     - Same logic for `book_entries`: select `id` and `language`, normalize with `normalizeLanguage`, update only when changed, batched.
     - Return same shape.

2. **Optional: single combined action**

   - **`normalizeAllLanguages()`** that calls both media and book normalization and returns combined counts (e.g. `{ mediaUpdated, bookUpdated, success, errors }`). This gives one entry point for “fix all existing data”.

3. **UI to run it**

   - Add a **“Normalize languages”** control so you can run the migration without scripts:
     - **Option A (recommended):** A button on the **Import** page ([app/import/page.tsx](app/import/page.tsx)), e.g. in a “Data tools” or “Maintenance” section: “Normalize all language values to English”. On click: call `normalizeAllLanguages()` (or both actions), show a loading state, then toast with result (e.g. “Updated 42 media and 3 book entries” or “No changes needed”).
     - **Option B:** A small “Settings” or “Data” section in the app that exposes the same button.
   - The button should be clearly labeled (e.g. “Normalize existing languages to English”) and optionally show a short description: “Converts all stored language values (e.g. 한국어) to English names (e.g. Korean). Safe to run multiple times.”

### Behaviour

- **Idempotent:** Running it again after everything is normalized should result in “0 updated” (or “No changes needed”). No duplicate work or corruption.
- **Non-destructive:** Only the `language` field is updated; values are replaced with their normalized English form, not removed.
- **Safe for concurrent use:** Batched updates avoid long-running single transactions. If you run it while others are editing, last write wins per row.

### Order relative to other work

1. Implement **write-side normalization** everywhere (APIs, forms, CSV, batch fetch, book actions) so **new** data is always stored in English.
2. Implement the **server actions** above and the **“Normalize languages”** UI so you can fix **existing** data in one click.
3. Optionally run the migration once; afterwards, display and filters will show consistent English names for all entries.

---

## Summary of all planned changes (from original plan)

| Area | What |
|------|------|
| **APIs** | Normalize language in [app/api/metadata/route.ts](app/api/metadata/route.ts) (TMDB, OMDB, Google Books). Legacy `app/api/omdb/route.ts` has been removed. |
| **Form** | Normalize in [hooks/useMediaForm.ts](hooks/useMediaForm.ts) (handleLanguageChange, applyMetadata) and [components/media-details-dialog.tsx](components/media-details-dialog.tsx) (initial language). |
| **Filters** | Build options from normalized set in [lib/actions.ts](lib/actions.ts) getMediaFilterOptions. |
| **CSV** | Normalize in [lib/csv-utils.ts](lib/csv-utils.ts) and [lib/csv-parser.ts](lib/csv-parser.ts). |
| **Batch** | Normalize in [hooks/useBatchMetadataFetch.ts](hooks/useBatchMetadataFetch.ts). |
| **Books** | Normalize in [lib/book-types.ts](lib/book-types.ts) and [lib/book-actions.ts](lib/book-actions.ts); filter/options and create/update. |
| **Existing data** | **New:** Server actions `normalizeAllMediaLanguages()` and `normalizeAllBookLanguages()` (or combined `normalizeAllLanguages()`), plus a **“Normalize languages”** button (e.g. on Analytics or Settings page) to run them and report how many rows were updated. |

Once this is in place, **all** language values—new and existing—will be normalized to English.
