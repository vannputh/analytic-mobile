"use client"

import { X, Filter, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FilterState, defaultFilterState } from "@/lib/filter-types"
import { MultiSelect, DateRangePicker } from "@/components/filter-components"

interface FilterOptions {
  genres: string[]
  mediums: string[]
  languages: string[]
  platforms: string[]
  statuses: string[]
  types: string[]
}

interface GlobalFilterBarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  options: FilterOptions
  totalCount: number
  filteredCount: number
}

export function GlobalFilterBar({
  filters,
  onFiltersChange,
  options,
  totalCount,
  filteredCount,
}: GlobalFilterBarProps) {
  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.genres.length > 0 ||
    filters.mediums.length > 0 ||
    filters.languages.length > 0 ||
    filters.platforms.length > 0 ||
    filters.statuses.length > 0 ||
    filters.types.length > 0

  const activeFilterCount = [
    filters.dateFrom || filters.dateTo ? 1 : 0,
    filters.genres.length,
    filters.mediums.length,
    filters.languages.length,
    filters.platforms.length,
    filters.statuses.length,
    filters.types.length,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 overflow-x-auto scrollbar-hide">
        <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-xs font-mono uppercase tracking-wider">Filters</span>
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <DateRangePicker
          from={filters.dateFrom}
          to={filters.dateTo}
          onChange={(from, to) => onFiltersChange({ ...filters, dateFrom: from, dateTo: to })}
        />

        <MultiSelect
          label="Medium"
          options={options.mediums}
          selected={filters.mediums}
          onChange={(mediums) => onFiltersChange({ ...filters, mediums })}
        />

        <MultiSelect
          label="Genre"
          options={options.genres}
          selected={filters.genres}
          onChange={(genres) => onFiltersChange({ ...filters, genres })}
        />

        <MultiSelect
          label="Language"
          options={options.languages}
          selected={filters.languages}
          onChange={(languages) => onFiltersChange({ ...filters, languages })}
        />

        <MultiSelect
          label="Platform"
          options={options.platforms}
          selected={filters.platforms}
          onChange={(platforms) => onFiltersChange({ ...filters, platforms })}
        />

        <MultiSelect
          label="Status"
          options={options.statuses}
          selected={filters.statuses}
          onChange={(statuses) => onFiltersChange({ ...filters, statuses })}
        />

        <MultiSelect
          label="Type"
          options={options.types}
          selected={filters.types}
          onChange={(types) => onFiltersChange({ ...filters, types })}
        />

        {hasActiveFilters && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-mono"
              onClick={() => onFiltersChange(defaultFilterState)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-mono text-muted-foreground flex-shrink-0">
          {hasActiveFilters && (
            <Badge variant="outline" className="font-mono text-[10px]">
              {activeFilterCount} active
            </Badge>
          )}
          <span>
            {totalCount} items
          </span>
        </div>
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 pb-2 flex-wrap">
          {(filters.dateFrom || filters.dateTo) && (
            <Badge
              variant="secondary"
              className="h-5 text-[10px] font-mono cursor-pointer hover:bg-destructive/20"
              onClick={() => onFiltersChange({ ...filters, dateFrom: null, dateTo: null })}
            >
              {filters.dateFrom || "∞"} → {filters.dateTo || "∞"}
              <X className="ml-1 h-2.5 w-2.5" />
            </Badge>
          )}
          {filters.mediums.map((m) => (
            <Badge
              key={m}
              variant="secondary"
              className="h-5 text-[10px] font-mono cursor-pointer hover:bg-destructive/20"
              onClick={() =>
                onFiltersChange({ ...filters, mediums: filters.mediums.filter((x) => x !== m) })
              }
            >
              {m}
              <X className="ml-1 h-2.5 w-2.5" />
            </Badge>
          ))}
          {filters.genres.map((g) => (
            <Badge
              key={g}
              variant="secondary"
              className="h-5 text-[10px] font-mono cursor-pointer hover:bg-destructive/20"
              onClick={() =>
                onFiltersChange({ ...filters, genres: filters.genres.filter((x) => x !== g) })
              }
            >
              {g}
              <X className="ml-1 h-2.5 w-2.5" />
            </Badge>
          ))}
          {filters.languages.map((l) => (
            <Badge
              key={l}
              variant="secondary"
              className="h-5 text-[10px] font-mono cursor-pointer hover:bg-destructive/20"
              onClick={() =>
                onFiltersChange({ ...filters, languages: filters.languages.filter((x) => x !== l) })
              }
            >
              {l}
              <X className="ml-1 h-2.5 w-2.5" />
            </Badge>
          ))}
          {filters.platforms.map((p) => (
            <Badge
              key={p}
              variant="secondary"
              className="h-5 text-[10px] font-mono cursor-pointer hover:bg-destructive/20"
              onClick={() =>
                onFiltersChange({ ...filters, platforms: filters.platforms.filter((x) => x !== p) })
              }
            >
              {p}
              <X className="ml-1 h-2.5 w-2.5" />
            </Badge>
          ))}
          {filters.statuses.map((s) => (
            <Badge
              key={s}
              variant="secondary"
              className="h-5 text-[10px] font-mono cursor-pointer hover:bg-destructive/20"
              onClick={() =>
                onFiltersChange({ ...filters, statuses: filters.statuses.filter((x) => x !== s) })
              }
            >
              {s}
              <X className="ml-1 h-2.5 w-2.5" />
            </Badge>
          ))}
          {filters.types.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="h-5 text-[10px] font-mono cursor-pointer hover:bg-destructive/20"
              onClick={() =>
                onFiltersChange({ ...filters, types: filters.types.filter((x) => x !== t) })
              }
            >
              {t}
              <X className="ml-1 h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export default GlobalFilterBar
