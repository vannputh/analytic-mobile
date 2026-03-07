import type { MediaEntry } from "@/src/shared/types/database"

export type MediaEditorTab = "general" | "advanced" | "episodes" | "history"

export interface MediaEpisodeHistoryRecord {
  episode: number
  watched_at: string
}

export interface MediaEditorDraft {
  title: string
  status: string
  medium: string
  type: string
  platform: string
  season: string
  episodes: string
  episodesWatched: string
  myRating: string
  averageRating: string
  price: string
  length: string
  imdbId: string
  genre: string
  language: string
  startDate: string
  finishDate: string
  posterUrl: string
  episodeHistoryDraft: MediaEpisodeHistoryRecord[]
}

export type MediaMetadataConflictField =
  | "title"
  | "imdbId"
  | "length"
  | "averageRating"
  | "season"
  | "episodes"
  | "genre"
  | "language"
  | "posterUrl"

export interface MediaMetadataConflict {
  field: MediaMetadataConflictField
  label: string
  current: string
  incoming: string
}

export interface PendingMediaMetadataSelection {
  conflictPatch: Partial<MediaEditorDraft>
  conflicts: MediaMetadataConflict[]
  selections: Record<MediaMetadataConflictField, boolean>
}

export const MEDIA_EDITOR_TABS: Array<{ value: MediaEditorTab; label: string }> = [
  { value: "general", label: "General" },
  { value: "advanced", label: "Advanced" },
  { value: "episodes", label: "Episodes" },
  { value: "history", label: "History" }
]

export const MEDIA_STATUS_OPTIONS = ["Watching", "Finished", "On Hold", "Dropped", "Plan to Watch"] as const

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function toCsvList(value: string[] | null | undefined): string {
  if (!value || value.length === 0) return ""
  return value.join(", ")
}

export function parseCsvList(value: string): string[] | null {
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  return parsed.length > 0 ? parsed : null
}

export function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseEpisodeHistory(value: unknown): MediaEpisodeHistoryRecord[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item) => {
      if (!item || typeof item !== "object") return false
      const record = item as { episode?: unknown; watched_at?: unknown }
      return typeof record.episode === "number" && typeof record.watched_at === "string"
    })
    .map((item) => {
      const record = item as { episode: number; watched_at: string }
      return { episode: record.episode, watched_at: record.watched_at }
    })
}

function getEpisodeProgressFallback(history: MediaEpisodeHistoryRecord[]): string {
  if (history.length === 0) return ""
  return String(Math.max(...history.map((item) => item.episode)))
}

export function buildMediaEditorDraft(entry?: MediaEntry | null): MediaEditorDraft {
  if (!entry) {
    return {
      title: "",
      status: "Watching",
      medium: "Movie",
      type: "",
      platform: "",
      season: "",
      episodes: "",
      episodesWatched: "",
      myRating: "",
      averageRating: "",
      price: "",
      length: "",
      imdbId: "",
      genre: "",
      language: "",
      startDate: todayIsoDate(),
      finishDate: "",
      posterUrl: "",
      episodeHistoryDraft: []
    }
  }

  const episodeHistoryDraft = parseEpisodeHistory(entry.episode_history)

  return {
    title: entry.title,
    status: entry.status ?? "Watching",
    medium: entry.medium ?? "Movie",
    type: entry.type ?? "",
    platform: entry.platform ?? "",
    season: entry.season ?? "",
    episodes: entry.episodes != null ? String(entry.episodes) : "",
    episodesWatched: entry.episodes_watched != null ? String(entry.episodes_watched) : getEpisodeProgressFallback(episodeHistoryDraft),
    myRating: entry.my_rating != null ? String(entry.my_rating) : "",
    averageRating: entry.average_rating != null ? String(entry.average_rating) : "",
    price: entry.price != null ? String(entry.price) : "",
    length: entry.length ?? "",
    imdbId: entry.imdb_id ?? "",
    genre: toCsvList(entry.genre),
    language: toCsvList(entry.language),
    startDate: entry.start_date ?? "",
    finishDate: entry.finish_date ?? "",
    posterUrl: entry.poster_url ?? "",
    episodeHistoryDraft
  }
}

function getEpisodeHistoryMax(history: MediaEpisodeHistoryRecord[]): number {
  if (history.length === 0) return 0
  return Math.max(...history.map((item) => item.episode))
}

