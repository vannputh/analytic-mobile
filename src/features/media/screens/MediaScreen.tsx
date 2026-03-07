import { useCallback, useEffect, useMemo, useState } from "react"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "@react-navigation/native"
import { Image } from "expo-image"
import { Stack, useRouter } from "expo-router"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system"
import * as ImagePicker from "expo-image-picker"
import { MediaEditorContent } from "@/src/features/media/components/media-editor-content"
import { MediaEntryRow } from "@/src/features/media/components/media-entry-row"
import { MediaFilterStrip } from "@/src/features/media/components/media-filter-strip"
import { MediaHeaderActions } from "@/src/features/media/components/media-header-actions"
import { MediaMetadataConflictModal } from "@/src/features/media/components/media-metadata-conflict-modal"
import { MediaOverflowSheet } from "@/src/features/media/components/media-overflow-sheet"
import { MediaSelectionToolbar } from "@/src/features/media/components/media-selection-toolbar"
import { MediaWatchingShelf } from "@/src/features/media/components/media-watching-shelf"
import { MediaAnalyticsPanel } from "@/src/features/analytics/components/MediaAnalyticsPanel"
import { useMediaEntries } from "@/src/features/media/hooks/useMediaEntries"
import { consumePendingMediaFlashMessage } from "@/src/features/media/lib/media-flash-message"
import {
  addEpisodeToDraft,
  applyMetadataSelection,
  buildMediaEditorDraft,
  buildMediaEntryPayloadFromDraft,
  buildMetadataSelectionFromDraft,
  deleteEpisodeHistoryItem,
  markFinishedTodayInDraft,
  parseEpisodeHistory,
  updateEpisodeHistoryDate,
  type MediaEditorDraft,
  type MediaEditorTab,
  type MediaMetadataConflictField,
  type PendingMediaMetadataSelection
} from "@/src/features/media/lib/media-editor"
import { NativeSegmentedControl } from "@/src/shared/components/native/native-segmented-control"
import { GroupedSection } from "@/src/shared/components/native/grouped-section"
import { ScreenScrollView } from "@/src/shared/components/native/screen-scroll-view"
import { backendFetch } from "@/src/shared/api/backend"
import { uploadAssetToBackend } from "@/src/shared/api/upload"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"
import type { MediaEntry, MediaStatusHistory } from "@/src/shared/types/database"
import type { CleanDataResponse, CleanedMediaEntry, MetadataResponse } from "@analytics/contracts"

type SortKey = "title" | "rating" | "finish_date"

interface SectionShape {
  title: string
  key: string
  data: MediaEntry[]
}

interface ImportSummary {
  success: number
  failed: number
}

type MediaWorkspaceMode = "diary" | "analytics"

function parseCsvList(value: string): string[] | null {
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  return parsed.length > 0 ? parsed : null
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function parseFlexibleList(value: string[] | string | null | undefined): string[] | null {
  if (!value) return null
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => item.trim())
      .filter(Boolean)
    return normalized.length > 0 ? normalized : null
  }
  return parseCsvList(value)
}

function toCreatePayloadFromCleanedEntry(entry: CleanedMediaEntry): (Partial<MediaEntry> & { title: string }) | null {
  const title = typeof entry.title === "string" ? entry.title.trim() : ""
  if (!title) return null

  return {
    title,
    status: entry.status ?? undefined,
    medium: entry.medium ?? undefined,
    type: entry.type ?? undefined,
    platform: entry.platform ?? undefined,
    season: entry.season ?? undefined,
    length: entry.length ?? undefined,
    imdb_id: entry.imdb_id ?? undefined,
    start_date: entry.start_date ?? undefined,
    finish_date: entry.finish_date ?? undefined,
    my_rating: typeof entry.my_rating === "number" ? entry.my_rating : undefined,
    average_rating: typeof entry.average_rating === "number" ? entry.average_rating : undefined,
    price: typeof entry.price === "number" ? entry.price : undefined,
    episodes: typeof entry.episodes === "number" ? entry.episodes : undefined,
    language: parseFlexibleList(entry.language) ?? undefined,
    genre: parseFlexibleList(entry.genre) ?? undefined,
    poster_url: entry.poster_url ?? undefined
  }
}

function matchesSearch(entry: MediaEntry, query: string): boolean {
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

function statusBucket(status: string | null): "watching" | "watched" | "planned" | "paused" {
  if (status === "Watching") return "watching"
  if (status === "Finished") return "watched"
  if (status === "Plan to Watch" || status === "Planned") return "planned"
  return "paused"
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  return value
}

function rowSubtitle(entry: MediaEntry): string {
  const pieces = [entry.medium ?? "Unknown", entry.status ?? "-"]
  if (entry.finish_date) pieces.push(`Finished ${entry.finish_date}`)
  else if (entry.start_date) pieces.push(`Started ${entry.start_date}`)
  return pieces.join(" • ")
}

function sortEntries(entries: MediaEntry[], sortKey: SortKey, descending: boolean): MediaEntry[] {
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

function formatShortDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })
}

function formatRelativeDate(value: string | null): string {
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

function toMonthDay(value: string | null): { month: string; day: string } {
  if (!value) return { month: "---", day: "--" }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { month: "---", day: "--" }
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(date.getDate()).padStart(2, "0")
  }
}

function progressPercent(entry: MediaEntry): number {
  if (!entry.episodes || entry.episodes <= 0) return 0
  const watched = entry.episodes_watched ?? 0
  const ratio = watched / entry.episodes
  return Math.max(0, Math.min(100, Math.round(ratio * 100)))
}

function formatRatingStars(value: number | null): string {
  if (value == null || value <= 0) return "☆☆☆☆☆"
  const normalized = Math.max(0, Math.min(5, Math.round(value / 2)))
  const filled = "★".repeat(normalized)
  const empty = "☆".repeat(5 - normalized)
  return `${filled}${empty}`
}

