import type { MediaEntry } from "@/src/shared/types/database"

export type SortKey = "title" | "rating" | "finish_date"

export function matchesSearch(entry: MediaEntry, query: string): boolean {
  if (!query) return true
  const lower = query.toLowerCase()
  if (entry.title.toLowerCase().includes(lower)) return true
  if (entry.medium?.toLowerCase().includes(lower)) return true
  if (entry.status?.toLowerCase().includes(lower)) return true
  if (entry.type?.toLowerCase().includes(lower)) return true
  if (entry.platform?.toLowerCase().includes(lower)) return true
  if (entry.genre?.some((item) => item.toLowerCase().includes(lower))) return true
  return false
}

export function statusBucket(status: string | null): "watching" | "watched" | "planned" | "paused" {
  if (status === "Watching") return "watching"
  if (status === "Finished") return "watched"
  if (status === "Plan to Watch" || status === "Planned") return "planned"
  return "paused"
}

export function sortEntries(entries: MediaEntry[], sortKey: SortKey, descending: boolean): MediaEntry[] {
  const sorted = [...entries].sort((left, right) => {
    if (sortKey === "rating") return (left.my_rating ?? 0) - (right.my_rating ?? 0)
    if (sortKey === "finish_date") {
      const leftDate = left.finish_date ?? left.start_date ?? ""
      const rightDate = right.finish_date ?? right.start_date ?? ""
      return leftDate.localeCompare(rightDate)
    }
    return left.title.localeCompare(right.title)
  })

  return descending ? sorted.reverse() : sorted
}

export function formatShortDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })
}

export function formatRelativeDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (days <= 0) return "today"
  if (days === 1) return "1 day ago"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? "1 month ago" : `${months} months ago`
}

export function toMonthDay(value: string | null): { month: string; day: string } {
  if (!value) return { month: "---", day: "--" }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { month: "---", day: "--" }
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(date.getDate()).padStart(2, "0")
  }
}

export function progressPercent(entry: MediaEntry): number {
  if (!entry.episodes || entry.episodes <= 0) return 0
  const watched = entry.episodes_watched ?? 0
  const ratio = watched / entry.episodes
  return Math.max(0, Math.min(100, Math.round(ratio * 100)))
}

export function formatRatingStars(value: number | null): string {
  if (value == null || value <= 0) return "☆☆☆☆☆"
  const normalized = Math.max(0, Math.min(5, Math.round(value / 2)))
  const filled = "★".repeat(normalized)
  const empty = "☆".repeat(5 - normalized)
  return `${filled}${empty}`
}