function getLastWatchedAt(history: MediaEpisodeHistoryRecord[]): string | null {
  if (history.length === 0) return null

  const sorted = [...history].sort((left, right) => {
    const leftTime = new Date(left.watched_at).getTime()
    const rightTime = new Date(right.watched_at).getTime()
    return rightTime - leftTime
  })

  return sorted[0]?.watched_at ?? null
}

export function buildMediaEntryPayloadFromDraft(draft: MediaEditorDraft): Partial<MediaEntry> & { title: string } {
  const episodeHistory = draft.episodeHistoryDraft
  const historyMax = getEpisodeHistoryMax(episodeHistory)
  const manualEpisodesWatched = toNumberOrNull(draft.episodesWatched)

  return {
    title: draft.title.trim(),
    status: draft.status.trim() || null,
    medium: draft.medium.trim() || null,
    type: draft.type.trim() || null,
    platform: draft.platform.trim() || null,
    season: draft.season.trim() || null,
    episodes: toNumberOrNull(draft.episodes),
    episodes_watched: historyMax > 0 ? Math.max(historyMax, manualEpisodesWatched ?? 0) : manualEpisodesWatched,
    my_rating: toNumberOrNull(draft.myRating),
    average_rating: toNumberOrNull(draft.averageRating),
    price: toNumberOrNull(draft.price),
    length: draft.length.trim() || null,
    imdb_id: draft.imdbId.trim() || null,
    genre: parseCsvList(draft.genre),
    language: parseCsvList(draft.language),
    start_date: draft.startDate.trim() || null,
    finish_date: draft.finishDate.trim() || null,
    poster_url: draft.posterUrl.trim() || null,
    episode_history: episodeHistory.length > 0 ? (episodeHistory as unknown as MediaEntry["episode_history"]) : null,
    last_watched_at: getLastWatchedAt(episodeHistory)
  }
}

export function formatEditorDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-US")
}

export function toEpisodeDateInputValue(value: string): string {
  return value.replace("Z", "").slice(0, 16)
}

export function getSuggestedEpisodeNumber(draft: MediaEditorDraft): number {
  const currentWatched = Math.max(toNumberOrNull(draft.episodesWatched) ?? 0, getEpisodeHistoryMax(draft.episodeHistoryDraft))
  const totalEpisodes = toNumberOrNull(draft.episodes)
  if (totalEpisodes) {
    return Math.min(currentWatched + 1, totalEpisodes)
  }
  return currentWatched + 1
}

export function addEpisodeToDraft(
  draft: MediaEditorDraft,
  episode: number,
  watchedAt: string = new Date().toISOString()
): MediaEditorDraft {
  const nextHistory = [...draft.episodeHistoryDraft, { episode, watched_at: watchedAt }]
  return {
    ...draft,
    status: "Watching",
    episodesWatched: String(Math.max(toNumberOrNull(draft.episodesWatched) ?? 0, getEpisodeHistoryMax(nextHistory))),
    episodeHistoryDraft: nextHistory
  }
}

export function markFinishedTodayInDraft(
  draft: MediaEditorDraft,
  watchedAt: string = new Date().toISOString()
): MediaEditorDraft | null {
  const totalEpisodes = toNumberOrNull(draft.episodes)
  if (!totalEpisodes) return null

  const existingHistory = draft.episodeHistoryDraft
  const maxEpisode = getEpisodeHistoryMax(existingHistory)
  if (maxEpisode >= totalEpisodes) return null

  const additions: MediaEpisodeHistoryRecord[] = []
  for (let episode = maxEpisode + 1; episode <= totalEpisodes; episode += 1) {
    additions.push({ episode, watched_at: watchedAt })
  }

  return {
    ...draft,
    status: "Finished",
    finishDate: watchedAt.slice(0, 10),
    episodesWatched: String(totalEpisodes),
    episodeHistoryDraft: [...existingHistory, ...additions]
  }
}

export function updateEpisodeHistoryDate(
  draft: MediaEditorDraft,
  index: number,
  watchedAt: string
): MediaEditorDraft {
  if (!draft.episodeHistoryDraft[index]) return draft
  const nextHistory = [...draft.episodeHistoryDraft]
  nextHistory[index] = { ...nextHistory[index], watched_at: watchedAt }
  return {
    ...draft,
    episodeHistoryDraft: nextHistory
  }
}

