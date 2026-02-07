export const TYPE_OPTIONS = ["Documentary", "Variety", "Reality", "Scripted Live Action", "Animation", "Special", "Audio"] as const;
export const STATUS_OPTIONS = ["Finished", "Watching", "Currently Watching", "On Hold", "Dropped", "Plan to Watch", "Planned"] as const;
export const PLATFORM_OPTIONS = ["Netflix", "Hulu", "Disney+", "Amazon Prime", "HBO Max", "Apple TV+", "YouTube", "Spotify", "Audible", "Steam", "PlayStation", "Xbox", "Nintendo", "Other"] as const;
export const MEDIUM_OPTIONS = ["Movie", "TV Show", "Book", "Game", "Podcast", "Live Theatre"] as const;

/**
 * Get placeholder emoji for media type
 */
export function getPlaceholderPoster(type: string | null): string {
  if (!type) return "📀";

  const normalized = type.toLowerCase();
  if (normalized.includes("movie") || normalized.includes("film")) {
    return "🎬";
  }
  if (normalized.includes("tv") || normalized.includes("show") || normalized.includes("series")) {
    return "📺";
  }
  if (normalized.includes("book")) {
    return "📚";
  }
  if (normalized.includes("game")) {
    return "🎮";
  }
  if (normalized.includes("podcast")) {
    return "🎙️";
  }
  if (normalized.includes("theatre") || normalized.includes("theater")) {
    return "🎭";
  }
  return "📀";
}

/**
 * Format date string to readable format
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "N/A";

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "N/A";

    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

/**
 * Calculate time taken between two dates
 * Returns a string like "1 day" or "5 days", or null if calculation isn't possible
 */
export function calculateTimeTaken(startDate: string | null | undefined, finishDate: string | null | undefined): string | null {
  if (!startDate || !finishDate) return null;

  try {
    const start = new Date(startDate);
    const finish = new Date(finishDate);

    if (isNaN(start.getTime()) || isNaN(finish.getTime())) return null;

    const diffTime = finish.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;

    // Add 1 to make it inclusive (same day = 1 day)
    const totalDays = diffDays + 1;
    return totalDays === 1 ? "1 day" : `${totalDays} days`;
  } catch {
    return null;
  }
}

/**
 * Get time taken - either from stored value or computed from dates
 */
export function getTimeTaken(timeTaken: string | null | undefined, startDate: string | null | undefined, finishDate: string | null | undefined): string | null {
  // Return stored value if it exists
  if (timeTaken) return timeTaken;

  // Otherwise calculate from dates
  return calculateTimeTaken(startDate, finishDate);
}
