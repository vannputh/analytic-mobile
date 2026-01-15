"use client"

import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MediaEntry } from "@/lib/database.types"
import { defaultFilterState } from "@/lib/filter-types"
import { MediaTable } from "@/components/media-table"
import { GlobalFilterBar } from "@/components/analytics/GlobalFilterBar"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Table2, Search, X, Columns, CheckSquare, ChevronDown, ChevronRight } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { COLUMN_DEFINITIONS, ColumnKey } from "@/components/media-table"
import { MediaTableSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { useColumnPreferences } from "@/hooks/useColumnPreferences"
import { useMediaEntries } from "@/hooks/useMediaEntries"
import { useMovieFilters } from "@/hooks/useMovieFilters"
import { WatchingSection } from "@/components/movies/WatchingSection"

function EntriesPageContent() {
  const router = useRouter()

  const {
    allEntries,
    watchingEntries,
    loading,
    initialLoading,
    watchingLoading,
    error,
    refreshEntries,
    handleWatchingEntryUpdate,
    updateEntryInList,
    handleDelete
  } = useMediaEntries()

  // Use the new hook for filtering logic
  const {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filterOptions,
    filteredEntries
  } = useMovieFilters(allEntries)

  const [showSelectMode, setShowSelectMode] = useState(false)
  const [entriesCollapsed, setEntriesCollapsed] = useState(false)
  const { visibleColumns, setVisibleColumns, toggleColumn } = useColumnPreferences()

  const handleEdit = (entry: MediaEntry) => {
    // Preserve current URL with all filters and search params
    const currentUrl = window.location.pathname + window.location.search
    const returnTo = encodeURIComponent(currentUrl)
    router.push(`/movies/add?id=${entry.id}&returnTo=${returnTo}`)
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
        <WatchingSection
          entries={watchingEntries}
          loading={watchingLoading}
          onUpdate={handleWatchingEntryUpdate}
        />

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
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search..."
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
                  <span className="hidden sm:inline">{showSelectMode ? "Cancel Selection" : "Select"}</span>
                </Button>
                {/* Column picker hidden on mobile since we use card view */}
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
                  onEntryUpdate={updateEntryInList}
                  onRefresh={refreshEntries}
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