export function MediaScreen() {
  const router = useRouter()
  const { palette } = useAppTheme()
  const { data, isLoading, error, createEntry, updateEntry, deleteEntry, getStatusHistory, refetch } = useMediaEntries()

  const [search, setSearch] = useState("")
  const [workspaceMode, setWorkspaceMode] = useState<MediaWorkspaceMode>("diary")
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [importSheetOpen, setImportSheetOpen] = useState(false)
  const [mediumFilter, setMediumFilter] = useState<string | null>(null)
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const [csvData, setCsvData] = useState("")
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [cleaningImport, setCleaningImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [enrichingImport, setEnrichingImport] = useState(false)
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 })
  const [cleanedImportRows, setCleanedImportRows] = useState<CleanedMediaEntry[]>([])
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [batchFetching, setBatchFetching] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchEditOpen, setBatchEditOpen] = useState(false)
  const [batchEditSaving, setBatchEditSaving] = useState(false)
  const [batchEditForm, setBatchEditForm] = useState({
    status: "",
    medium: "",
    type: "",
    platform: "",
    language: "",
    genre: "",
    price: "",
    episodes: ""
  })
  const [sortKey, setSortKey] = useState<SortKey>("finish_date")
  const [sortDescending, setSortDescending] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const [selectedEntry, setSelectedEntry] = useState<MediaEntry | null>(null)
  const [editorTab, setEditorTab] = useState<MediaEditorTab>("general")
  const [formState, setFormState] = useState<MediaEditorDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [statusHistory, setStatusHistory] = useState<MediaStatusHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [pendingMetadata, setPendingMetadata] = useState<PendingMediaMetadataSelection | null>(null)

  const [watchThisEntry, setWatchThisEntry] = useState<MediaEntry | null>(null)
  const [watchThisSynopsis, setWatchThisSynopsis] = useState<string>("")
  const [watchThisLoading, setWatchThisLoading] = useState(false)

  const entries = data ?? []

  useEffect(() => {
    if (!selectMode) {
      setSelectedIds(new Set())
      setBatchEditOpen(false)
      resetBatchEditForm()
    }
  }, [selectMode])

  useFocusEffect(
    useCallback(() => {
      const pendingMessage = consumePendingMediaFlashMessage()
      if (pendingMessage) {
        setMessage(pendingMessage)
      }
      return undefined
    }, [])
  )

  const sections = useMemo<SectionShape[]>(() => {
    const filtered = entries
      .filter((entry) => matchesSearch(entry, search.trim().toLowerCase()))
      .filter((entry) => (mediumFilter ? entry.medium === mediumFilter : true))
      .filter((entry) => (genreFilter ? (entry.genre ?? []).includes(genreFilter) : true))
    const sorted = sortEntries(filtered, sortKey, sortDescending)
    const watched = sorted.filter((entry) => statusBucket(entry.status) === "watched")
    const planned = sorted.filter((entry) => statusBucket(entry.status) === "planned")
    const paused = sorted.filter((entry) => statusBucket(entry.status) === "paused")

    return [
      { title: "Watched", key: "watched", data: watched },
      { title: "Planned", key: "planned", data: planned },
      { title: "On Hold / Dropped", key: "paused", data: paused }
    ].filter((section) => section.data.length > 0)
  }, [entries, genreFilter, mediumFilter, search, sortKey, sortDescending])

  const watchingEntries = useMemo(
    () => sortEntries(entries.filter((entry) => statusBucket(entry.status) === "watching"), sortKey, sortDescending),
    [entries, sortKey, sortDescending]
  )

  const mediumOptions = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.medium).filter((value): value is string => Boolean(value)))).slice(0, 6),
    [entries]
  )

  const genreOptions = useMemo(
    () => Array.from(new Set(entries.flatMap((entry) => entry.genre ?? []))).slice(0, 6),
    [entries]
  )

  async function loadStatusHistory(entryId: string) {
    setHistoryLoading(true)
    try {
      const history = await getStatusHistory(entryId)
      setStatusHistory(history)
    } catch {
      setStatusHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  function openEntryDetails(entry: MediaEntry) {
    setSelectedEntry(entry)
    setEditorTab("general")
    setFormState(buildMediaEditorDraft(entry))
    setPendingMetadata(null)
    setMessage(null)
    loadStatusHistory(entry.id)
  }

  function closeEntryDetails() {
    setSelectedEntry(null)
    setEditorTab("general")
    setFormState(null)
    setFetchingMetadata(false)
    setSaving(false)
    setStatusHistory([])
    setHistoryLoading(false)
    setPendingMetadata(null)
  }

  async function handleDelete(id: string) {
    try {
      await deleteEntry(id)
      setMessage("Entry deleted")
      if (selectedEntry?.id === id) closeEntryDetails()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to delete entry")
    }
  }

  async function pickImportFile() {
    setMessage(null)
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/tab-separated-values", "text/plain", "text/*"],
        multiple: false,
        copyToCacheDirectory: true
      })

      if (selection.canceled || !selection.assets[0]) return
      const asset = selection.assets[0]
      const fileText = await FileSystem.readAsStringAsync(asset.uri)

      if (!fileText.trim()) {
        setMessage("Selected file is empty")
        return
      }

      setCsvData(fileText)
      setImportFileName(asset.name ?? "selected-file.txt")
      setCleanedImportRows([])
      setImportSummary(null)
      setMessage(`Loaded ${asset.name ?? "file"}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to read import file")
    }
  }

  function clearImportDraft() {
    setCsvData("")
    setImportFileName(null)
    setCleanedImportRows([])
    setImportSummary(null)
    setEnrichProgress({ current: 0, total: 0 })
  }

  async function cleanImportPreview() {
    if (!csvData.trim()) {
      setMessage("Paste CSV/TSV data or pick a file first")
      return
    }

    setCleaningImport(true)
    setMessage(null)
    setImportSummary(null)
    try {
      const cleaned = await backendFetch<CleanDataResponse>("/api/clean-data", {
        method: "POST",
        body: JSON.stringify({ csvData })
      })

      if (!cleaned.success || !Array.isArray(cleaned.data)) {
        throw new Error(cleaned.error ?? "Failed to clean CSV data")
      }

      const rows = cleaned.data.filter((entry) => entry.title?.trim().length > 0)
      setCleanedImportRows(rows)

      const skipped = cleaned.data.length - rows.length
      const warningCount = cleaned.errors.length
      const statusBits = [
        `Preview ready (${rows.length} rows)`,
        skipped > 0 ? `skipped ${skipped}` : null,
        warningCount > 0 ? `${warningCount} warnings` : null
      ].filter(Boolean)
      setMessage(statusBits.join(" • "))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "CSV clean failed")
    } finally {
      setCleaningImport(false)
    }
  }

  async function enrichCleanedImportRows() {
    if (cleanedImportRows.length === 0) {
      setMessage("Run Clean Preview first")
      return
    }

    const next = [...cleanedImportRows]
    let updatedRows = 0

    setEnrichingImport(true)
    setEnrichProgress({ current: 0, total: next.length })
    setMessage(null)

    try {
      for (let index = 0; index < next.length; index += 1) {
        const row = next[index]
        setEnrichProgress({ current: index + 1, total: next.length })
        if (!row.title?.trim()) continue

        const hasCoreMetadata =
          Boolean(row.poster_url) &&
          Boolean(row.imdb_id) &&
          typeof row.average_rating === "number" &&
          Boolean(row.length)
        if (hasCoreMetadata) continue

        const params = new URLSearchParams({ title: row.title, source: "tmdb" })
        if (row.imdb_id) params.set("imdb_id", row.imdb_id)
        if (row.medium === "Movie") params.set("type", "movie")
        if (row.medium === "TV Show") params.set("type", "series")

        try {
          const metadata = await backendFetch<MetadataResponse>(`/api/metadata?${params.toString()}`)
          let changed = false
          const patched: CleanedMediaEntry = { ...row }

          if (!patched.poster_url && metadata.poster_url) {
            patched.poster_url = metadata.poster_url
            changed = true
          }
          if (!patched.imdb_id && metadata.imdb_id) {
            patched.imdb_id = metadata.imdb_id
            changed = true
          }
          if (patched.average_rating == null && typeof metadata.average_rating === "number") {
            patched.average_rating = metadata.average_rating
            changed = true
          }
          if (!patched.length && metadata.length) {
            patched.length = metadata.length
            changed = true
          }
          if (!patched.genre && metadata.genre) {
            patched.genre = metadata.genre
            changed = true
          }
          if (!patched.language && metadata.language) {
            patched.language = metadata.language
            changed = true
          }

          if (changed) {
            next[index] = patched
            updatedRows += 1
          }
        } catch {
          // Keep enrichment best-effort; unresolved rows can still import.
        }
      }

      setCleanedImportRows(next)
      setMessage(`Metadata enrichment complete. Updated ${updatedRows} rows.`)
    } finally {
      setEnrichingImport(false)
      setEnrichProgress({ current: 0, total: 0 })
    }
  }

  async function handleImportCsv() {
    if (cleanedImportRows.length === 0) {
      setMessage("Run Clean Preview before importing")
      return
    }

    setImporting(true)
    setMessage(null)
    setImportSummary(null)
    let success = 0
    let failed = 0

    try {
      for (const row of cleanedImportRows) {
        const payload = toCreatePayloadFromCleanedEntry(row)
        if (!payload) {
          failed += 1
          continue
        }

        try {
          await createEntry(payload)
          success += 1
        } catch {
          failed += 1
        }
      }

      setImportSummary({ success, failed })
      setMessage(`Import complete. Success ${success}, failed ${failed}.`)
      if (failed === 0) {
        clearImportDraft()
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "CSV import failed")
    } finally {
      setImporting(false)
    }
  }

  function applyPendingMetadataSelection(selection: PendingMediaMetadataSelection) {
    if (!formState) return
    const patch = applyMetadataSelection(selection)
    if (Object.keys(patch).length > 0) {
      setFormState((prev) => (prev ? { ...prev, ...patch } : prev))
    }
    setPendingMetadata(null)
    setMessage("Metadata applied")
  }

  function toggleMetadataField(field: MediaMetadataConflictField) {
    setPendingMetadata((prev) =>
      prev
        ? {
            ...prev,
            selections: { ...prev.selections, [field]: !prev.selections[field] }
          }
        : prev
    )
  }

  async function fetchMetadataForForm(paramsOverride?: { title?: string; imdb_id?: string }) {
    if (!formState) return

    const titleParam = paramsOverride?.title ?? formState.title.trim()
    const imdbIdParam = paramsOverride?.imdb_id ?? formState.imdbId.trim()
    if (!titleParam && !imdbIdParam) {
      setMessage("Enter a title or IMDb ID first")
      return
    }

    setFetchingMetadata(true)
    setMessage(null)
    try {
      const params = new URLSearchParams()
      if (titleParam) params.set("title", titleParam)
      if (imdbIdParam) params.set("imdb_id", imdbIdParam)
      if (formState.medium === "Movie") params.set("type", "movie")
      if (formState.medium === "TV Show") params.set("type", "series")
      if (formState.season.trim()) params.set("season", formState.season.trim())
      params.set("source", "tmdb")

      const metadata = await backendFetch<Record<string, unknown>>(`/api/metadata?${params.toString()}`)
      const { immediatePatch, pendingSelection } = buildMetadataSelectionFromDraft(metadata, formState)
      if (Object.keys(immediatePatch).length > 0) {
        setFormState((prev) => (prev ? { ...prev, ...immediatePatch } : prev))
      }

      if (pendingSelection) {
        setPendingMetadata(pendingSelection)
        setMessage("Metadata fetched. Review conflicting fields.")
      } else {
        setMessage("Metadata fetched")
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to fetch metadata")
    } finally {
      setFetchingMetadata(false)
    }
  }

  async function pickAndUploadPoster() {
    if (!formState) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setMessage("Photo library permission is required")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9
    })
    if (result.canceled || !result.assets.length) return

    const asset = result.assets[0]
    setUploadingPoster(true)
    setMessage(null)
    try {
      const uploaded = await uploadAssetToBackend({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        title: formState.title || "poster"
      })
      setFormState((prev) => (prev ? { ...prev, posterUrl: uploaded.url } : prev))
      setMessage("Poster uploaded")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to upload poster")
    } finally {
      setUploadingPoster(false)
    }
  }

  async function saveEntryDetails() {
    if (!selectedEntry || !formState) return
    const payload = buildMediaEntryPayloadFromDraft(formState)
    if (!payload.title) {
      setMessage("Title is required")
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      await updateEntry({ id: selectedEntry.id, payload })
      await refetch()
      setMessage("Entry updated")
      closeEntryDetails()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save entry")
    } finally {
      setSaving(false)
    }
  }

  async function markNextEpisodeForEntry(entry: MediaEntry) {
    const currentWatched = entry.episodes_watched ?? 0
    const totalEpisodes = entry.episodes
    const nextEpisode = totalEpisodes ? Math.min(currentWatched + 1, totalEpisodes) : currentWatched + 1
    const existingHistory = parseEpisodeHistory(entry.episode_history)
    const watchedAt = new Date().toISOString()
    const updatedHistory = [...existingHistory, { episode: nextEpisode, watched_at: watchedAt }]

    await updateEntry({
      id: entry.id,
      payload: {
        episodes_watched: nextEpisode,
        episode_history: updatedHistory as unknown as MediaEntry["episode_history"],
        last_watched_at: watchedAt,
        status: "Watching"
      }
    })
    await refetch()
  }

  function addEpisodeToEditor(episode: number) {
    setFormState((prev) => (prev ? addEpisodeToDraft(prev, episode) : prev))
    setMessage(`Logged episode ${episode}`)
  }

  function finishTodayInEditor() {
    if (!formState) return
    const nextDraft = markFinishedTodayInDraft(formState)
    if (!nextDraft) {
      setMessage("Set total episodes first or add remaining episodes before finishing today")
      return
    }
    const additions = nextDraft.episodeHistoryDraft.length - formState.episodeHistoryDraft.length
    setFormState(nextDraft)
    setMessage(`Logged remaining ${additions} episode${additions === 1 ? "" : "s"}`)
  }

  function updateEpisodeDateInEditor(index: number, watchedAt: string) {
    if (!watchedAt.trim()) {
      setMessage("Enter a valid date/time value")
      return
    }
    const draftDate = new Date(watchedAt)
    if (Number.isNaN(draftDate.getTime())) {
      setMessage("Invalid episode date")
      return
    }

    setFormState((prev) => (prev ? updateEpisodeHistoryDate(prev, index, draftDate.toISOString()) : prev))
    setMessage("Episode history updated")
  }

  function deleteEpisodeHistoryInEditor(index: number) {
    setFormState((prev) => (prev ? deleteEpisodeHistoryItem(prev, index) : prev))
    setMessage("Episode entry removed")
  }

  async function batchFetchMetadata(targetIds?: string[]) {
    if (!entries.length) return
    const idSet = targetIds ? new Set(targetIds) : null
    setBatchFetching(true)
    setMessage(null)
    let updatedCount = 0

    try {
      for (const entry of entries) {
        if (idSet && !idSet.has(entry.id)) continue
        if (!entry.title?.trim()) continue
        const hasCoreMetadata = Boolean(entry.poster_url) && Boolean(entry.imdb_id) && entry.average_rating != null && Boolean(entry.length)
        if (hasCoreMetadata) continue

        const params = new URLSearchParams({ title: entry.title, source: "tmdb" })
        if (entry.imdb_id) params.set("imdb_id", entry.imdb_id)
        if (entry.medium === "Movie") params.set("type", "movie")
        if (entry.medium === "TV Show") params.set("type", "series")

        try {
          const metadata = await backendFetch<Record<string, unknown>>(`/api/metadata?${params.toString()}`)
          const patch: Partial<MediaEntry> = {}
          if (!entry.poster_url && typeof metadata.poster_url === "string") patch.poster_url = metadata.poster_url
          if (!entry.imdb_id && typeof metadata.imdb_id === "string") patch.imdb_id = metadata.imdb_id
          if (entry.average_rating == null && typeof metadata.average_rating === "number") patch.average_rating = metadata.average_rating
          if (!entry.length && typeof metadata.length === "string") patch.length = metadata.length
          if ((!entry.genre || entry.genre.length === 0) && Array.isArray(metadata.genre)) {
            patch.genre = metadata.genre.filter((item): item is string => typeof item === "string")
          }
          if ((!entry.language || entry.language.length === 0) && Array.isArray(metadata.language)) {
            patch.language = metadata.language.filter((item): item is string => typeof item === "string")
          }

          if (Object.keys(patch).length > 0) {
            await updateEntry({ id: entry.id, payload: patch })
            updatedCount += 1
          }
        } catch {
          // keep best-effort behavior
        }
      }
      setMessage(`Batch metadata complete. Updated ${updatedCount} entries.`)
      await refetch()
    } finally {
      setBatchFetching(false)
    }
  }

  async function batchDeleteSelected() {
    if (selectedIds.size === 0) return
    for (const id of selectedIds) {
      await deleteEntry(id)
    }
    setSelectedIds(new Set())
    setMessage("Selected entries deleted")
    await refetch()
  }

  async function batchSetFinished() {
    if (selectedIds.size === 0) return
    const today = new Date().toISOString().slice(0, 10)
    for (const id of selectedIds) {
      const entry = entries.find((item) => item.id === id)
      if (!entry) continue
      await updateEntry({
        id,
        payload: {
          status: "Finished",
          finish_date: today,
          episodes_watched: entry.episodes ?? entry.episodes_watched
        }
      })
    }
    setSelectedIds(new Set())
    setMessage("Selected entries marked finished")
    await refetch()
  }

  function resetBatchEditForm() {
    setBatchEditForm({
      status: "",
      medium: "",
      type: "",
      platform: "",
      language: "",
      genre: "",
      price: "",
      episodes: ""
    })
  }

  async function applyBatchEdit() {
    if (selectedIds.size === 0) return

    const languageList = parseCsvList(batchEditForm.language)
    const genreList = parseCsvList(batchEditForm.genre)
    const price = toNumberOrNull(batchEditForm.price)
    const episodes = toNumberOrNull(batchEditForm.episodes)

    const hasChanges =
      Boolean(batchEditForm.status.trim()) ||
      Boolean(batchEditForm.medium.trim()) ||
      Boolean(batchEditForm.type.trim()) ||
      Boolean(batchEditForm.platform.trim()) ||
      Boolean(batchEditForm.language.trim()) ||
      Boolean(batchEditForm.genre.trim()) ||
      batchEditForm.price.trim().length > 0 ||
      batchEditForm.episodes.trim().length > 0

    if (!hasChanges) {
      setMessage("Set at least one field for batch edit")
      return
    }

    setBatchEditSaving(true)
    setMessage(null)
    let updated = 0
    let failed = 0

    try {
      for (const id of selectedIds) {
        const patch: Partial<MediaEntry> = {}
        if (batchEditForm.status.trim()) patch.status = batchEditForm.status.trim()
        if (batchEditForm.medium.trim()) patch.medium = batchEditForm.medium.trim()
        if (batchEditForm.type.trim()) patch.type = batchEditForm.type.trim()
        if (batchEditForm.platform.trim()) patch.platform = batchEditForm.platform.trim()
        if (batchEditForm.language.trim()) patch.language = languageList
        if (batchEditForm.genre.trim()) patch.genre = genreList
        if (batchEditForm.price.trim().length > 0) patch.price = price
        if (batchEditForm.episodes.trim().length > 0) patch.episodes = episodes

        try {
          await updateEntry({ id, payload: patch })
          updated += 1
        } catch {
          failed += 1
        }
      }

      setMessage(`Batch edit complete. Updated ${updated}, failed ${failed}.`)
      setBatchEditOpen(false)
      resetBatchEditForm()
      setSelectedIds(new Set())
      await refetch()
    } finally {
      setBatchEditSaving(false)
    }
  }

  function pickRandomPlanned() {
    const planned = entries.filter((entry) => statusBucket(entry.status) === "planned")
    if (planned.length === 0) {
      setMessage("No planned entries available")
      return
    }
    const random = planned[Math.floor(Math.random() * planned.length)]
    setWatchThisEntry(random)
    loadWatchThisSynopsis(random)
  }

  async function loadWatchThisSynopsis(entry: MediaEntry) {
    setWatchThisLoading(true)
    setWatchThisSynopsis("")
    try {
      const params = new URLSearchParams()
      params.set("source", "tmdb")
      if (entry.imdb_id) params.set("imdb_id", entry.imdb_id)
      if (entry.title) params.set("title", entry.title)
      if (entry.medium === "Movie") params.set("type", "movie")
      if (entry.medium === "TV Show") params.set("type", "series")
      const metadata = await backendFetch<Record<string, unknown>>(`/api/metadata?${params.toString()}`)
      setWatchThisSynopsis(typeof metadata.plot === "string" ? metadata.plot : "No synopsis available.")
    } catch {
      setWatchThisSynopsis("Could not load synopsis.")
    } finally {
      setWatchThisLoading(false)
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalListedEntries = sections.reduce((sum, section) => sum + section.data.length, 0)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <Stack.Screen
        options={{
          title: "Media",
          headerLargeTitle: true,
          headerRight: () => (
            <MediaHeaderActions
              palette={palette}
              onOpenAssistant={() => router.push("/ai?workspace=media")}
              onOpenAdd={() => router.push("/media/add")}
              onOpenMore={() => setOverflowOpen(true)}
            />
          )
        }}
      />

      {workspaceMode === "diary" ? (
        <ScreenScrollView contentContainerStyle={{ gap: 20, paddingBottom: selectMode ? 176 : 40 }}>
          <NativeSegmentedControl
            value={workspaceMode}
            onChange={setWorkspaceMode}
            options={[
              { value: "diary", label: "Diary" },
              { value: "analytics", label: "Analytics" }
            ]}
          />

          <View
            style={[
              styles.searchCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border
              }
            ]}
          >
            <Ionicons name="search-outline" size={18} color={palette.textMuted} />
            <TextInput
              style={{ flex: 1, color: palette.text, fontSize: 17 }}
              value={search}
              onChangeText={setSearch}
              placeholder="Search title, status, medium, genre"
              placeholderTextColor={palette.textMuted}
            />
          </View>

          {message ? <Text style={{ color: palette.primary, fontSize: 14 }}>{message}</Text> : null}
          {isLoading ? <ActivityIndicator color={palette.primary} /> : null}
          {error instanceof Error ? <Text style={{ color: palette.danger, fontSize: 14 }}>{error.message}</Text> : null}

          <View style={{ gap: 12 }}>
            <MediaFilterStrip
              allLabel="All Media"
              label="Media filter"
              options={mediumOptions}
              selectedValue={mediumFilter}
              palette={palette}
              onSelect={setMediumFilter}
            />
            <MediaFilterStrip
              allLabel="All Genres"
              label="Genre filter"
              options={genreOptions}
              selectedValue={genreFilter}
              palette={palette}
              onSelect={setGenreFilter}
            />
          </View>

          <MediaWatchingShelf
            entries={watchingEntries}
            palette={palette}
            onOpenEntry={openEntryDetails}
            onAddEpisode={(entry) => {
              void markNextEpisodeForEntry(entry)
            }}
          />

          {sections.map((section) => (
            <View key={section.key} style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text selectable style={{ color: palette.text, fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>
                  {section.title}
                </Text>
                <Text selectable style={{ color: palette.textMuted, fontSize: 15, fontWeight: "600" }}>
                  {section.data.length}
                </Text>
              </View>

              <GroupedSection>
                {section.data.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 ? <View style={{ height: 1, marginLeft: 134, backgroundColor: palette.border }} /> : null}
                    <MediaEntryRow
                      entry={item}
                      palette={palette}
                      selected={selectedIds.has(item.id)}
                      selectMode={selectMode}
                      onPress={() => (selectMode ? toggleSelected(item.id) : openEntryDetails(item))}
                    />
                  </View>
                ))}
              </GroupedSection>
            </View>
          ))}

          {!isLoading && totalListedEntries === 0 && watchingEntries.length === 0 ? (
            <GroupedSection>
              <View style={{ paddingHorizontal: 18, paddingVertical: 22, gap: 6 }}>
                <Text selectable style={{ color: palette.text, fontSize: 17, fontWeight: "600" }}>
                  No entries found
                </Text>
                <Text selectable style={{ color: palette.textMuted, fontSize: 14, lineHeight: 20 }}>
                  Add media from the new + screen or widen the search and filters.
                </Text>
              </View>
            </GroupedSection>
          ) : null}
        </ScreenScrollView>
      ) : (
        <ScreenScrollView contentContainerStyle={{ gap: 20 }}>
          <NativeSegmentedControl
            value={workspaceMode}
            onChange={setWorkspaceMode}
            options={[
              { value: "diary", label: "Diary" },
              { value: "analytics", label: "Analytics" }
            ]}
          />
          {message ? <Text style={{ color: palette.primary, fontSize: 14 }}>{message}</Text> : null}
          {error instanceof Error ? <Text style={{ color: palette.danger, fontSize: 14 }}>{error.message}</Text> : null}
          <MediaAnalyticsPanel entries={entries} />
        </ScreenScrollView>
      )}

      <MediaOverflowSheet
        visible={overflowOpen}
        selectMode={selectMode}
        sortDescending={sortDescending}
        sortKey={sortKey}
        onClose={() => setOverflowOpen(false)}
        onPickRandomPlanned={() => {
          setOverflowOpen(false)
          pickRandomPlanned()
        }}
        onBatchFetchMetadata={() => {
          setOverflowOpen(false)
          void batchFetchMetadata()
        }}
        onOpenImport={() => {
          setOverflowOpen(false)
          setImportSheetOpen(true)
        }}
        onToggleSelectMode={() => {
          setOverflowOpen(false)
          setSelectMode((prev) => !prev)
        }}
        onSetSortKey={(key) => {
          setSortKey(key)
          setOverflowOpen(false)
        }}
        onToggleSortDirection={() => {
          setSortDescending((prev) => !prev)
          setOverflowOpen(false)
        }}
      />

      {selectMode && workspaceMode === "diary" ? (
        <MediaSelectionToolbar
          selectedCount={selectedIds.size}
          onDone={() => setSelectMode(false)}
          onBatchEdit={() => setBatchEditOpen(true)}
          onBatchFetch={() => {
            void batchFetchMetadata(Array.from(selectedIds))
          }}
          onBatchFinish={() => {
            void batchSetFinished()
          }}
          onBatchDelete={() => {
            void batchDeleteSelected()
          }}
        />
      ) : null}

      <Modal
        visible={importSheetOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setImportSheetOpen(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Import Media</Text>
            <Pressable onPress={() => setImportSheetOpen(false)}>
              <Text style={[styles.close, { color: palette.primary }]}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
            <GroupedSection title="Source">
              <View style={{ padding: 16, gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable style={[styles.sheetButton, themedBorder(palette)]} onPress={pickImportFile}>
                    <Text style={{ color: palette.text, fontWeight: "700" }}>Pick File</Text>
                  </Pressable>
                  <Pressable style={[styles.sheetButton, themedBorder(palette)]} onPress={clearImportDraft}>
                    <Text style={{ color: palette.text, fontWeight: "700" }}>Clear</Text>
                  </Pressable>
                </View>

                {importFileName ? (
                  <Text selectable style={{ color: palette.textMuted, fontSize: 13 }}>
                    Loaded file: {importFileName}
                  </Text>
                ) : null}

                <TextInput
                  style={[styles.sheetMultilineInput, themedInput(palette)]}
                  value={csvData}
                  onChangeText={(value) => {
                    setCsvData(value)
                    setCleanedImportRows([])
                    setImportSummary(null)
                  }}
                  placeholder="Paste CSV / TSV text here or import a file"
                  placeholderTextColor={palette.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </GroupedSection>

            <GroupedSection title="Actions" footer={importSummary ? `Imported ${importSummary.success} succeeded, ${importSummary.failed} failed.` : undefined}>
              <View style={{ padding: 16, gap: 10 }}>
                <Pressable style={[styles.sheetButton, themedBorder(palette), cleaningImport && styles.disabled]} onPress={cleanImportPreview} disabled={cleaningImport}>
                  <Text style={{ color: palette.text, fontWeight: "700" }}>{cleaningImport ? "Cleaning..." : "Clean Preview"}</Text>
                </Pressable>
                <Pressable
                  style={[styles.sheetButton, themedBorder(palette), (enrichingImport || cleanedImportRows.length === 0) && styles.disabled]}
                  onPress={enrichCleanedImportRows}
                  disabled={enrichingImport || cleanedImportRows.length === 0}
                >
                  <Text style={{ color: palette.text, fontWeight: "700" }}>
                    {enrichingImport ? `Enriching ${enrichProgress.current}/${enrichProgress.total}` : "Batch Enrich"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.sheetButton, { backgroundColor: palette.primary }, (importing || cleanedImportRows.length === 0) && styles.disabled]}
                  onPress={handleImportCsv}
                  disabled={importing || cleanedImportRows.length === 0}
                >
                  <Text style={{ color: palette.primaryText, fontWeight: "700" }}>{importing ? "Importing..." : "Import Entries"}</Text>
                </Pressable>
              </View>
            </GroupedSection>

            {cleanedImportRows.length > 0 ? (
              <GroupedSection title="Preview" footer={`${cleanedImportRows.length} rows ready to import`}>
                {cleanedImportRows.slice(0, 6).map((row, index) => (
                  <View key={`${row.title}-${index}`}>
                    {index > 0 ? <View style={{ height: 1, marginLeft: 16, backgroundColor: palette.border }} /> : null}
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4 }}>
                      <Text selectable style={{ color: palette.text, fontSize: 16, fontWeight: "600" }}>
                        {row.title}
                      </Text>
                      <Text selectable style={{ color: palette.textMuted, fontSize: 13 }}>
                        {[row.medium, row.status, row.platform].filter(Boolean).join(" • ") || "No extra metadata yet"}
                      </Text>
                    </View>
                  </View>
                ))}
              </GroupedSection>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={batchEditOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => !batchEditSaving && setBatchEditOpen(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Batch Edit ({selectedIds.size})</Text>
            <Pressable
              onPress={() => {
                if (batchEditSaving) return
                setBatchEditOpen(false)
                resetBatchEditForm()
              }}
            >
              <Text style={[styles.close, { color: palette.primary }]}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={[styles.metaText, { color: palette.textMuted }]}>
              Fill only the fields you want to update. Empty fields keep existing values.
            </Text>
            <TextInput style={[styles.input, themedInput(palette)]} value={batchEditForm.status} onChangeText={(value) => setBatchEditForm((prev) => ({ ...prev, status: value }))} placeholder="Status" placeholderTextColor={palette.textMuted} />
            <TextInput style={[styles.input, themedInput(palette)]} value={batchEditForm.medium} onChangeText={(value) => setBatchEditForm((prev) => ({ ...prev, medium: value }))} placeholder="Medium" placeholderTextColor={palette.textMuted} />
            <TextInput style={[styles.input, themedInput(palette)]} value={batchEditForm.type} onChangeText={(value) => setBatchEditForm((prev) => ({ ...prev, type: value }))} placeholder="Type" placeholderTextColor={palette.textMuted} />
            <TextInput style={[styles.input, themedInput(palette)]} value={batchEditForm.platform} onChangeText={(value) => setBatchEditForm((prev) => ({ ...prev, platform: value }))} placeholder="Platform" placeholderTextColor={palette.textMuted} />
            <TextInput style={[styles.input, themedInput(palette)]} value={batchEditForm.language} onChangeText={(value) => setBatchEditForm((prev) => ({ ...prev, language: value }))} placeholder="Language (comma-separated)" placeholderTextColor={palette.textMuted} />
            <TextInput style={[styles.input, themedInput(palette)]} value={batchEditForm.genre} onChangeText={(value) => setBatchEditForm((prev) => ({ ...prev, genre: value }))} placeholder="Genre (comma-separated)" placeholderTextColor={palette.textMuted} />
            <View style={styles.inlineRow}>
              <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={batchEditForm.price} onChangeText={(value) => setBatchEditForm((prev) => ({ ...prev, price: value }))} placeholder="Price" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
              <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={batchEditForm.episodes} onChangeText={(value) => setBatchEditForm((prev) => ({ ...prev, episodes: value }))} placeholder="Episodes" placeholderTextColor={palette.textMuted} keyboardType="numeric" />
            </View>

            <View style={styles.inlineRow}>
              <Pressable style={[styles.secondaryButton, themedBorder(palette), batchEditSaving && styles.disabled]} onPress={resetBatchEditForm} disabled={batchEditSaving}>
                <Text style={{ color: palette.text }}>Reset Form</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }, batchEditSaving && styles.disabled]} onPress={applyBatchEdit} disabled={batchEditSaving}>
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>{batchEditSaving ? "Applying..." : "Apply Batch Edit"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(selectedEntry && formState)} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEntryDetails}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Edit Entry</Text>
            <Pressable onPress={closeEntryDetails}>
              <Text style={[styles.close, { color: palette.primary }]}>Close</Text>
            </Pressable>
          </View>

          {formState ? (
            <MediaEditorContent
              draft={formState}
              tab={editorTab}
              message={message}
              saving={saving}
              uploadingPoster={uploadingPoster}
              fetchingMetadata={fetchingMetadata}
              historyLoading={historyLoading}
              isPersisted
              statusHistory={statusHistory}
              showDelete={Boolean(selectedEntry)}
              onTabChange={setEditorTab}
              onDraftChange={(patch) => {
                setPendingMetadata(null)
                setFormState((prev) => (prev ? { ...prev, ...patch } : prev))
              }}
              onSave={() => {
                void saveEntryDetails()
              }}
              onDelete={() => selectedEntry && void handleDelete(selectedEntry.id)}
              onUploadPoster={() => {
                void pickAndUploadPoster()
              }}
              onFetchMetadata={(params) => {
                void fetchMetadataForForm(params)
              }}
              onAddEpisode={addEpisodeToEditor}
              onFinishedToday={finishTodayInEditor}
              onUpdateEpisodeDate={updateEpisodeDateInEditor}
              onDeleteEpisode={deleteEpisodeHistoryInEditor}
            />
          ) : null}
        </SafeAreaView>
      </Modal>

      <MediaMetadataConflictModal
        pendingSelection={pendingMetadata}
        onToggleField={toggleMetadataField}
        onApply={() => pendingMetadata && applyPendingMetadataSelection(pendingMetadata)}
        onSkip={() => setPendingMetadata(null)}
      />

      <Modal visible={Boolean(watchThisEntry)} transparent animationType="fade" onRequestClose={() => setWatchThisEntry(null)}>
        <View style={styles.overlay}>
          <View style={[styles.watchModal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Watch This</Text>
            <Text style={{ color: palette.text, fontWeight: "700", marginTop: 4 }}>{watchThisEntry?.title}</Text>
            <Text style={[styles.metaText, { color: palette.textMuted }]}>{watchThisEntry?.medium ?? watchThisEntry?.type ?? "-"}</Text>

            {watchThisLoading ? (
              <ActivityIndicator color={palette.primary} />
            ) : (
              <ScrollView style={{ maxHeight: 160 }}>
                <Text style={{ color: palette.textMuted }}>{watchThisSynopsis || "No synopsis available."}</Text>
              </ScrollView>
            )}

            <View style={styles.inlineRow}>
              <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => setWatchThisEntry(null)}>
                <Text style={{ color: palette.text }}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: palette.primary }]}
                onPress={() => {
                  if (watchThisEntry) openEntryDetails(watchThisEntry)
                  setWatchThisEntry(null)
                }}
              >
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Open in Diary</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function themedInput(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    color: palette.text
  }
}

function themedBorder(palette: ReturnType<typeof useAppTheme>["palette"]) {
  return {
    borderColor: palette.border,
    backgroundColor: palette.surface
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  workspaceShell: { gap: 10, marginBottom: 4 },
  workspaceAction: {
    borderWidth: 1,
    borderRadius: 10,
    minWidth: 36,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  analyticsContent: { padding: 16, gap: 12, paddingBottom: 36 },
  header: { padding: 16, gap: 10 },
  searchCard: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 20,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  title: { fontSize: 24, fontWeight: "700" },
  blockTitle: { fontSize: 16, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  csvInput: { minHeight: 80 },
  importCard: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  importPreviewCard: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 8 },
  previewHeader: { borderBottomWidth: 1, paddingBottom: 6 },
  previewRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, gap: 8 },
  previewCellTitle: { width: 180, fontSize: 12, fontWeight: "700" },
  previewCell: { width: 110, fontSize: 12 },
  addRow: { flexDirection: "row", gap: 8 },
  inlineRow: { flexDirection: "row", gap: 8 },
  watchedFilterRow: { flexDirection: "row", gap: 8 },
  searchInput: { flex: 1 },
  iconSquareButton: {
    borderWidth: 1,
    borderRadius: 10,
    width: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  filterChipRow: { gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  batchBlock: { gap: 8 },
  toolsPanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10
  },
  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  sheetButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  sheetMultilineInput: {
    minHeight: 160,
    borderWidth: 1,
    borderRadius: 18,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  dangerButton: {
    flex: 1,
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  dangerButtonText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.6 },
  message: { fontSize: 12 },
  error: {},
  empty: {},
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
  sectionCount: { fontSize: 12, fontWeight: "700" },
  listContent: { paddingBottom: 120 },
  watchedEntryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  dateColumn: { width: 48, alignItems: "center", justifyContent: "center", gap: 1 },
  dateMonth: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  dateDay: { fontSize: 26, fontWeight: "800", lineHeight: 30 },
  rowPosterThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#e2e8f0" },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowMeta: { marginTop: 2, fontSize: 12 },
  rowTags: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  rowTag: { fontSize: 11, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  moreButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  delete: { fontWeight: "700" },
  watchingBlock: { gap: 8 },
  watchingDiaryCard: {
    width: 320,
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    gap: 8
  },
  watchingPosterShell: {
    borderRadius: 14,
    overflow: "hidden",
    minHeight: 176
  },
  watchingPosterImage: {
    width: "100%",
    height: 176,
    backgroundColor: "#0f172a"
  },
  watchingTopTags: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap"
  },
  watchingTag: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    color: "#f8fafc",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: "700"
  },
  watchingPosterFooter: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    gap: 2
  },
  watchingHeroTitle: { color: "#f8fafc", fontSize: 28, lineHeight: 30, fontWeight: "800" },
  watchingHeroMeta: { color: "#e2e8f0", fontSize: 12 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2 },
  progressLabel: { fontSize: 11, fontWeight: "700" },
  progressTrack: { height: 8, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999 },
  watchingCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  watchingDateText: { fontSize: 12, fontWeight: "600" },
  inlineActionButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0"
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  close: { fontWeight: "700" },
  modalBody: { padding: 16, gap: 10 },
  posterBlock: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    flexDirection: "row"
  },
  posterImage: { width: 86, height: 124, borderRadius: 8, backgroundColor: "#e2e8f0" },
  posterFallback: { alignItems: "center", justifyContent: "center" },
  searchResults: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    gap: 6
  },
  searchResultRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
    gap: 2
  },
  halfInput: { flex: 1 },
  infoSection: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8
  },
  infoSectionTitle: { fontSize: 14, fontWeight: "700" },
  infoSectionEmpty: { fontSize: 12 },
  historyRow: { borderWidth: 1, borderRadius: 8, padding: 8, gap: 6 },
  historyRowTitle: { fontSize: 13, fontWeight: "700" },
  historyRowSubtitle: { fontSize: 12 },
  historyControls: { flexDirection: "row", gap: 8, alignItems: "center" },
  historyInput: { flex: 1 },
  timelineRow: { borderWidth: 1, borderRadius: 8, padding: 8 },
  timelineStatus: { fontSize: 12, fontWeight: "700" },
  timelineDate: { marginTop: 2, fontSize: 11 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  overrideModal: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8
  },
  overrideRow: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 2 },
  watchModal: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10
  },
  metaText: { fontSize: 12 }
})
