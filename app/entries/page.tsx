"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { getEntries, deleteEntry } from "@/lib/actions"
import { MediaEntry } from "@/lib/database.types"
import { FilterState, defaultFilterState, applyFilters, extractFilterOptions, areFiltersEqual } from "@/lib/filter-types"
import { MediaTable } from "@/components/media-table"
import { GlobalFilterBar } from "@/components/analytics/GlobalFilterBar"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Table2, Search, X, Columns } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"

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

const ITEMS_PER_PAGE = 25

export default function EntriesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allEntries, setAllEntries] = useState<MediaEntry[]>([])
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [hasMoreEntries, setHasMoreEntries] = useState(true)
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilterState)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSelectMode, setShowSelectMode] = useState(false)
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
        setVisibleColumns(new Set(saved))
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

  // Check if we're showing filtered/search results
  const isFiltered = useMemo(() => {
    const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(defaultFilterState)
    return hasActiveFilters || searchQuery.trim().length > 0
  }, [filters, searchQuery])

  useEffect(() => {
    let isMounted = true

    async function fetchEntries() {
      try {
        // Always set loading, but use initialLoading to determine which UI to show
        setLoading(true)
        setError(null)
        
        // If filters/search are active, load all entries (needed for client-side filtering)
        // Otherwise, load only first 25 for better performance
        // Always get total count for display
        const result = isFiltered 
          ? await getEntries({ getCount: true }) // Load all when filtering, but still get count
          : await getEntries({
              limit: ITEMS_PER_PAGE,
              offset: 0,
              getCount: true // Get total count for pagination
            })

        if (!isMounted) return

        if (!result.success) {
          throw new Error(result.error || "Failed to load entries")
        }
        
        const loadedEntries = result.data || []
        setAllEntries(loadedEntries)
        
        // Set total count if available
        if (result.count !== null && result.count !== undefined) {
          setTotalCount(result.count)
        }
        
        if (isFiltered) {
          // When filtered, show all loaded entries
          setDisplayedCount(loadedEntries.length)
          setHasMoreEntries(false)
        } else {
          // When not filtered, use pagination
          setDisplayedCount(ITEMS_PER_PAGE)
          // Check if there are more entries based on total count or loaded entries
          if (result.count !== null && result.count !== undefined) {
            setHasMoreEntries(ITEMS_PER_PAGE < result.count)
          } else {
            // Fallback: if we got less than requested, we've reached the end
            setHasMoreEntries(loadedEntries.length >= ITEMS_PER_PAGE)
          }
        }
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
  }, [isFiltered])

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true)
      
      // Load next batch of entries
      const result = await getEntries({
        limit: ITEMS_PER_PAGE,
        offset: displayedCount
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to load more entries")
      }

      if (result.data && result.data.length > 0) {
        setAllEntries(prev => [...prev, ...result.data])
        setDisplayedCount(prev => prev + result.data.length)
        // If we got less than requested, we've reached the end
        if (result.data.length < ITEMS_PER_PAGE) {
          setHasMoreEntries(false)
          toast.info("All entries loaded")
        }
      } else {
        // No more entries to load
        setHasMoreEntries(false)
        toast.info("All entries loaded")
      }
    } catch (err) {
      console.error("Failed to load more entries:", err)
      toast.error(err instanceof Error ? err.message : "Failed to load more entries")
    } finally {
      setLoadingMore(false)
    }
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

      // Search in language (array or string for backward compatibility)
      if (entry.language) {
        if (Array.isArray(entry.language)) {
          if (entry.language.some(l => l.toLowerCase().includes(query))) return true
        } else {
          if (entry.language.toLowerCase().includes(query)) return true
        }
      }

      // Search in status
      if (entry.status?.toLowerCase().includes(query)) return true

      // Search in season
      if (entry.season?.toLowerCase().includes(query)) return true

      return false
    })
  }, [filterFilteredEntries, searchQuery])

  // Get displayed entries (paginated when not filtered)
  const filteredEntries = useMemo(() => {
    // When filtered, show all filtered entries
    // When not filtered, paginate the entries
    if (isFiltered) {
      return allFilteredEntries
    } else {
      return allFilteredEntries.slice(0, displayedCount)
    }
  }, [allFilteredEntries, displayedCount, isFiltered])

  const handleEdit = (entry: MediaEntry) => {
    router.push(`/add?id=${entry.id}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    try {
      const result = await deleteEntry(id)

      if (!result.success) {
        throw new Error(result.error || "Failed to delete entry")
      }

      setAllEntries(prev => prev.filter((entry) => entry.id !== id))
      // Adjust displayed count if needed
      if (displayedCount > allEntries.length - 1) {
        setDisplayedCount(Math.max(ITEMS_PER_PAGE, allEntries.length - 1))
      }
      toast.success("Entry deleted successfully")
    } catch (err) {
      console.error("Failed to delete entry:", err)
      toast.error(err instanceof Error ? err.message : "Failed to delete entry")
    }
  }

  // Show full-screen loader only on initial load
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm font-mono">Loading entries...</p>
        </div>
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
          totalCount={totalCount ?? allEntries.length}
          filteredCount={filteredEntries.length}
        />
      )}

      {/* Main Content */}
      <main className="p-4 sm:p-6 relative">
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
              onRefresh={async () => {
                setLoading(true)
                try {
                  const result = await getEntries({
                    limit: ITEMS_PER_PAGE,
                    offset: 0,
                    getCount: true
                  })
                  if (!result.success) {
                    throw new Error(result.error || "Failed to refresh entries")
                  }
                  const loadedEntries = result.data || []
                  setAllEntries(loadedEntries)
                  setDisplayedCount(ITEMS_PER_PAGE)
                  if (result.count !== null && result.count !== undefined) {
                    setTotalCount(result.count)
                    setHasMoreEntries(ITEMS_PER_PAGE < result.count)
                  }
                } catch (err) {
                  console.error("Failed to refresh entries:", err)
                  toast.error(err instanceof Error ? err.message : "Failed to refresh entries")
                } finally {
                  setLoading(false)
                }
              }}
            />
            {/* Load More Button - only show if not filtering/searching and there might be more */}
            {!isFiltered && 
             hasMoreEntries && 
             filteredEntries.length === displayedCount && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More {totalCount !== null ? `(${allEntries.length} of ${totalCount})` : `(${allEntries.length} loaded)`}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