export function deleteEpisodeHistoryItem(draft: MediaEditorDraft, index: number): MediaEditorDraft {
  if (!draft.episodeHistoryDraft[index]) return draft
  const nextHistory = draft.episodeHistoryDraft.filter((_, currentIndex) => currentIndex !== index)
  const nextWatched = getEpisodeHistoryMax(nextHistory)

  return {
    ...draft,
    episodesWatched: nextWatched > 0 ? String(nextWatched) : "",
    episodeHistoryDraft: nextHistory
  }
}

export function deriveTimeTakenLabel(startDate: string, finishDate: string): string {
  const start = startDate.trim()
  const finish = finishDate.trim()
  if (!start || !finish) return ""

  const startValue = new Date(`${start}T12:00:00`)
  const finishValue = new Date(`${finish}T12:00:00`)
  if (Number.isNaN(startValue.getTime()) || Number.isNaN(finishValue.getTime())) return ""

  const diffDays = Math.round((finishValue.getTime() - startValue.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return ""
  if (diffDays === 0) return "Completed the same day"
  if (diffDays === 1) return "1 day"
  return `${diffDays} days`
}

export function buildMetadataSelectionFromDraft(
  metadata: Record<string, unknown>,
  draft: MediaEditorDraft
): {
  immediatePatch: Partial<MediaEditorDraft>
  pendingSelection: PendingMediaMetadataSelection | null
} {
  const immediatePatch: Partial<MediaEditorDraft> = {}
  const conflictPatch: Partial<MediaEditorDraft> = {}
  const conflicts: MediaMetadataConflict[] = []

  function processField<T extends MediaMetadataConflictField>(
    field: T,
    label: string,
    incomingRaw: unknown,
    currentValue: string,
    transform: (value: unknown) => string | null
  ) {
    const incomingString = transform(incomingRaw)
    if (!incomingString) return

    const currentString = currentValue.trim()
    const isConflict = currentString.length > 0 && currentString !== incomingString.trim()

    if (isConflict) {
      ;(conflictPatch as Record<string, unknown>)[field] = incomingString
      conflicts.push({ field, label, current: currentValue, incoming: incomingString })
      return
    }

    ;(immediatePatch as Record<string, unknown>)[field] = incomingString
  }

  processField("title", "Title", metadata.title, draft.title, (value) => (typeof value === "string" ? value : null))
  processField("imdbId", "IMDb ID", metadata.imdb_id, draft.imdbId, (value) => (typeof value === "string" ? value : null))
  processField("length", "Length / Duration", metadata.length, draft.length, (value) => (typeof value === "string" ? value : null))
  processField("averageRating", "Average Rating", metadata.average_rating, draft.averageRating, (value) =>
    typeof value === "number" ? String(value) : null
  )
  processField("season", "Season", metadata.season, draft.season, (value) => (typeof value === "string" ? value : null))
  processField("episodes", "Episodes", metadata.episodes, draft.episodes, (value) =>
    typeof value === "number" ? String(value) : null
  )
  processField("genre", "Genre(s)", metadata.genre, draft.genre, (value) => {
    if (Array.isArray(value)) {
      const list = value.filter((item): item is string => typeof item === "string")
      return list.length > 0 ? list.join(", ") : null
    }
    return typeof value === "string" ? value : null
  })
  processField("language", "Language", metadata.language, draft.language, (value) => {
    if (Array.isArray(value)) {
      const list = value.filter((item): item is string => typeof item === "string")
      return list.length > 0 ? list.join(", ") : null
    }
    return typeof value === "string" ? value : null
  })
  processField("posterUrl", "Poster URL", metadata.poster_url, draft.posterUrl, (value) => (typeof value === "string" ? value : null))

  if (conflicts.length === 0) {
    return {
      immediatePatch,
      pendingSelection: null
    }
  }

  return {
    immediatePatch,
    pendingSelection: {
      conflictPatch,
      conflicts,
      selections: conflicts.reduce(
        (acc, conflict) => ({ ...acc, [conflict.field]: false }),
        {} as Record<MediaMetadataConflictField, boolean>
      )
    }
  }
}

export function applyMetadataSelection(selection: PendingMediaMetadataSelection): Partial<MediaEditorDraft> {
  const patch: Partial<MediaEditorDraft> = {}

  for (const conflict of selection.conflicts) {
    if (!selection.selections[conflict.field]) continue
    const value = selection.conflictPatch[conflict.field]
    if (typeof value === "string") {
      ;(patch as Record<string, unknown>)[conflict.field] = value
    }
  }

  return patch
}
