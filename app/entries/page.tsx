"use client"

import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { getEntries, deleteEntry } from "@/lib/actions"
import { MediaEntry } from "@/lib/database.types"
import { FilterState, defaultFilterState, applyFilters, extractFilterOptions, areFiltersEqual } from "@/lib/filter-types"
import { MediaTable } from "@/components/media-table"
import { GlobalFilterBar } from "@/components/analytics/GlobalFilterBar"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Table2, Search, X, Columns, CheckSquare, PlayCircle, ChevronDown, ChevronRight } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { COLUMN_DEFINITIONS, ColumnKey } from "@/components/media-table"
import { getUserPreference, setUserPreference } from "@/lib/user-preferences"
import { MediaTableSkeleton, WatchingCardSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { WatchingCard } from "@/components/watching-card"
import { createClient } from "@/lib/supabase/client"

// Helper functions to serialize/deserialize FilterState to/from URL params
function filtersToParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) params.set("dateTo", filters.dateTo)
  if (filters.genres.length > 0) params.set("genres", filters.genres.join(","))
  if (filters.mediums.length > 0) params.set("mediums", filters.mediums.join(","))
  if (filters.languages.length > 0) params.set("languages", filters.languages.join(","))
  if (filters.platforms.length > 0) params.set("platforms", filters.platforms.join(","))
  if (filters.statuses.length > 0) params.set("statuses", filters.statuses.join(","))
  if (filters.types.length > 0) params.set("types", filters.types.join(","))

  return params
}

function paramsToFilters(params: URLSearchParams): FilterState {
  return {
    dateFrom: params.get("dateFrom") || null,
    dateTo: params.get("dateTo") || null,
    genres: params.get("genres")?.split(",").filter(Boolean) || [],
    mediums: params.get("mediums")?.split(",").filter(Boolean) || [],
    languages: params.get("languages")?.split(",").filter(Boolean) || [],
    platforms: params.get("platforms")?.split(",").filter(Boolean) || [],
    statuses: params.get("statuses")?.split(",").filter(Boolean) || [],
    types: params.get("types")?.split(",").filter(Boolean) || [],
  }
}

function EntriesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [allEntries, setAllEntries] = useState<MediaEntry[]>([])
  const [watchingEntries, setWatchingEntries] = useState<MediaEntry[]>([])
  const [watchingLoading, setWatchingLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilterState)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSelectMode, setShowSelectMode] = useState(false)
  const [watchingCollapsed, setWatchingCollapsed] = useState(false)
  const [entriesCollapsed, setEntriesCollapsed] = useState(false)
  // Initialize with defaults - will be loaded from Supabase in useEffect
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    const defaultVisible = new Set<ColumnKey>()
    Object.entries(COLUMN_DEFINITIONS).forEach(([key, def]) => {
      if (def.defaultVisible) {
        defaultVisible.add(key as ColumnKey)
      }
    })
    return defaultVisible
  })
  const [columnsLoaded, setColumnsLoaded] = useState(false)
  const isInitialized = useRef(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUpdatingFromState = useRef(false)

  // Load column visibility from Supabase
  useEffect(() => {
    async function loadColumns() {
      const saved = await getUserPreference<string[]>("media-table-visible-columns")
      if (saved && Array.isArray(saved)) {
        // Filter to only include valid ColumnKey values
        const validColumns = saved.filter((key): key is ColumnKey =>
          key in COLUMN_DEFINITIONS
        )
        setVisibleColumns(new Set(validColumns))
      }
      setColumnsLoaded(true)
    }
    loadColumns()
  }, [])

  // Save column visibility to Supabase and notify MediaTable
  useEffect(() => {
    if (!columnsLoaded) return // Don't save until we've loaded initial state

    async function saveColumns() {
      await setUserPreference("media-table-visible-columns", Array.from(visibleColumns))
      // Dispatch custom event to notify MediaTable of changes
      window.dispatchEvent(new CustomEvent("media-table-columns-changed", {
        detail: Array.from(visibleColumns)
      }))
    }
    saveColumns()
  }, [visibleColumns, columnsLoaded])

  // Initialize filters from URL params on mount or param change
  useEffect(() => {
    // Don't sync back if we're the ones updating the URL
    if (isUpdatingFromState.current) {
      isUpdatingFromState.current = false
      return
    }

    const urlFilters = paramsToFilters(searchParams)

    // Only update state if filters have actually changed
    setFilters(prev => {
      if (areFiltersEqual(prev, urlFilters)) return prev
      return urlFilters
    })

    const searchParam = searchParams.get("search") || ""
    // Only update if different to avoid unnecessary re-renders
    setSearchQuery(prev => {
      if (prev !== searchParam) return searchParam
      return prev
    })

    isInitialized.current = true
  }, [searchParams])

  // Update URL params when filters change (immediate) - but NOT for search
  useEffect(() => {
    if (!isInitialized.current) return

    const params = filtersToParams(filters)
    // Don't include searchQuery here - it's handled separately with debouncing
    const currentSearch = searchParams.get("search") || ""
    if (currentSearch) params.set("search", currentSearch)

    // Construct new query string
    const newQueryString = params.toString()
    const currentQueryString = searchParams.toString()

    // Only clean update the URL if something changed
    if (newQueryString !== currentQueryString) {
      isUpdatingFromState.current = true
      const newUrl = newQueryString ? `/entries?${newQueryString}` : "/entries"
      router.replace(newUrl, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, router])

  // Debounce URL updates for search query to prevent page refresh on every keystroke
  useEffect(() => {
    if (!isInitialized.current) return

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout to update URL after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      const params = filtersToParams(filters)
      if (searchQuery) params.set("search", searchQuery)

      const newQueryString = params.toString()
      const currentQueryString = searchParams.toString()

      if (newQueryString !== currentQueryString) {
        isUpdatingFromState.current = true
        const newUrl = newQueryString ? `/entries?${newQueryString}` : "/entries"
        router.replace(newUrl, { scroll: false })
      }
    }, 300) // 300ms debounce

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  useEffect(() => {
    let isMounted = true

    async function fetchEntries() {
      try {
        setLoading(true)
        setError(null)

        const result = await getEntries({ getCount: true })

        if (!isMounted) return

        if (!result.success) {
          throw new Error(result.error || "Failed to load entries")
        }

        setAllEntries(result.data || [])
      } catch (err) {
        if (!isMounted) return

        console.error("Failed to fetch entries:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to load entries"
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        if (isMounted) {
          setLoading(false)
          setInitialLoading(false)
        }
      }
    }

    fetchEntries()

    return () => {
      isMounted = false
    }
  }, [])

  // Fetch watching entries
  useEffect(() => {
    let isMounted = true

    async function fetchWatchingEntries() {
      try {
        setWatchingLoading(true)
        const { data, error } = await supabase
          .from("media_entries")
          .select("*")
          .eq("status", "Watching")
          .order("last_watched_at", { ascending: false })
          .order("updated_at", { ascending: false })

        if (!isMounted) return
        if (error) throw error
        setWatchingEntries(data || [])
      } catch (error) {
        if (!isMounted) return
        console.error("Error fetching watching entries:", error)
      } finally {
        if (isMounted) {
          setWatchingLoading(false)
        }
      }
    }

    fetchWatchingEntries()

    return () => {
      isMounted = false
    }
  }, [])

  const handleWatchingEntryUpdate = (updatedEntry: MediaEntry) => {
    setWatchingEntries(prev => {
      // If the entry is finished or dropped, remove it from the watching list
      if (updatedEntry.status !== "Watching") {
        return prev.filter(e => e.id !== updatedEntry.id)
      }
      // Otherwise update it and re-sort
      return prev.map(e => e.id === updatedEntry.id ? updatedEntry : e)
        .sort((a, b) => {
          const dateA = a.last_watched_at ? new Date(a.last_watched_at).getTime() : 0
          const dateB = b.last_watched_at ? new Date(b.last_watched_at).getTime() : 0
          return dateB - dateA
        })
    })
    // Also update in allEntries if present
    setAllEntries(prev =>
      prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
    )
  }


  // Extract filter options from ALL data (not just displayed)
  const filterOptions = useMemo(() => extractFilterOptions(allEntries), [allEntries])

  // Apply filters to ALL entries (not just displayed ones)
  const filterFilteredEntries = useMemo(() => applyFilters(allEntries, filters), [allEntries, filters])

  // Apply search filter to ALL filtered entries
  const allFilteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return filterFilteredEntries

    const query = searchQuery.toLowerCase().trim()
    return filterFilteredEntries.filter((entry) => {
      // Search in title
      if (entry.title?.toLowerCase().includes(query)) return true

      // Search in genre (array)
      if (entry.genre && Array.isArray(entry.genre)) {
        if (entry.genre.some(g => g.toLowerCase().includes(query))) return true
      }

      // Search in platform
      if (entry.platform?.toLowerCase().includes(query)) return true

      // Search in type
      if (entry.type?.toLowerCase().includes(query)) return true

      // Search in medium
      if (entry.medium?.toLowerCase().includes(query)) return true

      // Search in language
      if (entry.language && Array.isArray(entry.language)) {
        if (entry.language.some(l => l.toLowerCase().includes(query))) return true
      }

      // Search in status
      if (entry.status?.toLowerCase().includes(query)) return true

      // Search in season
      if (entry.season?.toLowerCase().includes(query)) return true

      return false
    })
  }, [filterFilteredEntries, searchQuery])

  // Get displayed entries
  const filteredEntries = allFilteredEntries

  const handleEdit = (entry: MediaEntry) => {
    // Preserve current URL with all filters and search params
    const currentUrl = window.location.pathname + window.location.search
    const returnTo = encodeURIComponent(currentUrl)
    router.push(`/add?id=${entry.id}&returnTo=${returnTo}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    try {
      const result = await deleteEntry(id)

      if (!result.success) {
        throw new Error(result.error || "Failed to delete entry")
      }

      setAllEntries(prev => prev.filter((entry) => entry.id !== id))
      toast.success("Entry deleted successfully")
    } catch (err) {
      console.error("Failed to delete entry:", err)
      toast.error(err instanceof Error ? err.message : "Failed to delete entry")
    }
  }

  // Show full-screen loader only on initial load
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background relative page-content">
        <PageHeader title="All Entries" />
        <main className="p-4 sm:p-6 relative">
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <MediaTableSkeleton />
        </main>
      </div>
    )
  }

  if (error && allEntries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-mono">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative page-content">
      {/* Loading overlay for subsequent loads */}
      {loading && !initialLoading && (
        <div className="fixed inset-0 bg-background/40 backdrop-blur-[2px] z-40 flex items-center justify-center pointer-events-none transition-opacity duration-200">
          <div className="flex flex-col items-center gap-2 text-muted-foreground bg-background/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-xs font-mono">Refreshing...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader title="All Entries" />

      {/* Global Filter Bar */}
      {allEntries.length > 0 && (
        <GlobalFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          options={filterOptions}
          totalCount={allEntries.length}
          filteredCount={filteredEntries.length}
        />
      )}

      {/* Main Content */}
      <main className="p-4 sm:p-6 relative">
        {/* Currently Watching Section */}
        {(watchingLoading || watchingEntries.length > 0) && (
          <div className="mb-6">
            <button
              type="button"
              className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
              onClick={() => setWatchingCollapsed(!watchingCollapsed)}
            >
              {watchingCollapsed ? (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
              <PlayCircle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Currently Watching</h2>
              {watchingEntries.length > 0 && (
                <span className="text-sm text-muted-foreground">({watchingEntries.length})</span>
              )}
            </button>
            {!watchingCollapsed && (
              <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
                <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                  {watchingLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex-shrink-0 w-72">
                        <WatchingCardSkeleton />
                      </div>
                    ))
                  ) : (
                    watchingEntries.map((entry) => (
                      <div key={entry.id} className="flex-shrink-0 w-72">
                        <WatchingCard
                          entry={entry}
                          onUpdate={handleWatchingEntryUpdate}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Entries Header */}
        <button
          type="button"
          className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          onClick={() => setEntriesCollapsed(!entriesCollapsed)}
        >
          {entriesCollapsed ? (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
          <Table2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">All Entries</h2>
          {filteredEntries.length > 0 && (
            <span className="text-sm text-muted-foreground">({filteredEntries.length})</span>
          )}
        </button>

        {!entriesCollapsed && (
          <>
            <div className="mb-6 space-y-4">
              {/* Search Bar and Column Picker */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by title, genre, platform, type, medium, language, status, or season..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      // Prevent form submission on Enter key
                      if (e.key === "Enter") {
                        e.preventDefault()
                        e.stopPropagation()
                      }
                    }}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  variant={showSelectMode ? "secondary" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowSelectMode(!showSelectMode)}
                >
                  <CheckSquare className="h-4 w-4" />
                  {showSelectMode ? "Cancel Selection" : "Select"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Columns className="h-4 w-4" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(COLUMN_DEFINITIONS).map(([key, def]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={visibleColumns.has(key as ColumnKey)}
                        onCheckedChange={() => {
                          setVisibleColumns(prev => {
                            const next = new Set(prev)
                            if (next.has(key as ColumnKey)) {
                              next.delete(key as ColumnKey)
                            } else {
                              next.add(key as ColumnKey)
                            }
                            return next
                          })
                        }}
                      >
                        {def.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {allEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Table2 className="h-12 w-12 opacity-30 mb-4" />
                <p className="text-sm font-mono mb-3">No entries yet</p>
                <Button asChild>
                  <Link href="/import">Import CSV</Link>
                </Button>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Table2 className="h-12 w-12 opacity-30 mb-4" />
                <p className="text-sm font-mono mb-3">No entries match the current filters</p>
                <Button variant="outline" onClick={() => setFilters(defaultFilterState)}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="transition-opacity duration-200" style={{ opacity: loading ? 0.5 : 1 }}>
                <MediaTable
                  entries={filteredEntries}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  showSelectMode={showSelectMode}
                  onSelectModeChange={setShowSelectMode}
                  onEntryUpdate={(updatedEntry) => {
                    // Update the entry in the allEntries array without full reload
                    // This preserves all table state (sort, filters, pagination, scroll position)
                    setAllEntries(prev =>
                      prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
                    )
                    // Note: No refresh is triggered, so filters, sort, and pagination state are preserved
                  }}
                  onRefresh={async () => {
                    setLoading(true)
                    try {
                      const result = await getEntries({ getCount: true })
                      if (!result.success) {
                        throw new Error(result.error || "Failed to refresh entries")
                      }
                      setAllEntries(result.data || [])
                    } catch (err) {
                      console.error("Failed to refresh entries:", err)
                      toast.error(err instanceof Error ? err.message : "Failed to refresh entries")
                    } finally {
                      setLoading(false)
                    }
                  }}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function EntriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background relative page-content">
        <PageHeader title="All Entries" />
        <main className="p-4 sm:p-6 relative">
          <div className="mb-6 space-y-4">
            <Skeleton className="h-10 w-full" />
          </div>
          <MediaTableSkeleton />
        </main>
      </div>
    }>
      <EntriesPageContent />
    </Suspense>
  )
}

