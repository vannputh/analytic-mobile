import { CreateEntryInput } from './actions'
import { differenceInDays } from 'date-fns/differenceInDays'
import { parseISO } from 'date-fns/parseISO'
import { isValid } from 'date-fns/isValid'

// Column mapping for common variations
const COLUMN_MAPPINGS: Record<string, string[]> = {
  title: ['title', 'name', 'movie', 'book', 'show'],
  medium: ['medium', 'type', 'media_type', 'category'],
  type: ['type', 'genre', 'genres', 'category'],
  season: ['season', 'seasons', 'season_number'],
  episodes: ['episodes', 'episode', 'ep', 'episode_count'],
  length: ['length', 'duration', 'runtime', 'pages', 'time'],
  price: ['price', 'cost', 'amount', 'spent'],
  language: ['language', 'lang', 'languages'],
  platform: ['platform', 'service', 'streaming', 'where'],
  status: ['status', 'state', 'progress'],
  average_rating: ['average_rating', 'imdb_rating', 'rating', 'score', 'imdb'],
  my_rating: ['my_rating', 'personal_rating', 'my_score', 'user_rating'],
  start_date: ['start_date', 'started', 'start', 'date_started'],
  finish_date: ['finish_date', 'finished', 'end_date', 'date_finished', 'completed'],
  time_taken: ['time_taken', 'duration_taken', 'time_spent'],
  poster_url: ['poster_url', 'poster', 'image', 'cover'],
  imdb_id: ['imdb_id', 'imdb', 'id'],
}

export interface ParseResult {
  data: Partial<CreateEntryInput>[]
  errors: string[]
  headerMappings: Record<string, string>
}

export async function parseCSVText(text: string): Promise<ParseResult> {
  // Lazy load PapaParse only when needed
  const Papa = (await import('papaparse')).default
  
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
  })

  const errors: string[] = []
  const headerMappings: Record<string, string> = {}

  // Auto-map headers
  const headers = result.meta.fields || []
  headers.forEach((header) => {
    const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_')

    for (const [dbColumn, variations] of Object.entries(COLUMN_MAPPINGS)) {
      if (variations.some(v => normalizedHeader.includes(v) || v.includes(normalizedHeader))) {
        headerMappings[header] = dbColumn
        break
      }
    }
  })

  // Transform and sanitize data
  const data = result.data.map((row: any, index: number) => {
    try {
      return sanitizeEntry(row, headerMappings)
    } catch (error) {
      errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }).filter(Boolean) as Partial<CreateEntryInput>[]

  return {
    data,
    errors,
    headerMappings,
  }
}

export function sanitizeEntry(
  raw: Record<string, any>,
  mappings?: Record<string, string>
): Partial<CreateEntryInput> {
  const entry: Partial<CreateEntryInput> = {}

  // Helper to get value using mappings
  const getValue = (key: string): any => {
    if (mappings && mappings[key]) {
      return raw[key]
    }
    // Try direct key
    if (raw[key] !== undefined) return raw[key]

    // Try mapped key
    const dbKey = Object.entries(mappings || {}).find(([_, v]) => v === key)?.[0]
    if (dbKey && raw[dbKey] !== undefined) return raw[dbKey]

    return undefined
  }

  // Title (required)
  const title = getValue('title')
  if (!title || title.toString().trim() === '') {
    throw new Error('Title is required')
  }
  entry.title = title.toString().trim()

  // Medium
  const medium = getValue('medium')
  if (medium) {
    entry.medium = sanitizeMedium(medium.toString()) as any
  }

  // Type/Genre
  const type = getValue('type')
  if (type) {
    entry.type = type.toString().trim()
  }

  // Season
  const season = getValue('season')
  if (season) {
    entry.season = season.toString().trim()
  }

  // Episodes
  const episodes = getValue('episodes')
  if (episodes) {
    const num = parseInt(episodes.toString().replace(/\D/g, ''))
    if (!isNaN(num)) entry.episodes = num
  }

  // Length
  const length = getValue('length')
  if (length) {
    entry.length = sanitizeLength(length.toString())
  }

  // Price
  const price = getValue('price')
  if (price) {
    const num = parseFloat(price.toString().replace(/[$,]/g, ''))
    if (!isNaN(num)) entry.price = num
  }

  // Language (handle as array like genre)
  const language = getValue('language')
  if (language) {
    const langStr = language.toString().trim()
    if (langStr) {
      entry.language = langStr.split(",").map((l: string) => l.trim()).filter(Boolean)
    }
  }

  // Platform
  const platform = getValue('platform')
  if (platform) {
    entry.platform = platform.toString().trim() as any
  }

  // Status
  const status = getValue('status')
  if (status) {
    entry.status = sanitizeStatus(status.toString()) as any
  }

  // Average Rating
  const avgRating = getValue('average_rating')
  if (avgRating) {
    const num = parseFloat(avgRating.toString().replace(/[^\d.]/g, ''))
    if (!isNaN(num)) entry.average_rating = Math.min(10, num)
  }

  // My Rating
  const myRating = getValue('my_rating')
  if (myRating) {
    const num = parseFloat(myRating.toString().replace(/[^\d.]/g, ''))
    if (!isNaN(num)) entry.my_rating = Math.min(10, num)
  }

  // Start Date
  const startDate = getValue('start_date')
  if (startDate) {
    const date = sanitizeDate(startDate.toString())
    if (date) entry.start_date = date
  }

  // Finish Date
  const finishDate = getValue('finish_date')
  if (finishDate) {
    const date = sanitizeDate(finishDate.toString())
    if (date) entry.finish_date = date
  }

  // Time Taken - auto-calculate if both dates are present and time_taken is not provided
  const timeTaken = getValue('time_taken')
  if (timeTaken && timeTaken.toString().trim() !== '') {
    entry.time_taken = timeTaken.toString().trim()
  } else if (entry.start_date && entry.finish_date) {
    // Auto-calculate time_taken from dates
    try {
      const start = parseISO(entry.start_date)
      const finish = parseISO(entry.finish_date)
      if (isValid(start) && isValid(finish)) {
        const days = differenceInDays(finish, start)
        if (days >= 0) {
          // Add 1 to make it inclusive (same day = 1 day)
          const totalDays = days + 1
          entry.time_taken = totalDays === 1 ? "1 day" : `${totalDays} days`
        }
      }
    } catch (error) {
      // Invalid date format, leave time_taken as null
    }
  }

  // Poster URL
  const posterUrl = getValue('poster_url')
  if (posterUrl) {
    entry.poster_url = posterUrl.toString().trim()
  }

  // IMDB ID
  const imdbId = getValue('imdb_id')
  if (imdbId) {
    entry.imdb_id = imdbId.toString().trim()
  }

  return entry
}

