# Feature Inventory

This document reflects the current repo state in `/Users/mac/Developer/analytics/analytics-web`.

It separates:
- live user-facing features that are clearly exposed from current routes
- supporting integrations, autocomplete, and autofill behavior
- code-present items that exist in the repo but are not obviously linked from the current app shell

## Route Inventory

| Route | Purpose | Notes |
| --- | --- | --- |
| `/` | Landing page | Public marketing entry point |
| `/login` | Auth and access request flow | Email OTP + magic link |
| `/media` | Main media diary | Primary media workspace |
| `/media/analytics` | Media analytics dashboard | Filterable charts + KPIs |
| `/movies` | Alternate media diary route | Currently mirrors `/media` behavior |
| `/movies/analytics` | Alternate media analytics route | Currently mirrors `/media/analytics` behavior |
| `/food` | Food and drinks diary | Calendar-based workspace |
| `/food/analytics` | Food analytics dashboard | Filterable charts + drill-down |
| `/admin` | Admin dashboard | Admin only |
| `/admin/users` | User management | Admin only |
| `/admin/requests` | Access request approvals | Admin only |

## Authentication And Access Control

- Supabase email login with both magic link and OTP code entry.
- Signup/request-access flow that creates a pending user profile after OTP verification.
- Approval workflow with `pending`, `approved`, and `rejected` account states.
- Proxy-based route protection for all non-public pages.
- Admin-only protection for `/admin` routes.
- Login redirect handling for protected pages.
- Profile menu with logout, theme toggle, and admin panel shortcut.

## Media Workspace

### Diary And Entry Management

- Add, edit, and delete media entries from modal dialogs.
- Entry fields include title, medium, type, season, episode counts, length, price, platform, language, genre, IMDb ID, ratings, dates, and poster.
- Diary sections for:
  - Currently Watching
  - Watched
  - Planned / Plan to Watch
  - On Hold and Dropped
- Full-text diary search across title and key metadata fields.
- Multi-filter bar for status, type, medium, platform, language, genre, and date ranges.
- URL-backed filter persistence for shareable filtered states.
- Sortable diary table plus a mobile card layout.
- Column visibility picker with saved per-user preferences.
- Multi-select mode for batch operations.
- Batch edit across selected entries.
- Batch metadata fetch across selected entries.
- Restart action for dropped or on-hold items, sending them back to `Watching`.

### Watching And Progress Tracking

- Dedicated "Currently Watching" strip with progress cards.
- Increment/decrement watched episode counts directly from the card.
- Last watched date picker on in-progress entries.
- Automatic completion behavior when watched episodes reach total episodes.
- Progress bars, completion states, and recency labels.

### Entry Details And History

- Rich details dialog for viewing and editing a media entry.
- Episode watch history with add, edit, and delete controls.
- Status history timeline.
- Automatic time-taken calculation from start and finish dates.
- Auto-set `Finished` when a finish date is provided.
- Auto-sync watched episodes to total episodes when an item is marked finished.

### Discovery Helpers

- Random planned-entry picker via the "Watch this" flow.
- TMDB-powered synopsis fetch inside the random picker dialog.

## Media Metadata, Search, And Upload Features

- TMDB title autocomplete in media add/edit flows.
- OMDB fallback when TMDB search returns no results.
- Search results show poster, year, and whether the result is a movie or TV show.
- Metadata fetch by title or IMDb ID.
- Source-aware metadata fetch from TMDB or OMDB.
- TMDB lookup by IMDb ID.
- Metadata merge flow with per-field override toggles for:
  - title
  - poster
  - genre
  - language
  - average rating
  - runtime / length
  - episodes
  - IMDb ID
- Poster upload to Supabase Storage with file type and size validation.
- Language normalization before saving fetched metadata.

## Media Analytics

- KPI cards for:
  - total spent
  - hours watched
  - days of life spent
  - items finished
  - average rating
  - top genre
  - top language
  - unique genres
  - unique languages
  - platform count
- Filter-aware analytics calculations.
- Charts for:
  - spending by month
  - watch time by month
  - completed items by month
  - genre breakdown
  - language breakdown
  - platform breakdown
  - status breakdown

## Food And Drinks Workspace

### Calendar And Entry Management

