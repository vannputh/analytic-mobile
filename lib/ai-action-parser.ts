'use server'

import { createClient } from '@/lib/supabase/server'
import { MediaEntry } from '@/lib/database.types'
import { STATUS_OPTIONS, MEDIUM_OPTIONS, PLATFORM_OPTIONS } from '@/lib/types'

export interface MediaAction {
  type: "create" | "update" | "delete"
  id?: string
  data?: Partial<{
    title: string
    medium: string
    type: string
    status: string
    genre: string[]
    platform: string
    my_rating: number
    start_date: string
    finish_date: string
    language: string[]
    episodes: number
    episodes_watched: number
    price: number
    // TMDB metadata fields
    poster_url: string
    imdb_id: string
    average_rating: number
    year: string
    plot: string
    season: string
    length: string
  }>
}

export interface ValidatedAction {
  action: MediaAction
  matchedEntry?: MediaEntry | null
  validation: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }
}

/**
 * Enrich create action with TMDB metadata
 * Fetches metadata from TMDB API and merges with AI-provided data
 */
async function enrichCreateActionWithTMDB(action: MediaAction): Promise<MediaAction> {
  if (action.type !== "create" || !action.data?.title) {
    return action
  }

  try {
    // Build metadata fetch URL
    const params = new URLSearchParams({
      source: "tmdb",
      title: action.data.title,
    })
    
    if (action.data.medium) {
      params.append("type", action.data.medium === "Movie" ? "movie" : "tv")
    }

    // Fetch metadata from API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/metadata?${params}`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      console.log(`TMDB fetch failed for "${action.data.title}": ${response.status}`)
      return action
    }

    const metadata = await response.json()
    
    // Merge TMDB data with AI-provided data (AI data takes precedence)
    return {
      ...action,
      data: {
        ...metadata, // TMDB data first (defaults)
        ...action.data, // AI data overrides
      }
    }
  } catch (error) {
    console.error("Failed to fetch TMDB metadata:", error)
    return action // Return original action on error
  }
}

/**
 * Fuzzy match a title against existing entries
 * Returns the best match or null if no good match found
 */
async function findMatchingEntry(title: string): Promise<MediaEntry | null> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return null
  }

  // Try exact match first (case insensitive)
  const { data: exactMatch } = await supabase
    .from('media_entries')
    .select('*')
    .eq('user_id', user.id)
    .ilike('title', title)
    .limit(1)
    .single()

  if (exactMatch) {
    return exactMatch as MediaEntry
  }

  // Try fuzzy match using ILIKE with wildcards
  const { data: fuzzyMatches } = await supabase
    .from('media_entries')
    .select('*')
    .eq('user_id', user.id)
    .ilike('title', `%${title}%`)
    .limit(5)

  if (fuzzyMatches && fuzzyMatches.length > 0) {
    // Return the first match as best guess
    // In a more sophisticated implementation, we could use Levenshtein distance
    return fuzzyMatches[0] as MediaEntry
  }

  return null
}

/**
 * Validate a single action
 */
async function validateAction(action: MediaAction): Promise<ValidatedAction> {
  const errors: string[] = []
  const warnings: string[] = []
  let matchedEntry: MediaEntry | null = null

  // Validate action type
  if (!['create', 'update', 'delete'].includes(action.type)) {
    errors.push(`Invalid action type: ${action.type}`)
  }

  // Validate data exists
  if (!action.data) {
    errors.push('Action data is missing')
    return {
      action,
      validation: { valid: false, errors, warnings }
    }
  }

  // Title is required for all actions
  if (!action.data.title) {
    errors.push('Title is required')
    return {
      action,
      validation: { valid: false, errors, warnings }
    }
  }

  // For update and delete, try to find matching entry
  if (action.type === 'update' || action.type === 'delete') {
    matchedEntry = await findMatchingEntry(action.data.title)
    
    if (!matchedEntry) {
      errors.push(`Could not find entry with title: ${action.data.title}`)
    } else {
      // Add the ID to the action for execution
      action.id = matchedEntry.id
    }
  }

  // For create, check if entry already exists
  if (action.type === 'create') {
    const existing = await findMatchingEntry(action.data.title)
    if (existing) {
      warnings.push(`An entry with similar title already exists: ${existing.title}`)
    }
  }

  // Validate field values
  if (action.data.status) {
    const validStatuses = STATUS_OPTIONS as readonly string[]
    if (!validStatuses.includes(action.data.status)) {
      errors.push(`Invalid status: ${action.data.status}. Must be one of: ${validStatuses.join(', ')}`)
    }
  }

  if (action.data.medium) {
    const validMediums = MEDIUM_OPTIONS as readonly string[]
    if (!validMediums.includes(action.data.medium)) {
      errors.push(`Invalid medium: ${action.data.medium}. Must be one of: ${validMediums.join(', ')}`)
    }
  }

  if (action.data.platform) {
    const validPlatforms = PLATFORM_OPTIONS as readonly string[]
    if (!validPlatforms.includes(action.data.platform)) {
      warnings.push(`Platform '${action.data.platform}' is not in the standard list. It will be saved as 'Other'.`)
      action.data.platform = 'Other'
    }
  }

  if (action.data.my_rating !== undefined) {
    if (typeof action.data.my_rating !== 'number' || action.data.my_rating < 0 || action.data.my_rating > 10) {
      errors.push(`Rating must be a number between 0 and 10, got: ${action.data.my_rating}`)
    }
  }

  if (action.data.start_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(action.data.start_date)) {
      errors.push(`Invalid start_date format: ${action.data.start_date}. Use YYYY-MM-DD`)
    }
  }

  if (action.data.finish_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(action.data.finish_date)) {
      errors.push(`Invalid finish_date format: ${action.data.finish_date}. Use YYYY-MM-DD`)
    }
  }

  if (action.data.episodes !== undefined && typeof action.data.episodes !== 'number') {
    errors.push(`Episodes must be a number, got: ${action.data.episodes}`)
  }

  if (action.data.episodes_watched !== undefined && typeof action.data.episodes_watched !== 'number') {
    errors.push(`Episodes watched must be a number, got: ${action.data.episodes_watched}`)
  }

  if (action.data.price !== undefined && typeof action.data.price !== 'number') {
    errors.push(`Price must be a number, got: ${action.data.price}`)
  }

  return {
    action,
    matchedEntry,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}

/**
 * Validate a list of actions
 * Returns validated actions with any errors or warnings
 */
export async function validateActions(actions: MediaAction[]): Promise<ValidatedAction[]> {
  if (!Array.isArray(actions) || actions.length === 0) {
    return []
  }

  // First enrich create actions with TMDB metadata
  const enrichedActions = await Promise.all(
    actions.map(action => enrichCreateActionWithTMDB(action))
  )

  // Then validate the enriched actions
  const validatedActions = await Promise.all(
    enrichedActions.map(action => validateAction(action))
  )

  return validatedActions
}

