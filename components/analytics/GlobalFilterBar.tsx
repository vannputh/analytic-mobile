"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, X, Filter, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { FilterState, defaultFilterState } from "@/lib/filter-types"

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

interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
}

function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 border-dashed font-mono text-xs",
            selected.length > 0 && "border-foreground/50"
          )}
        >
          {label}
          {selected.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-1.5 rounded-sm px-1 font-mono text-[10px]"
            >
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">No options</p>
          ) : (
            options.map((option) => (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors text-left font-mono",
                  selected.includes(option) && "bg-accent"
                )}
              >
                <div
                  className={cn(
                    "w-3 h-3 border rounded-sm flex items-center justify-center",
                    selected.includes(option) && "bg-foreground border-foreground"
                  )}
                >
                  {selected.includes(option) && (
                    <span className="text-background text-[8px]">✓</span>
                  )}
                </div>
                <span className="truncate">{option}</span>
              </button>
            ))
          )}
        </div>
        {selected.length > 0 && (
          <>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => onChange([])}
            >
              Clear selection
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
}

function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const fromDate = from ? new Date(from) : undefined
  const toDate = to ? new Date(to) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 border-dashed font-mono text-xs justify-start",
            (from || to) && "border-foreground/50"
          )}
        >
          <CalendarIcon className="mr-1.5 h-3 w-3" />
          {from || to ? (
            <>
              {from ? format(new Date(from), "MMM d, yy") : "Start"}
              {" → "}
              {to ? format(new Date(to), "MMM d, yy") : "Now"}
            </>
          ) : (
            "Date Range"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="p-2 border-r">
            <p className="text-xs text-muted-foreground mb-2 px-2">From</p>
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(date) => {
                onChange(date ? format(date, "yyyy-MM-dd") : null, to)
              }}
              initialFocus
            />
          </div>
          <div className="p-2">
            <p className="text-xs text-muted-foreground mb-2 px-2">To</p>
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(date) => {
                onChange(from, date ? format(date, "yyyy-MM-dd") : null)
              }}
            />
          </div>
        </div>
        <Separator />
        <div className="p-2 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => {
              onChange(null, null)
              setOpen(false)
            }}
          >
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => {
              const now = new Date()
              const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
              onChange(format(yearAgo, "yyyy-MM-dd"), format(now, "yyyy-MM-dd"))
            }}
          >
            Last Year
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => {
              const now = new Date()
              const startOfYear = new Date(now.getFullYear(), 0, 1)
              onChange(format(startOfYear, "yyyy-MM-dd"), format(now, "yyyy-MM-dd"))
            }}
          >
            This Year
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
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

