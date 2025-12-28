import { MediaEntry } from "./database.types"

export interface FilterState {
  dateFrom: string | null
  dateTo: string | null
  genres: string[]
  mediums: string[]
  languages: string[]
  platforms: string[]
  statuses: string[]
  types: string[]
}

export const defaultFilterState: FilterState = {
  dateFrom: null,
  dateTo: null,
  genres: [],
  mediums: [],
  languages: [],
  platforms: [],
  statuses: [],
  types: [],
}

/**
 * Apply filters to a list of media entries
 * Returns filtered data for immediate metric calculation
 */
export function applyFilters(data: MediaEntry[], filters: FilterState): MediaEntry[] {
  return data.filter((entry) => {
    // Date range filter (finish_date based)
    if (filters.dateFrom) {
      const finishDate = entry.finish_date || entry.start_date
      if (!finishDate || finishDate < filters.dateFrom) return false
    }
    if (filters.dateTo) {
      const finishDate = entry.finish_date || entry.start_date
      if (!finishDate || finishDate > filters.dateTo) return false
    }

    // Medium filter
    if (filters.mediums.length > 0) {
      if (!entry.medium || !filters.mediums.includes(entry.medium)) return false
    }

    // Language filter (AND logic - entry must have ALL selected languages)
    if (filters.languages.length > 0) {
      if (!entry.language) return false
      // Handle array values
      const entryLanguages = Array.isArray(entry.language) 
        ? entry.language.map((l) => l.toLowerCase().trim())
        : []
      for (const filterLanguage of filters.languages) {
        if (!entryLanguages.includes(filterLanguage.toLowerCase().trim())) return false
      }
    }

    // Platform filter
    if (filters.platforms.length > 0) {
      if (!entry.platform || !filters.platforms.includes(entry.platform)) return false
    }

    // Status filter
    if (filters.statuses.length > 0) {
      if (!entry.status || !filters.statuses.includes(entry.status)) return false
    }

    // Type filter
    if (filters.types.length > 0) {
      if (!entry.type || !filters.types.includes(entry.type)) return false
    }

    // Genre filter (AND logic - entry must have ALL selected genres)
    if (filters.genres.length > 0) {
      if (!entry.genre || !Array.isArray(entry.genre)) return false
      const entryGenres = entry.genre.map((g) => g.toLowerCase().trim())
      for (const filterGenre of filters.genres) {
        if (!entryGenres.includes(filterGenre.toLowerCase().trim())) return false
      }
    }

    return true
  })
}

/**
 * Extract unique values from data for filter options
 * Pulls all values from actual database entries
 */
export function extractFilterOptions(data: MediaEntry[]) {
  const genres = new Set<string>()
  const languages = new Set<string>()
  const types = new Set<string>()
  const statuses = new Set<string>()
  const mediums = new Set<string>()
  const platforms = new Set<string>()

  // Extract all values from data
  for (const entry of data) {
    if (entry.type) types.add(entry.type)
    if (entry.status) statuses.add(entry.status)
    if (entry.medium) mediums.add(entry.medium)
    if (entry.platform) platforms.add(entry.platform)
    // Handle language as array (like genre) or string (for backward compatibility)
    if (entry.language) {
      let langArray: string[] = []
      if (Array.isArray(entry.language)) {
        langArray = entry.language
      }
      langArray.forEach((l) => {
        const trimmed = typeof l === 'string' ? l.trim() : String(l).trim()
        if (trimmed) languages.add(trimmed)
      })
    }
    // Handle genre - check for array
    if (entry.genre) {
      let genreArray: string[] = []
      if (Array.isArray(entry.genre)) {
        genreArray = entry.genre
      }
      genreArray.forEach((g) => {
        const trimmed = typeof g === 'string' ? g.trim() : String(g).trim()
        if (trimmed) genres.add(trimmed)
      })
    }
  }

  return {
    genres: Array.from(genres).sort(),
    mediums: Array.from(mediums).sort(),
    languages: Array.from(languages).sort(),
    platforms: Array.from(platforms).sort(),
    statuses: Array.from(statuses).sort(),
    types: Array.from(types).sort(),
  }
}


/**
 * Deep comparison of two FilterState objects
 */
export function areFiltersEqual(a: FilterState, b: FilterState): boolean {
  if (a.dateFrom !== b.dateFrom) return false
  if (a.dateTo !== b.dateTo) return false

  // Helper to compare arrays (order doesn't matter)
  const areArraysEqual = (arr1: string[], arr2: string[]) => {
    if (arr1.length !== arr2.length) return false
    const s1 = [...arr1].sort()
    const s2 = [...arr2].sort()
    return s1.every((val, index) => val === s2[index])
  }

  if (!areArraysEqual(a.genres, b.genres)) return false
  if (!areArraysEqual(a.mediums, b.mediums)) return false
  if (!areArraysEqual(a.languages, b.languages)) return false
  if (!areArraysEqual(a.platforms, b.platforms)) return false
  if (!areArraysEqual(a.statuses, b.statuses)) return false
  if (!areArraysEqual(a.types, b.types)) return false

  return true
}
