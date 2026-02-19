"use client"

import { useState, Suspense, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { MediaEntry } from "@/lib/database.types"
import { applyFilters } from "@/lib/filter-types"
import { MediaTable, COLUMN_DEFINITIONS, ColumnKey } from "@/components/media-table"
import { Input } from "@/components/ui/input"
import { GlobalFilterBar } from "@/components/analytics/GlobalFilterBar"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Calendar, ListTodo, Pause, ChevronDown, ChevronRight, Search, X, Columns, CheckSquare, Shuffle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { MediaTableSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaEntries } from "@/hooks/useMediaEntries"
import { useMediaFilters } from "@/hooks/useMediaFilters"
import { WatchingSection } from "@/components/media/WatchingSection"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useColumnPreferences } from "@/hooks/useColumnPreferences"
import { WatchThisDialog } from "@/components/watch-this-dialog"

function EntriesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    allEntries,
    watchingEntries,
    watchedEntries,
    plannedEntries,
    holdAndDroppedEntries,
    loading,
    initialLoading,
    watchingLoading,
    error,
    refreshEntries,
    handleWatchingEntryUpdate,
    updateEntryInList,
    handleDelete
  } = useMediaEntries()

  const {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filterOptions
  } = useMediaFilters(allEntries)

  const filteredWatched = useMemo(() => {
    const withFilters = applyFilters(watchedEntries, filters)
    if (!searchQuery.trim()) return withFilters
    const q = searchQuery.toLowerCase().trim()
    return withFilters.filter((entry) => {
      if (entry.title?.toLowerCase().includes(q)) return true
      if (entry.genre && Array.isArray(entry.genre) && entry.genre.some((g) => String(g).toLowerCase().includes(q))) return true
      if (entry.platform?.toLowerCase().includes(q)) return true
      if (entry.type?.toLowerCase().includes(q)) return true
      if (entry.medium?.toLowerCase().includes(q)) return true
      if (entry.language && Array.isArray(entry.language) && entry.language.some((l) => String(l).toLowerCase().includes(q))) return true
      if (entry.status?.toLowerCase().includes(q)) return true
      if (entry.season?.toLowerCase().includes(q)) return true
      return false
    })
  }, [watchedEntries, filters, searchQuery])

  const { visibleColumns, toggleColumn } = useColumnPreferences()

  const [showSelectMode, setShowSelectMode] = useState(false)
  const [watchedCollapsed, setWatchedCollapsed] = useState(false)
  const [plannedCollapsed, setPlannedCollapsed] = useState(false)
  const [holdDroppedCollapsed, setHoldDroppedCollapsed] = useState(false)
  const [entryToOpenId, setEntryToOpenId] = useState<string | null>(null)
  const [watchThisEntry, setWatchThisEntry] = useState<MediaEntry | null>(null)

  const handlePickRandomPlanned = () => {
    if (plannedEntries.length === 0) return
    setPlannedCollapsed(false)
    const random = plannedEntries[Math.floor(Math.random() * plannedEntries.length)]
    if (random) setWatchThisEntry(random)
  }

  // Refetch and clear URL when landing after add (redirect with ?refreshed=1)
  useEffect(() => {
    if (searchParams.get("refreshed") === "1") {
      refreshEntries()
      router.replace("/media")
    }
  }, [searchParams, router, refreshEntries])

  // Show full-screen loader only on initial load
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background relative page-content">
        <PageHeader title="Diary" onMediaAdded={refreshEntries} />
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
      <PageHeader title="Diary" onMediaAdded={refreshEntries} />

      {/* Main Content */}
      <main className="p-4 sm:p-6 relative">
        <WatchingSection
          entries={watchingEntries}
          loading={watchingLoading}
          onUpdate={handleWatchingEntryUpdate}
          onDelete={handleDelete}
        />

        {allEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 opacity-30 mb-4" />
            <p className="text-sm font-mono mb-3">No entries yet</p>
            <p className="text-sm text-center mb-4">Use the + button in the header to add your first entry</p>
          </div>
        ) : (
          <>
            {/* Watched (Diary) */}
            <section className="mb-8">
              <button
                type="button"
                className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
                onClick={() => setWatchedCollapsed(!watchedCollapsed)}
              >
                {watchedCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Watched</h2>
                {watchedEntries.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({filteredWatched.length !== watchedEntries.length ? `${filteredWatched.length} of ${watchedEntries.length}` : watchedEntries.length})
                  </span>
                )}
              </button>
              {!watchedCollapsed && (
                <>
                  {watchedEntries.length > 0 && (
                    <>
                      <div className="sticky top-12 sm:top-14 z-40">
                        <GlobalFilterBar
                          filters={filters}
                          onFiltersChange={setFilters}
                          options={filterOptions}
                          totalCount={watchedEntries.length}
                          filteredCount={filteredWatched.length}
                        />
                      </div>
                      <div className="mb-6 mt-4 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative flex-1 min-w-[150px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Search..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
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
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
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
                            <span className="hidden sm:inline">{showSelectMode ? "Cancel Selection" : "Select"}</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
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
                                  onCheckedChange={() => toggleColumn(key as ColumnKey)}
                                >
                                  {def.label}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="transition-opacity duration-200" style={{ opacity: loading ? 0.5 : 1 }}>
                    <MediaTable
                      entries={filteredWatched}
                      onDelete={handleDelete}
                      onEntryUpdate={updateEntryInList}
                      onRefresh={refreshEntries}
                      showSelectMode={showSelectMode}
                      onSelectModeChange={setShowSelectMode}
                      diaryDateField="finish_date"
                    />
                  </div>
                </>
              )}
            </section>

            {/* Planned */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  onClick={() => setPlannedCollapsed(!plannedCollapsed)}
                >
                  {plannedCollapsed ? (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                  <ListTodo className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Planned</h2>
                  {plannedEntries.length > 0 && (
                    <span className="text-sm text-muted-foreground">({plannedEntries.length})</span>
                  )}
                </button>
                {plannedEntries.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handlePickRandomPlanned}
                    title="Pick random to watch"
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {!plannedCollapsed && (
                <div className="transition-opacity duration-200" style={{ opacity: loading ? 0.5 : 1 }}>
                  <MediaTable
                    entries={plannedEntries}
                    onDelete={handleDelete}
                    onEntryUpdate={updateEntryInList}
                    onRefresh={refreshEntries}
                    entryToOpenId={entryToOpenId}
                    onOpenDetailsDone={() => setEntryToOpenId(null)}
                  />
                </div>
              )}
            </section>

            <WatchThisDialog
              entry={watchThisEntry}
              open={!!watchThisEntry}
              onOpenChange={(open) => !open && setWatchThisEntry(null)}
              onOpenInDiary={(entry) => {
                setWatchThisEntry(null)
                setEntryToOpenId(entry.id)
              }}
            />

            {/* On Hold & Dropped */}
            <section>
              <button
                type="button"
                className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
                onClick={() => setHoldDroppedCollapsed(!holdDroppedCollapsed)}
              >
                {holdDroppedCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
                <Pause className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">On Hold & Dropped</h2>
                {holdAndDroppedEntries.length > 0 && (
                  <span className="text-sm text-muted-foreground">({holdAndDroppedEntries.length})</span>
                )}
              </button>
              {!holdDroppedCollapsed && (
                <div className="transition-opacity duration-200" style={{ opacity: loading ? 0.5 : 1 }}>
                  <MediaTable
                    entries={holdAndDroppedEntries}
                    onDelete={handleDelete}
                    onEntryUpdate={updateEntryInList}
                    onRefresh={refreshEntries}
                  />
                </div>
              )}
            </section>
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
        <PageHeader title="Diary" />
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
