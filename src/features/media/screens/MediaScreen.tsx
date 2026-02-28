import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system"
import * as ImagePicker from "expo-image-picker"
import { useMediaEntries } from "@/src/features/media/hooks/useMediaEntries"
import { backendFetch } from "@/src/shared/api/backend"
import { uploadAssetToBackend } from "@/src/shared/api/upload"
import { useAppTheme } from "@/src/shared/theme/ThemeProvider"
import type { MediaEntry, MediaStatusHistory } from "@/src/shared/types/database"
import type { CleanDataResponse, CleanedMediaEntry, MetadataSearchResponse, MetadataResponse } from "@analytics/contracts"

type SortKey = "title" | "rating" | "finish_date"
type MetadataConflictField =
  | "title"
  | "imdbId"
  | "length"
  | "averageRating"
  | "season"
  | "episodes"
  | "genre"
  | "language"
  | "posterUrl"

interface MediaFormState {
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
}

interface SectionShape {
  title: string
  key: string
  data: MediaEntry[]
}

interface MetadataConflict {
  field: MetadataConflictField
  label: string
  current: string
  incoming: string
}

interface PendingMetadataSelection {
  conflictFormPatch: Partial<MediaFormState>
  conflictEntryPatch: Partial<MediaEntry>
  conflicts: MetadataConflict[]
  selections: Record<MetadataConflictField, boolean>
}

interface ImportSummary {
  success: number
  failed: number
}

