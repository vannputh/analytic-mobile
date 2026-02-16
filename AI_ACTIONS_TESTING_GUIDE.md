# AI Actions Implementation - Testing Guide

## Overview
The AI query system now supports both **query mode** (data visualization) and **action mode** (creating, updating, and deleting media entries with confirmation).

## What Changed

### 1. Model Fix
- Updated Gemini model from `gemini-2.0-flash` to `gemini-3-flash-preview` in:
  - `/app/api/ai-query/route.ts`
  - `/lib/services/ai-classifier.ts`

### 2. New Components
- **AIActionConfirmationDialog** (`/components/ai-action-confirmation-dialog.tsx`)
  - Editable confirmation screen for proposed actions
  - Shows validation errors/warnings
  - Allows selecting/deselecting individual actions
  - Color-coded badges for action types (create=green, update=blue, delete=red)

- **Checkbox UI Component** (`/components/ui/checkbox.tsx`)
  - Added missing Radix UI checkbox component
  - Installed `@radix-ui/react-checkbox` package

### 3. New API Routes
- **Execute Actions API** (`/app/api/execute-actions/route.ts`)
  - Executes confirmed actions in batch
  - Returns detailed results for each action
  - Calls existing server actions (createEntry, updateEntry, deleteEntry)

### 4. New Utilities
- **Action Parser** (`/lib/ai-action-parser.ts`)
  - Validates action structure
  - Fuzzy matches film titles for updates/deletes
  - Checks field values (status, rating, dates, etc.)
  - Returns validation errors and warnings

### 5. Enhanced Prompt System
- **Updated schemas** (`/lib/ai-query-schemas.ts`)
  - Added `buildActionPrompt()` - generates prompts for action detection
  - Added `shouldUseActionMode()` - detects action keywords in queries
  - Action keywords: add, create, new, update, change, modify, mark, set, delete, remove

### 6. Updated AI Query API
- **Enhanced route** (`/app/api/ai-query/route.ts`)
  - Detects query vs action intent
  - Returns different response types
  - Supports both modes seamlessly

### 7. Updated AI Query Dialog
- **Enhanced dialog** (`/components/ai-query-dialog.tsx`)
  - Handles both query and action responses
  - Shows confirmation dialog for actions
  - Executes actions and displays results

## How to Test

### Test Case 1: Adding Films to Planned
**Query:** "Add these films to planned: Dune Part 3, The Batman 2, Avatar 3"

**Expected Flow:**
1. AI detects action mode
2. Returns 3 create actions
3. Confirmation dialog shows with all 3 films
4. Each has status "Planned" and medium "Movie"
5. User can deselect any film
6. On confirm, films are added to database
7. Success toast shows "Successfully executed 3 actions"

### Test Case 2: Updating Status
**Query:** "Mark Inception as finished with 9/10 rating"

**Expected Flow:**
1. AI detects action mode
2. Searches for "Inception" in your database
3. If found, shows matched entry with current status
4. Shows update: status → "Finished", my_rating → 9
5. On confirm, entry is updated
6. Success toast shows

### Test Case 3: Mixed Operations
**Query:** "Add Tenet to planned, mark Interstellar as finished"

**Expected Flow:**
1. AI returns 2 actions (1 create, 1 update)
2. Confirmation shows both with different badges
3. User can execute both or just one
4. Success feedback for each action

### Test Case 4: Update with Fuzzy Match
**Query:** "Update The Dark Knight rating to 9"

**Expected Flow:**
1. Searches for "The Dark Knight" 
2. Shows matched entry (even if title is slightly different)
3. Shows current rating → new rating
4. On confirm, updates the entry

### Test Case 5: Delete Entry
**Query:** "Delete The Room from my list"

**Expected Flow:**
1. AI returns delete action
2. Searches and matches "The Room"
3. Shows matched entry with DELETE badge (red)
4. Confirmation warns about deletion
5. On confirm, entry is deleted

### Test Case 6: Validation Errors
**Query:** "Add Avatar 3 with status Completed"

**Expected Flow:**
1. Returns create action with invalid status
2. Confirmation shows validation error
3. Error message: "Invalid status: Completed. Must be one of: Finished, Watching, ..."
4. Action checkbox is disabled
5. Cannot execute invalid actions

### Test Case 7: Warnings
**Query:** "Add Inception to planned"

