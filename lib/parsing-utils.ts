/**
 * Parsing utilities for converting string representations to numeric values.
 * Handles various formats for duration and prices.
 */

/**
 * Parse duration strings into minutes.
 * Handles formats like:
 * - "120 min", "120 mins", "120 minutes"
 * - "2h", "2 hr", "2 hrs", "2 hours"
 * - "1h 30m", "1h30m", "1 hr 30 min"
 * - "2h 30m", "2:30", "02:30:00"
 * - "90" (assumed minutes if no unit)
 */
export function parseDurationToMinutes(duration: string | null | undefined): number | null {
  if (!duration) return null

  const str = duration.trim().toLowerCase()

  // Handle HH:MM:SS or HH:MM format
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10)
    const minutes = parseInt(timeMatch[2], 10)
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0
    return hours * 60 + minutes + Math.round(seconds / 60)
  }

  // Handle "Xh Ym" format (with or without spaces)
  const hoursMinutesMatch = str.match(/(\d+)\s*h(?:ours?|rs?|r)?\s*(?:(\d+)\s*m(?:ins?|inutes?)?)?/)
  if (hoursMinutesMatch) {
    const hours = parseInt(hoursMinutesMatch[1], 10)
    const minutes = hoursMinutesMatch[2] ? parseInt(hoursMinutesMatch[2], 10) : 0
    return hours * 60 + minutes
  }

  // Handle "X minutes" or "X min"
  const minutesMatch = str.match(/(\d+)\s*(?:mins?|minutes?)/)
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10)
  }

  // Handle standalone hours "Xh" or "X hours"
  const hoursOnlyMatch = str.match(/^(\d+)\s*(?:h|hrs?|hours?)$/)
  if (hoursOnlyMatch) {
    return parseInt(hoursOnlyMatch[1], 10) * 60
  }

  // Handle plain number (assume minutes)
  const plainNumber = str.match(/^(\d+(?:\.\d+)?)$/)
  if (plainNumber) {
    return Math.round(parseFloat(plainNumber[1]))
  }

  return null
}

/**
 * Parse price strings to numeric values.
 * Handles formats like:
 * - "$19.99", "€15", "£10.50"
 * - "19.99", "19,99"
 * - "Free", "free", "0"
 */
export function parsePrice(price: string | number | null | undefined): number | null {
  if (price === null || price === undefined) return null
  if (typeof price === "number") return price

  const str = price.trim().toLowerCase()

  if (str === "free" || str === "") return 0

  // Remove currency symbols and whitespace
  const cleaned = str.replace(/[$€£¥₹\s]/g, "").replace(",", ".")

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse rating strings to numeric values.
 * Handles formats like:
 * - "8.5", "8,5"
 * - "8/10", "4/5"
 * - "85%"
 */
export function parseRating(rating: string | number | null | undefined): number | null {
  if (rating === null || rating === undefined) return null
  if (typeof rating === "number") return rating

  const str = rating.trim()

  // Handle "X/Y" format
  const fractionMatch = str.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)/)
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1])
    const denominator = parseFloat(fractionMatch[2])
    // Normalize to 10-point scale
    return (numerator / denominator) * 10
  }

  // Handle percentage
  const percentMatch = str.match(/(\d+(?:\.\d+)?)\s*%/)
  if (percentMatch) {
    return parseFloat(percentMatch[1]) / 10
  }

  // Handle plain number (allow comma as decimal separator)
  const num = parseFloat(str.replace(",", "."))
  return isNaN(num) ? null : num
}

/**
 * Parse date strings to YYYY-MM-DD format.
 * Handles formats like:
 * - "2024-01-15", "01/15/2024", "15/01/2024"
 * - "Jan 15, 2024", "15 Jan 2024"
 */
export function parseDate(date: string | null | undefined): string | null {
  if (!date) return null

  const str = date.trim()

  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  // Try parsing with Date constructor
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0]
  }

  // Handle DD/MM/YYYY or MM/DD/YYYY (assume DD/MM/YYYY for non-US)
  const slashMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slashMatch) {
    const [, a, b, year] = slashMatch
    // Assume DD/MM/YYYY if first number > 12
    const day = parseInt(a, 10) > 12 ? a : b
    const month = parseInt(a, 10) > 12 ? b : a
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  return null
}

/**
 * Convert minutes to human-readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}

/**
 * Format length string to standardized display format.
 * Converts durations to "XXhr XXmin" format.
 */
export function formatLength(length: string | null | undefined): string | null {
  if (!length) return null

  const str = length.trim()

  // Parse as duration and format
  const minutes = parseDurationToMinutes(length)
  if (minutes === null) {
    return str // If we can't parse it, return original
  }

  // Format as "XXhr XXmin"
  if (minutes < 60) {
    return `${minutes}min`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) {
    return `${hours}hr`
  }

  return `${hours}hr ${mins}min`
}

/**
 * Format number with locale-specific separators
 */
export function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