function parseEpisodeHistory(value: unknown): Array<{ episode: number; watched_at: string }> {
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

function toCsvList(value: string[] | null | undefined): string {
  if (!value || value.length === 0) return ""
  return value.join(", ")
}

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

function buildFormFromEntry(entry: MediaEntry): MediaFormState {
  return {
    title: entry.title,
    status: entry.status ?? "",
    medium: entry.medium ?? "",
    type: entry.type ?? "",
    platform: entry.platform ?? "",
    season: entry.season ?? "",
    episodes: entry.episodes != null ? String(entry.episodes) : "",
    episodesWatched: entry.episodes_watched != null ? String(entry.episodes_watched) : "",
    myRating: entry.my_rating != null ? String(entry.my_rating) : "",
    averageRating: entry.average_rating != null ? String(entry.average_rating) : "",
    price: entry.price != null ? String(entry.price) : "",
    length: entry.length ?? "",
    imdbId: entry.imdb_id ?? "",
    genre: toCsvList(entry.genre),
    language: toCsvList(entry.language),
    startDate: entry.start_date ?? "",
    finishDate: entry.finish_date ?? "",
    posterUrl: entry.poster_url ?? ""
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

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-US")
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

export function MediaScreen() {
  const { palette } = useAppTheme()
  const { data, isLoading, error, createEntry, updateEntry, deleteEntry, getStatusHistory, refetch } = useMediaEntries()

  const [title, setTitle] = useState("")
  const [search, setSearch] = useState("")
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
  const [formState, setFormState] = useState<MediaFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [statusHistory, setStatusHistory] = useState<MediaStatusHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [episodeDateDrafts, setEpisodeDateDrafts] = useState<Record<number, string>>({})

  const [metadataSearchLoading, setMetadataSearchLoading] = useState(false)
  const [metadataSearchResults, setMetadataSearchResults] = useState<MetadataSearchResponse["results"]>([])
  const [pendingMetadata, setPendingMetadata] = useState<PendingMetadataSelection | null>(null)

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

  useEffect(() => {
    if (!selectedEntry || !formState?.title.trim()) {
      setMetadataSearchResults([])
      return
    }
    const query = formState.title.trim()
    if (query.length < 2) {
      setMetadataSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setMetadataSearchLoading(true)
      try {
        const response = await backendFetch<MetadataSearchResponse>(`/api/metadata/search?q=${encodeURIComponent(query)}`)
        setMetadataSearchResults(response.results ?? [])
      } catch {
        setMetadataSearchResults([])
      } finally {
        setMetadataSearchLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [selectedEntry?.id, formState?.title])

  const sections = useMemo<SectionShape[]>(() => {
    const filtered = entries.filter((entry) => matchesSearch(entry, search.trim().toLowerCase()))
    const sorted = sortEntries(filtered, sortKey, sortDescending)
    const watching = sorted.filter((entry) => statusBucket(entry.status) === "watching")
    const watched = sorted.filter((entry) => statusBucket(entry.status) === "watched")
    const planned = sorted.filter((entry) => statusBucket(entry.status) === "planned")
    const paused = sorted.filter((entry) => statusBucket(entry.status) === "paused")

    return [
      { title: "Currently Watching", key: "watching", data: watching },
      { title: "Watched", key: "watched", data: watched },
      { title: "Planned", key: "planned", data: planned },
      { title: "On Hold / Dropped", key: "paused", data: paused }
    ].filter((section) => section.data.length > 0)
  }, [entries, search, sortKey, sortDescending])

  const watchingEntries = useMemo(
    () => sortEntries(entries.filter((entry) => statusBucket(entry.status) === "watching"), sortKey, sortDescending),
    [entries, sortKey, sortDescending]
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
    setFormState(buildFormFromEntry(entry))
    setEpisodeDateDrafts({})
    setPendingMetadata(null)
    loadStatusHistory(entry.id)
    setMessage(null)
  }

  function closeEntryDetails() {
    setSelectedEntry(null)
    setFormState(null)
    setFetchingMetadata(false)
    setSaving(false)
    setStatusHistory([])
    setHistoryLoading(false)
    setEpisodeDateDrafts({})
    setMetadataSearchResults([])
    setPendingMetadata(null)
  }

  async function handleAdd() {
    const next = title.trim()
    if (!next) return
    try {
      await createEntry({
        title: next,
        status: "Watching",
        medium: "Movie",
        start_date: new Date().toISOString().slice(0, 10)
      })
      setTitle("")
      setMessage("Entry added")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to add entry")
    }
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

  async function applyMetadataSelection(selection: PendingMetadataSelection) {
    if (!selectedEntry || !formState) return
    const formPatch: Partial<MediaFormState> = {}
    const entryPatch: Partial<MediaEntry> = {}

    for (const conflict of selection.conflicts) {
      if (!selection.selections[conflict.field]) continue
      if (Object.prototype.hasOwnProperty.call(selection.conflictFormPatch, conflict.field)) {
        ;(formPatch as Record<string, unknown>)[conflict.field] =
          (selection.conflictFormPatch as Record<string, unknown>)[conflict.field]
      }
      const entryKey = mapFieldToEntryKey(conflict.field)
      if (Object.prototype.hasOwnProperty.call(selection.conflictEntryPatch, entryKey)) {
        ;(entryPatch as Record<string, unknown>)[entryKey] =
          (selection.conflictEntryPatch as Record<string, unknown>)[entryKey]
      }
    }

    setFormState((prev) => (prev ? { ...prev, ...formPatch } : prev))
    if (Object.keys(entryPatch).length > 0) {
      await updateEntry({ id: selectedEntry.id, payload: entryPatch })
      await refetch()
    }

    setPendingMetadata(null)
    setMessage("Metadata applied")
  }

  function mapFieldToEntryKey(field: MetadataConflictField): keyof MediaEntry {
    if (field === "imdbId") return "imdb_id"
    if (field === "averageRating") return "average_rating"
    if (field === "posterUrl") return "poster_url"
    if (field === "episodes") return "episodes"
    if (field === "genre") return "genre"
    if (field === "language") return "language"
    if (field === "title") return "title"
    if (field === "length") return "length"
    return "season"
  }

  async function fetchMetadataForForm(paramsOverride?: { title?: string; imdb_id?: string }) {
    if (!selectedEntry || !formState) return

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
      const immediateFormPatch: Partial<MediaFormState> = {}
      const immediateEntryPatch: Partial<MediaEntry> = {}
      const conflictFormPatch: Partial<MediaFormState> = {}
      const conflictEntryPatch: Partial<MediaEntry> = {}
      const conflicts: MetadataConflict[] = []

      function processField<T extends MetadataConflictField>(
        field: T,
        label: string,
        incomingRaw: unknown,
        currentFormValue: string,
        currentEntryValue: unknown,
        transform: (value: unknown) => { form: string; entry: unknown } | null
      ) {
        const transformed = transform(incomingRaw)
        if (!transformed) return
        const incomingString = transformed.form
        if (!incomingString) return

        const currentString = typeof currentFormValue === "string" ? currentFormValue : String(currentEntryValue ?? "")
        const hasCurrentValue = currentString.trim().length > 0
        const isConflict = hasCurrentValue && currentString.trim() !== incomingString.trim()

        if (isConflict) {
          ;(conflictFormPatch as Record<string, unknown>)[field] = transformed.form
          ;(conflictEntryPatch as Record<string, unknown>)[mapFieldToEntryKey(field)] = transformed.entry as never
          conflicts.push({ field, label, current: currentString, incoming: incomingString })
        } else {
          ;(immediateFormPatch as Record<string, unknown>)[field] = transformed.form
          ;(immediateEntryPatch as Record<string, unknown>)[mapFieldToEntryKey(field)] = transformed.entry as never
        }
      }

      processField("title", "Title", metadata.title, formState.title, selectedEntry.title, (value) =>
        typeof value === "string" ? { form: value, entry: value } : null
      )
      processField("imdbId", "IMDb ID", metadata.imdb_id, formState.imdbId, selectedEntry.imdb_id, (value) =>
        typeof value === "string" ? { form: value, entry: value } : null
      )
      processField("length", "Length", metadata.length, formState.length, selectedEntry.length, (value) =>
        typeof value === "string" ? { form: value, entry: value } : null
      )
      processField("averageRating", "Average Rating", metadata.average_rating, formState.averageRating, selectedEntry.average_rating, (value) =>
        typeof value === "number" ? { form: String(value), entry: value } : null
      )
      processField("season", "Season", metadata.season, formState.season, selectedEntry.season, (value) =>
        typeof value === "string" ? { form: value, entry: value } : null
      )
      processField("episodes", "Episodes", metadata.episodes, formState.episodes, selectedEntry.episodes, (value) =>
        typeof value === "number" ? { form: String(value), entry: value } : null
      )
      processField("genre", "Genre", metadata.genre, formState.genre, selectedEntry.genre, (value) => {
        if (Array.isArray(value)) {
          const list = value.filter((item): item is string => typeof item === "string")
          return { form: list.join(", "), entry: list }
        }
        if (typeof value === "string") return { form: value, entry: parseCsvList(value) }
        return null
      })
      processField("language", "Language", metadata.language, formState.language, selectedEntry.language, (value) => {
        if (Array.isArray(value)) {
          const list = value.filter((item): item is string => typeof item === "string")
          return { form: list.join(", "), entry: list }
        }
        if (typeof value === "string") return { form: value, entry: parseCsvList(value) }
        return null
      })
      processField("posterUrl", "Poster", metadata.poster_url, formState.posterUrl, selectedEntry.poster_url, (value) =>
        typeof value === "string" ? { form: value, entry: value } : null
      )

      setFormState((prev) => (prev ? { ...prev, ...immediateFormPatch } : prev))
      if (Object.keys(immediateEntryPatch).length > 0) {
        await updateEntry({ id: selectedEntry.id, payload: immediateEntryPatch })
      }

      if (conflicts.length > 0) {
        const selections = conflicts.reduce(
          (acc, conflict) => ({ ...acc, [conflict.field]: false }),
          {} as Record<MetadataConflictField, boolean>
        )
        setPendingMetadata({
          conflictFormPatch,
          conflictEntryPatch,
          conflicts,
          selections
        })
        setMessage("Metadata fetched. Review conflicting fields.")
      } else {
        setMessage("Metadata fetched")
      }

      await refetch()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to fetch metadata")
    } finally {
      setFetchingMetadata(false)
    }
  }

  async function pickAndUploadPoster() {
    if (!selectedEntry || !formState) return
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
      await updateEntry({
        id: selectedEntry.id,
        payload: { poster_url: uploaded.url }
      })
      setFormState((prev) => (prev ? { ...prev, posterUrl: uploaded.url } : prev))
      await refetch()
      setMessage("Poster uploaded")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to upload poster")
    } finally {
      setUploadingPoster(false)
    }
  }

  async function saveEntryDetails() {
    if (!selectedEntry || !formState) return
    const payload: Partial<MediaEntry> = {
      title: formState.title.trim(),
      status: formState.status.trim() || null,
      medium: formState.medium.trim() || null,
      type: formState.type.trim() || null,
      platform: formState.platform.trim() || null,
      season: formState.season.trim() || null,
      episodes: toNumberOrNull(formState.episodes),
      episodes_watched: toNumberOrNull(formState.episodesWatched),
      my_rating: toNumberOrNull(formState.myRating),
      average_rating: toNumberOrNull(formState.averageRating),
      price: toNumberOrNull(formState.price),
      length: formState.length.trim() || null,
      imdb_id: formState.imdbId.trim() || null,
      genre: parseCsvList(formState.genre),
      language: parseCsvList(formState.language),
      start_date: formState.startDate.trim() || null,
      finish_date: formState.finishDate.trim() || null,
      poster_url: formState.posterUrl.trim() || null
    }
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
        episode_history: updatedHistory,
        last_watched_at: watchedAt,
        status: "Watching"
      }
    })
    await refetch()
  }

  async function markFinishedForEntry(entry: MediaEntry) {
    const finishDate = new Date().toISOString().slice(0, 10)
    const payload: Partial<MediaEntry> = {
      status: "Finished",
      finish_date: finishDate
    }
    if (entry.episodes) payload.episodes_watched = entry.episodes
    await updateEntry({ id: entry.id, payload })
    await refetch()
  }

  async function markNextEpisode() {
    if (!selectedEntry || !formState) return
    try {
      await markNextEpisodeForEntry(selectedEntry)
      setMessage("Episode marked watched")
      const refreshed = entries.find((entry) => entry.id === selectedEntry.id)
      if (refreshed) openEntryDetails(refreshed)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to update episode progress")
    }
  }

  async function markFinished() {
    if (!selectedEntry || !formState) return
    try {
      await markFinishedForEntry(selectedEntry)
      setMessage("Entry marked as finished")
      const refreshed = entries.find((entry) => entry.id === selectedEntry.id)
      if (refreshed) openEntryDetails(refreshed)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to mark as finished")
    }
  }

  async function handleFinishedToday() {
    if (!selectedEntry || !formState) return
    const totalEpisodes = toNumberOrNull(formState.episodes)
    if (!totalEpisodes) {
      setMessage("Set total episodes first")
      return
    }
    const existingHistory = parseEpisodeHistory(selectedEntry.episode_history)
    const maxEpisode = existingHistory.length > 0 ? Math.max(...existingHistory.map((item) => item.episode)) : 0
    if (maxEpisode >= totalEpisodes) {
      setMessage("All episodes already logged")
      return
    }

    const watchedAt = new Date().toISOString()
    const additions: Array<{ episode: number; watched_at: string }> = []
    for (let episode = maxEpisode + 1; episode <= totalEpisodes; episode += 1) {
      additions.push({ episode, watched_at: watchedAt })
    }
    const nextHistory = [...existingHistory, ...additions]

    try {
      await updateEntry({
        id: selectedEntry.id,
        payload: {
          episode_history: nextHistory,
          episodes_watched: totalEpisodes,
          last_watched_at: watchedAt,
          status: "Finished",
          finish_date: new Date().toISOString().slice(0, 10)
        }
      })
      await refetch()
      const refreshed = entries.find((entry) => entry.id === selectedEntry.id)
      if (refreshed) openEntryDetails(refreshed)
      setMessage(`Logged remaining ${additions.length} episodes`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to complete episodes")
    }
  }

  async function editEpisodeHistory(index: number) {
    if (!selectedEntry) return
    const draftValue = episodeDateDrafts[index]
    if (!draftValue?.trim()) {
      setMessage("Enter a valid date/time value")
      return
    }
    const draftDate = new Date(draftValue)
    if (Number.isNaN(draftDate.getTime())) {
      setMessage("Invalid episode date")
      return
    }

    const existingHistory = parseEpisodeHistory(selectedEntry.episode_history)
    if (!existingHistory[index]) return
    const nextHistory = [...existingHistory]
    nextHistory[index] = { ...nextHistory[index], watched_at: draftDate.toISOString() }

    try {
      await updateEntry({ id: selectedEntry.id, payload: { episode_history: nextHistory } })
      setSelectedEntry((prev) => (prev ? { ...prev, episode_history: nextHistory } : prev))
      setMessage("Episode history updated")
      await refetch()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to update episode history")
    }
  }

  async function deleteEpisodeHistory(index: number) {
    if (!selectedEntry) return
    const existingHistory = parseEpisodeHistory(selectedEntry.episode_history)
    if (!existingHistory[index]) return
    const nextHistory = existingHistory.filter((_, currentIndex) => currentIndex !== index)
    const nextEpisodesWatched = nextHistory.length > 0 ? Math.max(...nextHistory.map((item) => item.episode)) : 0

    try {
      await updateEntry({
        id: selectedEntry.id,
        payload: { episode_history: nextHistory, episodes_watched: nextEpisodesWatched }
      })
      setSelectedEntry((prev) => (prev ? { ...prev, episode_history: nextHistory, episodes_watched: nextEpisodesWatched } : prev))
      setFormState((prev) => (prev ? { ...prev, episodesWatched: String(nextEpisodesWatched) } : prev))
      setMessage("Episode entry removed")
      await refetch()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to remove episode entry")
    }
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

  const episodeHistory = selectedEntry ? parseEpisodeHistory(selectedEntry.episode_history) : []

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text }]}>Media Diary</Text>
            <TextInput
              style={[styles.input, themedInput(palette)]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search title, medium, status"
              placeholderTextColor={palette.textMuted}
            />

            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, themedInput(palette), { flex: 1 }]}
                value={title}
                onChangeText={setTitle}
                placeholder="New media title"
                placeholderTextColor={palette.textMuted}
              />
              <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={handleAdd}>
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Add</Text>
              </Pressable>
            </View>

            <View style={styles.inlineRow}>
              <Pressable style={[styles.secondaryButton, themedBorder(palette), batchFetching && styles.disabled]} disabled={batchFetching} onPress={() => batchFetchMetadata()}>
                <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>{batchFetching ? "Fetching..." : "Batch Metadata"}</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={pickRandomPlanned}>
                <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>Watch This</Text>
              </Pressable>
            </View>

            <View style={styles.inlineRow}>
              <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => setSelectMode((prev) => !prev)}>
                <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>{selectMode ? "Done" : "Select Mode"}</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, themedBorder(palette)]}
                onPress={() => setSortKey((prev) => (prev === "title" ? "rating" : prev === "rating" ? "finish_date" : "title"))}
              >
                <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>Sort: {sortKey}</Text>
              </Pressable>
              <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => setSortDescending((prev) => !prev)}>
                <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>{sortDescending ? "Desc" : "Asc"}</Text>
              </Pressable>
            </View>

            {selectMode && (
              <View style={styles.batchBlock}>
                <View style={styles.inlineRow}>
                  <Pressable style={[styles.secondaryButton, themedBorder(palette), selectedIds.size === 0 && styles.disabled]} onPress={batchSetFinished} disabled={selectedIds.size === 0}>
                    <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>Batch Finished</Text>
                  </Pressable>
                  <Pressable style={[styles.secondaryButton, themedBorder(palette), selectedIds.size === 0 && styles.disabled]} onPress={() => batchFetchMetadata(Array.from(selectedIds))} disabled={selectedIds.size === 0}>
                    <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>Batch Fetch</Text>
                  </Pressable>
                  <Pressable style={[styles.dangerButton, selectedIds.size === 0 && styles.disabled]} onPress={batchDeleteSelected} disabled={selectedIds.size === 0}>
                    <Text style={styles.dangerButtonText}>Batch Delete</Text>
                  </Pressable>
                </View>
                <Pressable style={[styles.secondaryButton, themedBorder(palette), selectedIds.size === 0 && styles.disabled]} onPress={() => setBatchEditOpen(true)} disabled={selectedIds.size === 0}>
                  <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>Batch Edit Fields</Text>
                </Pressable>
              </View>
            )}

            {watchingEntries.length > 0 && (
              <View style={styles.watchingBlock}>
                <Text style={[styles.blockTitle, { color: palette.text }]}>Watching Now</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {watchingEntries.map((entry) => (
                    <View key={entry.id} style={[styles.watchingCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                      <Text style={[styles.watchingTitle, { color: palette.text }]} numberOfLines={2}>{entry.title}</Text>
                      <Text style={[styles.watchingMeta, { color: palette.textMuted }]}>
                        {entry.episodes_watched ?? 0}/{entry.episodes ?? "-"} episodes
                      </Text>
                      <View style={styles.inlineRow}>
                        <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => markNextEpisodeForEntry(entry)}>
                          <Text style={{ color: palette.text, fontSize: 11 }}>+1 Episode</Text>
                        </Pressable>
                        <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => markFinishedForEntry(entry)}>
                          <Text style={{ color: palette.text, fontSize: 11 }}>Finish</Text>
                        </Pressable>
                      </View>
                      <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }]} onPress={() => openEntryDetails(entry)}>
                        <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Open</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={[styles.importCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.blockTitle, { color: palette.text }]}>Import (CSV/TSV/TXT)</Text>

              <View style={styles.inlineRow}>
                <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={pickImportFile}>
                  <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>Pick File</Text>
                </Pressable>
                <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={clearImportDraft}>
                  <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>Clear</Text>
                </Pressable>
              </View>

              {importFileName ? <Text style={[styles.metaText, { color: palette.textMuted }]}>Loaded file: {importFileName}</Text> : null}

              <TextInput
                style={[styles.input, themedInput(palette), styles.csvInput]}
                value={csvData}
                onChangeText={(value) => {
                  setCsvData(value)
                  setCleanedImportRows([])
                  setImportSummary(null)
                }}
                placeholder="Paste CSV/TSV text here or pick a file"
                placeholderTextColor={palette.textMuted}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.inlineRow}>
                <Pressable
                  style={[styles.secondaryButton, themedBorder(palette), cleaningImport && styles.disabled]}
                  onPress={cleanImportPreview}
                  disabled={cleaningImport}
                >
                  <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>
                    {cleaningImport ? "Cleaning..." : "Clean Preview"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.secondaryButton, themedBorder(palette), (enrichingImport || cleanedImportRows.length === 0) && styles.disabled]}
                  onPress={enrichCleanedImportRows}
                  disabled={enrichingImport || cleanedImportRows.length === 0}
                >
                  <Text style={{ color: palette.text, fontWeight: "700", fontSize: 12 }}>
                    {enrichingImport
                      ? `Enriching ${enrichProgress.current}/${enrichProgress.total}`
                      : "Batch Enrich"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: palette.primary }, (importing || cleanedImportRows.length === 0) && styles.disabled]}
                  onPress={handleImportCsv}
                  disabled={importing || cleanedImportRows.length === 0}
                >
                  <Text style={[styles.primaryButtonText, { color: palette.primaryText, fontSize: 12 }]}>
                    {importing ? "Importing..." : "Import"}
                  </Text>
                </Pressable>
              </View>

              {cleanedImportRows.length > 0 ? (
                <View style={[styles.importPreviewCard, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
                  <Text style={[styles.infoSectionTitle, { color: palette.text }]}>
                    Preview ({Math.min(cleanedImportRows.length, 10)} of {cleanedImportRows.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={[styles.previewRow, styles.previewHeader, { borderColor: palette.border }]}>
                        <Text style={[styles.previewCellTitle, { color: palette.text }]}>Title</Text>
                        <Text style={[styles.previewCell, { color: palette.text }]}>Medium</Text>
                        <Text style={[styles.previewCell, { color: palette.text }]}>Status</Text>
                        <Text style={[styles.previewCell, { color: palette.text }]}>Rating</Text>
                        <Text style={[styles.previewCell, { color: palette.text }]}>Genre</Text>
                        <Text style={[styles.previewCell, { color: palette.text }]}>Platform</Text>
                      </View>
                      {cleanedImportRows.slice(0, 10).map((row, index) => (
                        <View key={`${row.title}-${index}`} style={[styles.previewRow, { borderColor: palette.border }]}>
                          <Text style={[styles.previewCellTitle, { color: palette.text }]} numberOfLines={1}>
                            {row.title}
                          </Text>
                          <Text style={[styles.previewCell, { color: palette.textMuted }]} numberOfLines={1}>{row.medium ?? "-"}</Text>
                          <Text style={[styles.previewCell, { color: palette.textMuted }]} numberOfLines={1}>{row.status ?? "-"}</Text>
                          <Text style={[styles.previewCell, { color: palette.textMuted }]} numberOfLines={1}>
                            {row.my_rating != null ? row.my_rating : "-"}
                          </Text>
                          <Text style={[styles.previewCell, { color: palette.textMuted }]} numberOfLines={1}>
                            {Array.isArray(row.genre) ? row.genre.join(", ") : row.genre ?? "-"}
                          </Text>
                          <Text style={[styles.previewCell, { color: palette.textMuted }]} numberOfLines={1}>{row.platform ?? "-"}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                  {importSummary ? (
                    <Text style={[styles.metaText, { color: palette.textMuted }]}>
                      Results: {importSummary.success} success • {importSummary.failed} failed
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {message ? <Text style={[styles.message, { color: palette.primary }]}>{message}</Text> : null}
            {isLoading ? <ActivityIndicator color={palette.primary} /> : null}
            {error instanceof Error ? <Text style={[styles.error, { color: palette.danger }]}>{error.message}</Text> : null}
            {!isLoading && sections.length === 0 ? <Text style={[styles.empty, { color: palette.textMuted }]}>No entries found.</Text> : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: palette.surfaceMuted }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text>
            <Text style={[styles.sectionCount, { color: palette.textMuted }]}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.row,
              {
                backgroundColor: palette.surface,
                borderColor: selectMode && selectedIds.has(item.id) ? palette.primary : palette.border
              }
            ]}
            onPress={() => (selectMode ? toggleSelected(item.id) : openEntryDetails(item))}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: palette.text }]}>{item.title}</Text>
              <Text style={[styles.rowMeta, { color: palette.textMuted }]}>{rowSubtitle(item)}</Text>
              <Text style={[styles.rowMeta, { color: palette.textMuted }]}>Start: {formatDate(item.start_date)} • Finish: {formatDate(item.finish_date)}</Text>
              {selectMode ? (
                <Text style={{ color: selectedIds.has(item.id) ? palette.primary : palette.textMuted, fontSize: 11, marginTop: 2 }}>
                  {selectedIds.has(item.id) ? "Selected" : "Tap to select"}
                </Text>
              ) : null}
            </View>
            {!selectMode ? (
              <Pressable onPress={() => handleDelete(item.id)}>
                <Text style={[styles.delete, { color: palette.danger }]}>Delete</Text>
              </Pressable>
            ) : null}
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Modal visible={batchEditOpen} animationType="slide" onRequestClose={() => !batchEditSaving && setBatchEditOpen(false)}>
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

      <Modal visible={Boolean(selectedEntry && formState)} animationType="slide" onRequestClose={closeEntryDetails}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Edit Entry</Text>
            <Pressable onPress={closeEntryDetails}>
              <Text style={[styles.close, { color: palette.primary }]}>Close</Text>
            </Pressable>
          </View>

          {formState && (
            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={[styles.posterBlock, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                {formState.posterUrl ? (
                  <Image source={{ uri: formState.posterUrl }} style={styles.posterImage} />
                ) : (
                  <View style={[styles.posterImage, styles.posterFallback]}>
                    <Text style={{ color: palette.textMuted }}>No Poster</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 8 }}>
                  <TextInput
                    style={[styles.input, themedInput(palette)]}
                    value={formState.posterUrl}
                    onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, posterUrl: value } : prev))}
                    placeholder="Poster URL"
                    placeholderTextColor={palette.textMuted}
                  />
                  <Pressable
                    style={[styles.secondaryButton, themedBorder(palette), uploadingPoster && styles.disabled]}
                    onPress={pickAndUploadPoster}
                    disabled={uploadingPoster}
                  >
                    <Text style={{ color: palette.text }}>{uploadingPoster ? "Uploading..." : "Upload Poster"}</Text>
                  </Pressable>
                </View>
              </View>

              <TextInput style={[styles.input, themedInput(palette)]} value={formState.title} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, title: value } : prev))} placeholder="Title" placeholderTextColor={palette.textMuted} />
              <TextInput style={[styles.input, themedInput(palette)]} value={formState.status} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, status: value } : prev))} placeholder="Status" placeholderTextColor={palette.textMuted} />
              <TextInput style={[styles.input, themedInput(palette)]} value={formState.medium} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, medium: value } : prev))} placeholder="Medium" placeholderTextColor={palette.textMuted} />
              <TextInput style={[styles.input, themedInput(palette)]} value={formState.type} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, type: value } : prev))} placeholder="Type" placeholderTextColor={palette.textMuted} />
              <TextInput style={[styles.input, themedInput(palette)]} value={formState.platform} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, platform: value } : prev))} placeholder="Platform" placeholderTextColor={palette.textMuted} />
              <TextInput style={[styles.input, themedInput(palette)]} value={formState.imdbId} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, imdbId: value } : prev))} placeholder="IMDb ID" placeholderTextColor={palette.textMuted} />

              {metadataSearchLoading ? <ActivityIndicator color={palette.primary} /> : null}
              {metadataSearchResults.length > 0 ? (
                <View style={[styles.searchResults, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  {metadataSearchResults.slice(0, 5).map((result) => (
                    <Pressable
                      key={result.id}
                      style={styles.searchResultRow}
                      onPress={() => fetchMetadataForForm({ title: result.title, imdb_id: result.imdb_id })}
                    >
                      <Text style={{ color: palette.text, fontWeight: "600" }}>{result.title}</Text>
                      <Text style={{ color: palette.textMuted, fontSize: 12 }}>{result.year ?? "-"} • {result.media_type.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <TextInput style={[styles.input, themedInput(palette)]} value={formState.genre} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, genre: value } : prev))} placeholder="Genre (comma-separated)" placeholderTextColor={palette.textMuted} />
              <TextInput style={[styles.input, themedInput(palette)]} value={formState.language} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, language: value } : prev))} placeholder="Language (comma-separated)" placeholderTextColor={palette.textMuted} />

              <View style={styles.inlineRow}>
                <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.episodes} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, episodes: value } : prev))} placeholder="Episodes" placeholderTextColor={palette.textMuted} keyboardType="numeric" />
                <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.episodesWatched} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, episodesWatched: value } : prev))} placeholder="Episodes Watched" placeholderTextColor={palette.textMuted} keyboardType="numeric" />
              </View>

              <View style={styles.inlineRow}>
                <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.myRating} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, myRating: value } : prev))} placeholder="My Rating" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
                <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.averageRating} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, averageRating: value } : prev))} placeholder="Avg Rating" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
              </View>

              <View style={styles.inlineRow}>
                <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.price} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, price: value } : prev))} placeholder="Price" placeholderTextColor={palette.textMuted} keyboardType="decimal-pad" />
                <TextInput style={[styles.input, themedInput(palette), styles.halfInput]} value={formState.length} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, length: value } : prev))} placeholder="Length" placeholderTextColor={palette.textMuted} />
              </View>

              <TextInput style={[styles.input, themedInput(palette)]} value={formState.season} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, season: value } : prev))} placeholder="Season" placeholderTextColor={palette.textMuted} />
              <TextInput style={[styles.input, themedInput(palette)]} value={formState.startDate} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, startDate: value } : prev))} placeholder="Start Date (YYYY-MM-DD)" placeholderTextColor={palette.textMuted} />
              <TextInput style={[styles.input, themedInput(palette)]} value={formState.finishDate} onChangeText={(value) => setFormState((prev) => (prev ? { ...prev, finishDate: value } : prev))} placeholder="Finish Date (YYYY-MM-DD)" placeholderTextColor={palette.textMuted} />

              <View style={styles.inlineRow}>
                <Pressable style={[styles.secondaryButton, themedBorder(palette), fetchingMetadata && styles.disabled]} disabled={fetchingMetadata} onPress={() => fetchMetadataForForm()}>
                  <Text style={{ color: palette.text }}>{fetchingMetadata ? "Fetching..." : "Fetch Metadata"}</Text>
                </Pressable>
                <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={markNextEpisode}>
                  <Text style={{ color: palette.text }}>Mark Next Episode</Text>
                </Pressable>
              </View>

              <View style={styles.inlineRow}>
                <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={handleFinishedToday}>
                  <Text style={{ color: palette.text }}>Finished Today</Text>
                </Pressable>
                <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={markFinished}>
                  <Text style={{ color: palette.text }}>Mark Finished</Text>
                </Pressable>
                <Pressable style={styles.dangerButton} onPress={() => selectedEntry && handleDelete(selectedEntry.id)}>
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </Pressable>
              </View>

              <View style={[styles.infoSection, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Text style={[styles.infoSectionTitle, { color: palette.text }]}>Episode History</Text>
                {episodeHistory.length === 0 ? (
                  <Text style={[styles.infoSectionEmpty, { color: palette.textMuted }]}>No episode history yet.</Text>
                ) : (
                  episodeHistory
                    .map((record, originalIndex) => ({ record, originalIndex }))
                    .sort((left, right) => right.record.episode - left.record.episode)
                    .map(({ record, originalIndex }) => {
                      const draftValue = episodeDateDrafts[originalIndex]
                      const inputValue = draftValue ?? record.watched_at.replace("Z", "").slice(0, 16)
                      return (
                        <View key={`${record.episode}-${record.watched_at}-${originalIndex}`} style={[styles.historyRow, { borderColor: palette.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.historyRowTitle, { color: palette.text }]}>Episode {record.episode}</Text>
                            <Text style={[styles.historyRowSubtitle, { color: palette.textMuted }]}>{formatDateTime(record.watched_at)}</Text>
                          </View>
                          <View style={styles.historyControls}>
                            <TextInput
                              style={[styles.input, themedInput(palette), styles.historyInput]}
                              value={inputValue}
                              onChangeText={(value) => setEpisodeDateDrafts((prev) => ({ ...prev, [originalIndex]: value }))}
                              placeholder="YYYY-MM-DDTHH:mm"
                              placeholderTextColor={palette.textMuted}
                            />
                            <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => editEpisodeHistory(originalIndex)}>
                              <Text style={{ color: palette.text }}>Save</Text>
                            </Pressable>
                            <Pressable style={styles.dangerButton} onPress={() => deleteEpisodeHistory(originalIndex)}>
                              <Text style={styles.dangerButtonText}>Remove</Text>
                            </Pressable>
                          </View>
                        </View>
                      )
                    })
                )}
              </View>

              <View style={[styles.infoSection, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Text style={[styles.infoSectionTitle, { color: palette.text }]}>Status Timeline</Text>
                {historyLoading ? (
                  <ActivityIndicator color={palette.primary} />
                ) : statusHistory.length === 0 ? (
                  <Text style={[styles.infoSectionEmpty, { color: palette.textMuted }]}>No status history available.</Text>
                ) : (
                  statusHistory.map((historyItem) => (
                    <View key={historyItem.id} style={[styles.timelineRow, { borderColor: palette.border }]}>
                      <Text style={[styles.timelineStatus, { color: palette.text }]}>
                        {historyItem.old_status ?? "None"} {"->"} {historyItem.new_status}
                      </Text>
                      <Text style={[styles.timelineDate, { color: palette.textMuted }]}>{formatDateTime(historyItem.changed_at)}</Text>
                    </View>
                  ))
                )}
              </View>

              <Pressable style={[styles.primaryButton, { backgroundColor: palette.primary }, saving && styles.disabled]} disabled={saving} onPress={saveEntryDetails}>
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>{saving ? "Saving..." : "Save Changes"}</Text>
              </Pressable>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={Boolean(pendingMetadata)} transparent animationType="fade" onRequestClose={() => setPendingMetadata(null)}>
        <View style={styles.overlay}>
          <View style={[styles.overrideModal, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Metadata Override</Text>
            <Text style={[styles.metaText, { color: palette.textMuted }]}>Select conflicting fields to replace</Text>

            <ScrollView contentContainerStyle={{ gap: 8, paddingVertical: 10, maxHeight: 280 }}>
              {pendingMetadata?.conflicts.map((conflict) => (
                <Pressable
                  key={conflict.field}
                  style={[styles.overrideRow, { borderColor: palette.border }]}
                  onPress={() =>
                    setPendingMetadata((prev) =>
                      prev
                        ? {
                            ...prev,
                            selections: { ...prev.selections, [conflict.field]: !prev.selections[conflict.field] }
                          }
                        : prev
                    )
                  }
                >
                  <Text style={{ color: palette.text, fontWeight: "700" }}>{conflict.label}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>Current: {conflict.current}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>Incoming: {conflict.incoming}</Text>
                  <Text style={{ color: pendingMetadata.selections[conflict.field] ? palette.primary : palette.textMuted, fontSize: 12 }}>
                    {pendingMetadata.selections[conflict.field] ? "Will override" : "Keep current"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.inlineRow}>
              <Pressable style={[styles.secondaryButton, themedBorder(palette)]} onPress={() => setPendingMetadata(null)}>
                <Text style={{ color: palette.text }}>Skip</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: palette.primary }]}
                onPress={() => pendingMetadata && applyMetadataSelection(pendingMetadata)}
              >
                <Text style={[styles.primaryButtonText, { color: palette.primaryText }]}>Apply Selected</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  header: { padding: 16, gap: 10 },
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
  batchBlock: { gap: 8 },
  primaryButton: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
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
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowMeta: { marginTop: 2, fontSize: 12 },
  delete: { fontWeight: "700" },
  watchingBlock: { gap: 8 },
  watchingCard: {
    width: 210,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8
  },
  watchingTitle: { fontSize: 14, fontWeight: "700" },
  watchingMeta: { fontSize: 12 },
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