- Month calendar diary with day-level entry counts and quick add.
- Click a day to view all entries for that date.
- Add food entries for any selected date.
- View, edit, duplicate, and delete food entries.
- "Log again" style duplication using an existing entry as a template for a new visit.

### Place Capture And Autofill

- Local-first restaurant/place autocomplete from previously saved entries.
- Google Maps autocomplete fallback when local suggestions are insufficient.
- Keyboard-navigable autocomplete dropdown.
- Google Maps detail autofill from either:
  - a selected Google place suggestion
  - a Google Maps URL
  - a Google Place ID
- Google Maps short-link expansion before place lookup.
- Address parsing into neighborhood, city, and country.
- Suggested category inference from Google place types.
- Suggested cuisine inference from Google place types.
- Google Places photo ingestion into the entry form.
- Website, price level, and canonical Google Maps URL autofill.

### Food Entry Content

- Category, branch, cuisine types, tags, dining type, and return-intent capture.
- Itemized order list with:
  - per-item name
  - price
  - one or more categories
  - favorite item
  - duplicate item action
  - per-item photo
- Ratings for overall experience, food, ambiance, service, and value.
- Total price tracking with USD to KHR dual-currency display helpers.
- Instagram handle, website, notes, and location details.

### Food Image Handling

- Place photo uploads from file picker.
- Place photo capture from device camera.
- HEIC/HEIF to JPEG conversion before upload.
- Client-side image crop flow for place photos.
- Item photo uploads with the same HEIC conversion support.
- Client-side image crop flow for item photos.
- Primary image selection for place photos.
- Google Places remote photos can be saved alongside local uploads.

### Food Details

- Large gallery-style details view with image carousel.
- Overview, details, and notes tabs.
- Address copy and Google Maps link copy actions.
- Visual badges for category, dining type, cuisine, and tags.

## Food Analytics

- KPI cards for:
  - total visits
  - total spent
  - average rating
  - top city
  - top food type
  - would-return rate
- Filter bar for date range, category, cuisine, item category, price level, dining type, city, rating floor, and would-return flag.
- Charts for:
  - visits by month
  - spending by month
  - spending by cuisine
  - spending by food type
  - visits by city
  - visits by neighborhood
  - dining type
  - would return
  - ratings distribution
  - ratings by category
  - top places
  - top cuisines
  - food type breakdown
  - place category breakdown
- Drill-down mode that opens the entries behind a selected chart segment.
- Drill-down results grouped by place with expandable visit history.

## AI Features

### Query Mode

- Natural-language analytics questions for both media and food workspaces.
- Gemini-generated SQL with read-only validation.
- Automatic visualization selection based on result shape.
- Result rendering as KPI, table, pie, bar, or area output.

### Action Mode

- Natural-language action parsing for create, update, and delete operations.
- Validation layer before execution.
- Confirmation dialog that lets the user review actions before running them.
- Ability to edit a parsed media action in the media dialog before confirming.
- TMDB enrichment of some create actions before execution.

### Important Current Limitation

- The current action execution route is wired to media CRUD operations. Query mode supports both workspaces, but food action execution does not have a dedicated executor in this repo snapshot.

## Admin Features

- Admin dashboard shell.
- Pending access request review page.
- Approve or reject user requests.
- User management table with tabs for all, approved, pending, and rejected users.

## Storage And API Integrations

- Supabase Auth for session management.
- Supabase Postgres for media, food, status history, and user profile data.
- Supabase Storage for uploaded images.
- TMDB integration for search, detail fetch, posters, and synopsis.
- OMDB integration as metadata/search fallback.
- Google Places integration for place search and place details.
- Gemini integration for natural-language query generation and CSV cleaning helpers.

## Code-Present But Not Clearly Routed From Current Navigation

- Import UI components exist for pasted/file CSV import, preview tables, and batch import actions.
- An AI-powered CSV cleaning route exists at `/api/clean-data`.
- Batch upload and CSV parsing utilities exist in the repo.
- There is no current `app/import` route in this repo snapshot, so import appears to be partially present in code but not exposed from the current route tree.

## Current Scope Notes

- `Book` still appears in shared media constants, but the main `getEntries()` query explicitly excludes books and there is no `/books` route in this repo snapshot.
- `/movies` and `/movies/analytics` currently duplicate the same behavior as the `/media` routes rather than exposing a separate movie-only implementation.