**Expected Flow:**
1. Searches for existing "Inception" entry
2. If found, shows warning: "An entry with similar title already exists: Inception"
3. User can still proceed if they want

### Test Case 8: Regular Queries Still Work
**Query:** "How many movies did I watch in 2025?"

**Expected Flow:**
1. AI detects query mode (no action keywords)
2. Generates SQL query
3. Shows results with visualization
4. Works exactly as before

### Test Case 9: Multiple Updates
**Query:** "Set my ratings: Inception 9/10, Interstellar 10/10, The Dark Knight 9/10"

**Expected Flow:**
1. Returns 3 update actions
2. Matches all 3 films
3. Shows current → new ratings for each
4. User can select which to update
5. Executes selected updates

### Test Case 10: Platform and Genre
**Query:** "Add Cyberpunk 2077 as a game on Steam, status planned, genre RPG and Action"

**Expected Flow:**
1. Returns create action with:
   - title: "Cyberpunk 2077"
   - medium: "Game"
   - platform: "Steam"
   - status: "Planned"
   - genre: ["RPG", "Action"]
2. All fields shown in confirmation
3. On confirm, creates entry with all data

## Key Features to Verify

### Editable Confirmation
- [ ] Can select/deselect individual actions
- [ ] "Select All" button works
- [ ] "Deselect All" button works
- [ ] Can't select invalid actions (validation errors)
- [ ] Loading state during execution

### Validation
- [ ] Invalid status values are caught
- [ ] Invalid medium values are caught
- [ ] Rating outside 0-10 range is caught
- [ ] Invalid date formats are caught
- [ ] Missing required fields are caught

### Fuzzy Matching
- [ ] Finds exact title matches
- [ ] Finds partial title matches
- [ ] Returns null if no good match
- [ ] Shows matched entry in confirmation

### Action Badges
- [ ] CREATE actions have green badge with + icon
- [ ] UPDATE actions have blue badge with edit icon
- [ ] DELETE actions have red badge with trash icon

### Error Handling
- [ ] Shows validation errors in red with X icon
- [ ] Shows warnings in yellow with ⚠ icon
- [ ] Failed actions show error toast
- [ ] Partial success (some succeed, some fail) shows both toasts

### UI/UX
- [ ] Confirmation dialog is scrollable for many actions
- [ ] Action count shown (e.g., "3 of 5 actions selected")
- [ ] Matched entries show current values
- [ ] Loading spinner during execution
- [ ] Dialog auto-closes on success
- [ ] Can cancel and go back

## Common Issues & Solutions

### Issue: "Could not find entry"
**Solution:** The title doesn't match any existing entry. Check spelling or add as new entry.

### Issue: Model rate limit
**Solution:** Should now be fixed with correct model name `gemini-3-flash-preview`. Check GEMINI_API_KEY is valid.

### Issue: Action not detected
**Solution:** Query needs action keywords (add, update, delete, mark, set). Try: "Add Film X" instead of "Film X".

### Issue: Checkbox component error
**Solution:** Already installed `@radix-ui/react-checkbox`. If error persists, restart dev server.

## Testing Checklist

Core Functionality:
- [ ] Create single entry
- [ ] Create multiple entries
- [ ] Update single entry
- [ ] Update multiple entries
- [ ] Delete entry
- [ ] Mixed create + update
- [ ] Regular queries still work

Validation:
- [ ] Invalid status caught
- [ ] Invalid rating caught
- [ ] Invalid date caught
- [ ] Duplicate warning shown

UI/UX:
- [ ] Confirmation dialog appears
- [ ] Can edit selection
- [ ] Loading states work
- [ ] Success/error toasts appear
- [ ] Dialog closes after success

Edge Cases:
- [ ] No actions selected (shows error)
- [ ] All actions invalid (can't confirm)
- [ ] Partial validation (some valid, some invalid)
- [ ] Entry not found for update/delete
- [ ] Duplicate entry warning

## Implementation Complete ✅

All todos completed:
1. ✅ Updated Gemini model name
2. ✅ Added action mode types
3. ✅ Enhanced system prompt
4. ✅ Built action parser
5. ✅ Created execution API
6. ✅ Built confirmation dialog
7. ✅ Integrated with AI query dialog
8. ✅ Created testing guide

The system is ready for testing!
