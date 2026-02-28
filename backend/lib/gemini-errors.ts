/**
 * Normalize Google Generative AI (Gemini) errors into clean, user-facing messages.
 * Raw API errors include quota details, RetryInfo, and URLs — we surface a short message instead.
 */

export interface NormalizedGeminiError {
  message: string
  retryAfterSeconds?: number
  statusCode?: number
}

/**
 * Extract a user-friendly message and optional retry delay from a Gemini/Google AI error.
 */
export function normalizeGeminiError(error: unknown): NormalizedGeminiError {
  const raw = error instanceof Error ? error.message : String(error)

  // 429 / quota exceeded
  if (
    raw.includes("429") ||
    raw.includes("Too Many Requests") ||
    raw.includes("quota") ||
    raw.includes("Quota exceeded") ||
    raw.includes("free_tier")
  ) {
    const retryMatch = raw.match(/retry in ([\d.]+)s/i) || raw.match(/RetryInfo.*retryDelay["\s:]+(\d+)/i)
    const retryAfterSeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : undefined
    return {
      message: "AI rate limit reached. Please try again in a minute or check your Gemini API quota and billing.",
      retryAfterSeconds,
      statusCode: 429,
    }
  }

  // Auth / API key
  if (
    raw.includes("401") ||
    raw.includes("403") ||
    raw.includes("API key") ||
    raw.includes("invalid api key") ||
    raw.includes("permission denied")
  ) {
    return {
      message: "Invalid or missing Gemini API key. Check your configuration.",
      statusCode: raw.includes("401") ? 401 : 403,
    }
  }

  // Server / availability
  if (raw.includes("500") || raw.includes("503") || raw.includes("unavailable") || raw.includes("overloaded")) {
    return {
      message: "The AI service is temporarily unavailable. Please try again later.",
      statusCode: raw.includes("503") ? 503 : 500,
    }
  }

  // Blocked / safety
  if (raw.includes("blocked") || raw.includes("safety") || raw.includes("content")) {
    return {
      message: "The request was blocked by the AI service. Try rephrasing your question.",
    }
  }

  // Generic
  return {
    message: "Something went wrong with the AI service. Please try again.",
  }
}

/**
 * Get a short user-facing error string. Use this in API responses and UI.
 */
export function getGeminiErrorMessage(error: unknown): string {
  return normalizeGeminiError(error).message
}