function sanitizeMedium(value: string): string {
  const normalized = value.toLowerCase().trim()

  if (normalized.includes('movie') || normalized.includes('film')) return 'Movie'
  if (normalized.includes('tv') || normalized.includes('show') || normalized.includes('series')) return 'TV Show'
  if (normalized.includes('book')) return 'Book'
  if (normalized.includes('live theatre') || normalized.includes('live theater') || normalized.includes('live play')) return 'Live Theatre'
  if (normalized.includes('theatre') || normalized.includes('theater') || normalized.includes('play')) return 'Theatre'
  if (normalized.includes('podcast') || normalized.includes('audio')) return 'Podcast'

  return value.trim()
}

function sanitizeStatus(value: string): string {
  const normalized = value.toLowerCase().trim()

  if (normalized.includes('progress') || normalized === 'watching' || normalized === 'reading') return 'Watching'
  if (normalized.includes('finish') || normalized === 'complete' || normalized === 'done') return 'Finished'
  if (normalized.includes('hold') || normalized === 'paused') return 'On Hold'
  if (normalized.includes('drop') || normalized === 'abandoned') return 'Dropped'
  if (normalized.includes('plan') || normalized.includes('watch') && normalized.includes('plan')) return 'Plan to Watch'

  return value.trim()
}

function sanitizeLength(value: string): string {
  const trimmed = value.trim()

  // If it already has units, return as is
  if (/\d+\s*(min|mins|minutes|hrs?|hours|pages?|pp?)\b/i.test(trimmed)) {
    return trimmed
  }

  // Try to add appropriate units
  const num = parseInt(trimmed.replace(/\D/g, ''))
  if (!isNaN(num)) {
    // If > 500, likely pages
    if (num > 500) return `${num} pages`
    // Otherwise likely minutes
    return `${num} min`
  }

  return trimmed
}

function sanitizeDate(value: string): string | null {
  if (!value || value.trim() === '') return null

  try {
    // Try to parse various date formats
    let date: Date | null = null

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date = new Date(value)
    }
    // US format: MM/DD/YYYY or M/D/YYYY
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      const [month, day, year] = value.split('/')
      date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }
    // Reverse: YYYY/MM/DD
    else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(value)) {
      const parts = value.split('/')
      date = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`)
    }
    // Try native parsing as fallback
    else {
      date = new Date(value)
    }

    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch (error) {
    console.error('Date parsing error:', error)
  }

  return null
}

export function validateEntry(entry: Partial<CreateEntryInput>): string[] {
  const errors: string[] = []

  if (!entry.title || entry.title.trim() === '') {
    errors.push('Title is required')
  }

  if (entry.my_rating && (entry.my_rating < 0 || entry.my_rating > 10)) {
    errors.push('My rating must be between 0 and 10')
  }

  if (entry.average_rating && (entry.average_rating < 0 || entry.average_rating > 10)) {
    errors.push('Average rating must be between 0 and 10')
  }

  if (entry.episodes && entry.episodes < 0) {
    errors.push('Episodes cannot be negative')
  }

  if (entry.price && entry.price < 0) {
    errors.push('Price cannot be negative')
  }

  return errors
}

