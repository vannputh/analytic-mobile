export const TYPE_OPTIONS = ["Documentary", "Variety", "Reality", "Scripted Live Action", "Animation", "Special", "Audio"] as const;
export const STATUS_OPTIONS = ["Finished", "In Progress", "On Hold", "Dropped", "Plan to Watch"] as const;
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
